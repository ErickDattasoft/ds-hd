import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';

/** Colecciones que se guardan completas en memoria (las que más se releen en cada página). */
export type ColeccionEnCache = 'tickets' | 'empresas' | 'contactos' | 'respuestas_sin_leer';

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
 * Colecciones grandes que se actualizan POR PARTES: cada escritura deja `cacheMod` (fecha) y, al
 * cambiar el sello, cada instancia lee solo los documentos con `cacheMod` más nuevo que su copia
 * (en vez de los ~1,100 tickets completos). Leer la colección entera por cada cambio, en cada
 * instancia del Worker, era lo que agotaba la cuota diaria en minutos.
 */
const CAMPO_CAMBIO: Partial<Record<ColeccionEnCache, string>> = { tickets: 'cacheMod' };
/** Cada cuánto, aun así, se relee completa (por si algo escribió sin `cacheMod`). */
const RECARGA_COMPLETA_MS = 6 * 3_600_000;
/** Margen hacia atrás al pedir «lo que cambió desde…», por relojes y escrituras simultáneas. */
const MARGEN_MS = 2 * 60_000;

interface Copia {
  sello: string;
  /** Sello de «recarga completa» (borrados y escrituras sin `cacheMod`). */
  completo: string;
  hasta: number;
  cargadaEn: number;
  /** Desde cuándo pedir cambios en la siguiente actualización por partes. */
  desde: number;
  docs: Map<string, DocCrudo>;
}

/**
 * Copia en memoria de las colecciones que se releen completas en cada clic (tickets, empresas,
 * contactos, avisos), con un **sello de cambios** en Firestore.
 *
 * Cada consulta lee solo el documento de sellos (1 lectura, compartida entre colecciones) y, si
 * nadie cambió nada, usa la copia. Quien guarda pone un sello nuevo; las demás instancias se
 * enteran en su siguiente consulta: los tickets se actualizan por partes (solo lo que cambió) y las
 * colecciones chicas se releen.
 *
 * El orden importa: primero se escribe el documento y después el sello (ver `marcarCambio`).
 */
export class CacheColecciones {
  private readonly copias = new Map<ColeccionEnCache, Copia>();
  /** Lectura del documento de sellos en curso, para no repetirla si varias consultas la piden a la vez. */
  private sellosEnCurso: Promise<Record<string, unknown>> | null = null;
  /** Cargas en curso (mismo motivo). */
  private readonly cargasEnCurso = new Map<string, Promise<void>>();

  constructor(
    private readonly db: Firestore,
    private readonly ahora: () => number = () => Date.now(),
  ) {}

  private refSellos() {
    return this.db.collection(DOC_SELLOS.col).doc(DOC_SELLOS.doc);
  }

  private leerSellos(): Promise<Record<string, unknown>> {
    if (this.sellosEnCurso) return this.sellosEnCurso;
    const p = this.refSellos()
      .get()
      .then((s) => (s.exists ? (s.data() ?? {}) : {}) as Record<string, unknown>)
      .finally(() => {
        this.sellosEnCurso = null;
      });
    this.sellosEnCurso = p;
    return p;
  }

  /**
   * Todos los documentos de la colección: de la copia si el sello no cambió, o actualizados.
   * Devuelve copias profundas: quien los use puede modificarlos sin tocar la copia guardada.
   */
  async todos(col: ColeccionEnCache): Promise<DocCrudo[]> {
    const sellos = await this.leerSellos();
    const sello = String(sellos[col] ?? '0');
    const completo = String(sellos[`${col}_completo`] ?? '0');
    const copia = this.copias.get(col);
    if (copia && copia.sello === sello && copia.hasta > this.ahora()) return [...copia.docs.values()].map(clonarDoc);

    const clave = `${col}|${sello}|${completo}`;
    let carga = this.cargasEnCurso.get(clave);
    if (!carga) {
      carga = this.actualizar(col, sello, completo).finally(() => this.cargasEnCurso.delete(clave));
      this.cargasEnCurso.set(clave, carga);
    }
    await carga;
    return [...(this.copias.get(col)?.docs.values() ?? [])].map(clonarDoc);
  }

  private async actualizar(col: ColeccionEnCache, sello: string, completo: string): Promise<void> {
    const inicio = this.ahora();
    const copia = this.copias.get(col);
    const campo = CAMPO_CAMBIO[col];
    // Por partes: solo lo que cambió desde la última vez.
    if (campo && copia && copia.completo === completo && inicio - copia.cargadaEn < RECARGA_COMPLETA_MS) {
      const snap = await this.db
        .collection(col)
        .where(campo, '>=', Timestamp.fromDate(new Date(copia.desde)))
        .get();
      for (const d of snap.docs) copia.docs.set(d.id, { id: d.id, data: d.data() });
      copia.sello = sello;
      copia.hasta = inicio + VIDA_MAXIMA_MS;
      copia.desde = inicio - MARGEN_MS;
      return;
    }
    const snap = await this.db.collection(col).get();
    this.copias.set(col, {
      sello,
      completo,
      hasta: inicio + VIDA_MAXIMA_MS,
      cargadaEn: inicio,
      desde: inicio - MARGEN_MS,
      docs: new Map(snap.docs.map((d) => [d.id, { id: d.id, data: d.data() }])),
    });
  }

  /**
   * Avisa que la colección cambió: se escribe un sello nuevo para las demás instancias. Con
   * `completo` (borrados o escrituras sin `cacheMod`) todas releen la colección entera; si no, las
   * colecciones por partes solo leen lo que cambió. Llamarlo DESPUÉS de escribir el documento. Si
   * el sello no se pudo escribir, las otras instancias ven el cambio a más tardar en
   * {@link VIDA_MAXIMA_MS}.
   */
  async marcarCambio(cols: ColeccionEnCache[], opciones: { completo?: boolean } = {}): Promise<void> {
    const valor = `${this.ahora()}-${Math.random().toString(36).slice(2, 8)}`;
    const datos: Record<string, string> = {};
    for (const c of cols) {
      datos[c] = valor;
      const porPartes = Boolean(CAMPO_CAMBIO[c]);
      if (opciones.completo || !porPartes) {
        if (porPartes) datos[`${c}_completo`] = valor;
        this.copias.delete(c);
      }
    }
    try {
      await this.refSellos().set(datos, { merge: true });
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
 * el cambio en las colecciones dadas. Así ningún guardado se olvida de poner el sello. Los
 * `completos` (borrados, escrituras sin `cacheMod`) obligan a releer la colección entera.
 */
export function conSelloDeCambios<T extends object>(
  repo: T,
  cache: CacheColecciones,
  cols: ColeccionEnCache[],
  metodos: readonly (keyof T & string)[],
  completos: readonly (keyof T & string)[] = [],
): T {
  const escriben = new Set<string>(metodos);
  const enteros = new Set<string>(completos);
  return new Proxy(repo, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver) as unknown;
      if (typeof prop !== 'string' || (!escriben.has(prop) && !enteros.has(prop)) || typeof v !== 'function') return v;
      return async (...args: unknown[]) => {
        try {
          return await (v as (...a: unknown[]) => Promise<unknown>).apply(target, args);
        } finally {
          // También si falló a medias (un lote que escribió una parte): mejor releer de más.
          await cache.marcarCambio(cols, { completo: enteros.has(prop) });
        }
      };
    },
  });
}
