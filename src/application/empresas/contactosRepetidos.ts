import type { Contacto } from '../../core/entities/Contacto.js';
import type { Empresa } from '../../core/entities/Empresa.js';

/** Un grupo de contactos que son la misma persona: `queda` se conserva y `sobran` se juntan en él. */
export interface GrupoRepetido {
  queda: Contacto;
  sobran: Contacto[];
}

/** Nombre sin acentos, mayúsculas ni espacios de más, para comparar personas. */
const clave = (nombre: string): string =>
  nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

/** Cuántos datos tiene llenos (para quedarse con el más completo). */
const llenos = (c: Contacto): number =>
  [c.email, c.emailAlternativo, c.telefono, c.celular, c.puesto, c.rfc, c.notas, c.cumpleanos].filter(Boolean).length;

/**
 * Contactos activos de una empresa que son la misma persona: mismo correo (principal o
 * alternativo) o mismo nombre. Se queda el marcado como principal, luego el alternativo, luego el
 * que tiene cuenta del portal y luego el más completo. No junta dos que tengan cada uno su propia
 * cuenta del portal (serían dos accesos distintos).
 */
export function contactosRepetidos(contactos: Contacto[], empresa: Pick<Empresa, 'contactoPrincipalId' | 'contactoAlternativoId'>): GrupoRepetido[] {
  const activos = contactos.filter((c) => c.activo);
  // Unión de conjuntos: dos contactos van juntos si comparten nombre o algún correo.
  const padre = new Map(activos.map((c) => [c.id, c.id]));
  const raiz = (id: string): string => {
    while (padre.get(id) !== id) id = padre.get(id)!;
    return id;
  };
  const primeroPor = new Map<string, string>();
  for (const c of activos) {
    const llaves = [`n:${clave(c.nombre)}`, ...[c.email, c.emailAlternativo].filter(Boolean).map((e) => `e:${e}`)];
    for (const k of llaves) {
      const otro = primeroPor.get(k);
      if (otro) padre.set(raiz(c.id), raiz(otro));
      else primeroPor.set(k, c.id);
    }
  }
  const grupos = new Map<string, Contacto[]>();
  for (const c of activos) grupos.set(raiz(c.id), [...(grupos.get(raiz(c.id)) ?? []), c]);

  const rango = (c: Contacto): number[] => [
    c.id === empresa.contactoPrincipalId ? 0 : 1,
    c.id === empresa.contactoAlternativoId ? 0 : 1,
    c.uid ? 0 : 1,
    -llenos(c),
    c.createdAt.getTime(),
  ];
  const compara = (a: Contacto, b: Contacto): number => {
    const ra = rango(a);
    const rb = rango(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i]! - rb[i]!;
    return 0;
  };

  const out: GrupoRepetido[] = [];
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    const [queda, ...resto] = [...g].sort(compara);
    const sobran = resto.filter((c) => !(c.uid && queda!.uid && c.uid !== queda!.uid));
    if (sobran.length) out.push({ queda: queda!, sobran });
  }
  return out;
}

/** Copia en `queda` lo que le falta y tiene `sobra` (lo que ya tiene no se cambia). */
export function completarContacto(queda: Contacto, sobra: Contacto, ahora: Date): void {
  const correos = new Set([queda.email, queda.emailAlternativo].filter(Boolean));
  for (const e of [sobra.email, sobra.emailAlternativo]) {
    if (!e || correos.has(e)) continue;
    if (!queda.email) queda.email = e;
    else if (!queda.emailAlternativo) queda.emailAlternativo = e;
    correos.add(e);
  }
  queda.telefono ??= sobra.telefono;
  queda.celular ??= sobra.celular;
  queda.puesto ??= sobra.puesto;
  queda.rfc ??= sobra.rfc;
  queda.cumpleanos ??= sobra.cumpleanos;
  if (!queda.uid && sobra.uid) {
    // La cuenta del portal se pasa entera: el archivado ya no la conserva.
    queda.uid = sobra.uid;
    queda.esPortal = true;
    sobra.uid = null;
    sobra.esPortal = false;
  }
  if (sobra.notas && !(queda.notas ?? '').includes(sobra.notas)) {
    queda.notas = [queda.notas, sobra.notas].filter(Boolean).join('\n');
  }
  queda.updatedAt = ahora;
}
