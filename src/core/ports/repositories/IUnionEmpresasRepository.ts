/** Cuántos registros de cada tipo apuntan a una empresa (o se movieron al unirla con otra). */
export interface ReferenciasEmpresa {
  contactos: number;
  tickets: number;
  cotizaciones: number;
  tareas: number;
  interacciones: number;
  oportunidades: number;
  /** Cuentas del portal de clientes (empresa principal o adicional). */
  usuarios: number;
  /** Historial de avisos de versiones/licencias. */
  avisos: number;
}

/** Total de registros de un {@link ReferenciasEmpresa}. */
export function totalReferencias(r: ReferenciasEmpresa): number {
  return Object.values(r).reduce((s, n) => s + n, 0);
}

/**
 * Lo que hace falta para unir una empresa duplicada con la buena: contar qué cuelga de ella y
 * cambiar de golpe el `empresaId` de todo eso (una consulta por colección + escrituras en lote,
 * por el tope de subpeticiones del Worker).
 */
export interface IUnionEmpresasRepository {
  contarReferencias(empresaId: string): Promise<ReferenciasEmpresa>;
  /**
   * Pasa todo lo de `deId` a `a`. Donde el registro guarda también el nombre de la empresa
   * (tickets, cotizaciones, oportunidades) se pone el nuevo; el historial de avisos conserva
   * el nombre con el que se mandó.
   */
  moverReferencias(deId: string, a: { id: string; nombre: string }): Promise<ReferenciasEmpresa>;
}
