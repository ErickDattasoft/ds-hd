import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';

/** Colecciones que se guardan completas en memoria (las que más se releen en cada página). */
export type ColeccionEnCache = 'tickets' | 'empresas' | 'contactos';

/** Un documento crudo de Firestore: id + datos. */
export interface DocCrudo {
  id: string;
  data: DocumentData;
}

/** Dónde vive el sello de cada colección (un solo documento chiquito). */
const DOC_SELLOS = { col: 'sistema', doc: 'sellos_colecciones' };
/** Tope por si algún día un cambio no dejara su sello: nada se queda en memoria más de esto. */
const VIDA_MAXIMA_MS = 10 * 60_000;

/**
 * Copia en memoria de las colecciones que se releen completas en cada clic (tickets, empresas,
 * contactos), con un **sello de cambios** en Firestore.
 *
 * Antes, abrir la lista de tickets, el tablero, la ficha de una empresa o buscar con Ctrl+K leía
 * TODOS los documentos cada vez (cientos de lecturas por clic): con varias personas trabajando se
 * acababa la cuota gratuita (50 mil lecturas/día). Ahora cada consulta lee solo el sello
 * (1 lectura) y, si nadie cambió nada, usa la copia; quien guarda un cambio pone un sello nuevo,
 * así que las demás instancias del Worker se enteran en su siguiente consulta.
 *
 * El orden importa: primero se escribe el documento y después el sello (ver `marcarCambio`).
 */
export class CacheColecciones {
  private readonly copias = new Map<ColeccionEnCache, { sello: string; hasta: number; docs: DocCrudo[] }>();
  /** Lecturas del sello en curso, para no repetirla si varias consultas la piden a la vez. */
  private readonly sellosEnCurso = new Map<ColeccionEnCache, Promise<string>>();
  /** Cargas completas en curso (mismo motivo). */
  private readonly cargasEnCurso = new Map<string, Promise<DocCrudo[]>>();

  constructor(
    private readonly db: Firestore,
    private readonly ahora: () => number = () => Date.now(),
  ) {}

  private refSellos() {
    return this.db.collection(DOC_SELLOS.col).doc(DOC_SELLOS.doc);
  }

  private leerSello(col: ColeccionEnCache): Promise<string> {
    const enCurso = this.sellosEnCurso.get(col);
    if (enCurso) return enCurso;
    const p = this.refSellos()
      .get()
      .then((s) => String((s.exists ? s.data()?.[col] : undefined) ?? '0'))
      .finally(() => this.sellosEnCurso.delete(col));
    this.sellosEnCurso.set(col, p);
    return p;
  }

  /**
   * Todos los documentos de la colección: de la copia si el sello no cambió, o leídos de nuevo.
   * Devuelve copias profundas: quien los use puede modificarlos sin tocar la copia guardada.
   */
  async todos(col: ColeccionEnCache): Promise<DocCrudo[]> {
    const sello = await this.leerSello(col);
    const guardada = this.copias.get(col);
    if (guardada && guardada.sello === sello && guardada.hasta > this.ahora()) {
      return guardada.docs.map(clonarDoc);
    }
    const clave = `${col}|${sello}`;
    let carga = this.cargasEnCurso.get(clave);
    if (!carga) {
      carga = this.db
        .collection(col)
        .get()
        .then((snap) => snap.docs.map((d) => ({ id: d.id, data: d.data() })))
        .finally(() => this.cargasEnCurso.delete(clave));
      this.cargasEnCurso.set(clave, carga);
    }
    const docs = await carga;
    this.copias.set(col, { sello, hasta: this.ahora() + VIDA_MAXIMA_MS, docs });
    return docs.map(clonarDoc);
  }

  /**
   * Avisa que la colección cambió: se olvida la copia de esta instancia y se escribe un sello
   * nuevo para las demás. Llamarlo DESPUÉS de escribir el documento. Si el sello no se pudo
   * escribir, las otras instancias ven el cambio a más tardar en {@link VIDA_MAXIMA_MS}.
   */
  async marcarCambio(...cols: ColeccionEnCache[]): Promise<void> {
    const valor = `${this.ahora()}-${Math.random().toString(36).slice(2, 8)}`;
    for (const c of cols) this.copias.delete(c);
    try {
      await this.refSellos().set(Object.fromEntries(cols.map((c) => [c, valor])), { merge: true });
    } catch (err) {
      console.error('No se pudo escribir el sello de cambios', cols, err);
    }
  }
}

/** Copia profunda de objetos y arreglos simples; las fechas de Firestore (inmutables) se comparten. */
function clonar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(clonar);
  if (v && typeof v === 'object' && !(v instanceof Timestamp) && Object.getPrototypeOf(v) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = clonar(x);
    return out;
  }
  return v;
}

function clonarDoc(d: DocCrudo): DocCrudo {
  return { id: d.id, data: clonar(d.data) as DocumentData };
}

/** ¿El documento cumple todas las igualdades? Mismo criterio que `where(campo, '==', valor)`:
 *  un campo ausente no es igual a nada (ni a `null`). */
export function cumpleIgualdades(data: DocumentData, igualdades: [string, unknown][]): boolean {
  return igualdades.every(([campo, valor]) => campo in data && data[campo] === valor);
}

/**
 * Envuelve un repositorio para que, después de cada método que escribe (`metodos`), se marque
 * el cambio en las colecciones dadas. Así ningún guardado se olvida de poner el sello.
 */
export function conSelloDeCambios<T extends object>(
  repo: T,
  cache: CacheColecciones,
  cols: ColeccionEnCache[],
  metodos: readonly (keyof T & string)[],
): T {
  const escriben = new Set<string>(metodos);
  return new Proxy(repo, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver) as unknown;
      if (typeof prop !== 'string' || !escriben.has(prop) || typeof v !== 'function') return v;
      return async (...args: unknown[]) => {
        try {
          return await (v as (...a: unknown[]) => Promise<unknown>).apply(target, args);
        } finally {
          // También si falló a medias (un lote que escribió una parte): mejor releer de más.
          await cache.marcarCambio(...cols);
        }
      };
    },
  });
}
