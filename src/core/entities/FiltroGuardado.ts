/**
 * Búsqueda frecuente que un usuario guarda para re-aplicar con un clic
 * (`filtros_guardados/{id}`). Es personal: cada quien ve y gestiona los suyos.
 */
export interface FiltroGuardado {
  id: string;
  /** Dueño del filtro. */
  uid: string;
  /** Nombre visible, p. ej. "Favoritas CONTPAQi". */
  nombre: string;
  /** Módulo al que aplica: `empresas`, `tickets`, `cotizaciones`… */
  modulo: string;
  /** Query string sin el `?` inicial, p. ej. `favoritas=1&sistema=Contpaqi`. */
  query: string;
  creadoEn: Date;
}

/** Máximo de filtros guardados por usuario y módulo. */
export const MAX_FILTROS_POR_MODULO = 12;
