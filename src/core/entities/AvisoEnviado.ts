/** Si el aviso fue por una versión desactualizada o por una licencia. */
export type TipoAvisoEnviado = 'sistema' | 'licencia';

/** Por dónde se le avisó al cliente. */
export type CanalAvisoEnviado = 'correo' | 'whatsapp';

/**
 * Un aviso ya enviado, **una fila por empresa y sistema** — no por envío. Así el historial
 * puede responder "¿de qué versión a cuál le avisamos a esta empresa, y cuándo?", que es lo
 * que se perdía al guardar solo la fecha del último aviso en la empresa.
 *
 * Se guarda en la colección `avisos_versiones`.
 */
export interface AvisoEnviado {
  id: string;
  empresaId: string;
  /** Copia del nombre al momento del envío: el historial no debe cambiar si la empresa se renombra. */
  empresaNombre: string;
  sistema: string;
  tipo: TipoAvisoEnviado;
  /** Solo para `tipo: 'sistema'`. */
  versionInstalada: string | null;
  /** Solo para `tipo: 'sistema'`. */
  versionOficial: string | null;
  /** Solo para `tipo: 'licencia'` (ISO `YYYY-MM-DD`). */
  fechaVencimiento: string | null;
  canal: CanalAvisoEnviado;
  /** Correo o teléfono al que se mandó, según el canal. */
  destino: string | null;
  enviadoPorUid: string;
  enviadoPorNombre: string;
  createdAt: Date;
}

/** Filtros del historial de avisos (todos opcionales). */
export interface FiltroAvisos {
  /** Coincidencia parcial sobre el nombre de la empresa, sin distinguir mayúsculas. */
  empresa?: string;
  desde?: Date;
  hasta?: Date;
}

/** `true` si el aviso cae dentro de los filtros dados. */
export function avisoCoincide(aviso: AvisoEnviado, filtro: FiltroAvisos): boolean {
  if (filtro.empresa && !aviso.empresaNombre.toLowerCase().includes(filtro.empresa.trim().toLowerCase())) {
    return false;
  }
  if (filtro.desde && aviso.createdAt.getTime() < filtro.desde.getTime()) return false;
  if (filtro.hasta && aviso.createdAt.getTime() > filtro.hasta.getTime()) return false;
  return true;
}
