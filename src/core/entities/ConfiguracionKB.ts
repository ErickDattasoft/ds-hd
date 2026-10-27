import { CARPETAS_KB, type CarpetaKB } from './ArticuloKB.js';

/**
 * Config de la base de conocimiento (documento `configuracion/kb`). Como el panel «👥 Acceso»
 * del CRM viejo: quién la ve NO depende del rol (un admin puede no verla); lo decide solo el
 * propietario, persona por persona.
 */
export interface ConfiguracionKB {
  /** uids con acceso de lectura (el propietario siempre lo tiene, no hace falta listarlo). */
  acceso: string[];
  /** Ruta de Windows de cada carpeta, solo como recordatorio en el botón de indexar. */
  rutas: Record<CarpetaKB, string>;
}

export const CONFIG_KB_POR_DEFECTO: ConfiguracionKB = {
  acceso: [],
  rutas: { empresas: '', soporte: '' },
};

/** Rellena una config parcial de Firestore con los valores por defecto. */
export function sanearConfigKB(d: unknown): ConfiguracionKB {
  const o = (d ?? {}) as Record<string, unknown>;
  const rutas = (o.rutas ?? {}) as Record<string, unknown>;
  return {
    acceso: Array.isArray(o.acceso) ? [...new Set(o.acceso.map(String).filter(Boolean))] : [],
    rutas: Object.fromEntries(
      CARPETAS_KB.map((c) => [c, typeof rutas[c] === 'string' ? (rutas[c] as string).trim().slice(0, 300) : '']),
    ) as Record<CarpetaKB, string>,
  };
}
