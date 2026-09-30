/** Cuándo se descargó el último backup (documento `configuracion/backup`). */
export interface EstadoBackup {
  /** ISO de la última descarga; null = nunca. */
  ultimoBackup: string | null;
  ultimoBackupPor: string;
  /** Día (AAAA-MM-DD) del último aviso «backup no realizado», para mandarlo una vez al día. */
  ultimoAvisoNoRealizado: string;
}

/** Igual que el viejo: se recomienda un backup por semana. */
export const DIAS_ALERTA_BACKUP = 7;

/** Normaliza lo leído de Firestore (fechas inválidas o faltantes → nunca). */
export function sanearEstadoBackup(v: unknown): EstadoBackup {
  const d = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const fecha = typeof d.ultimoBackup === 'string' && !Number.isNaN(Date.parse(d.ultimoBackup)) ? d.ultimoBackup : null;
  return {
    ultimoBackup: fecha,
    ultimoBackupPor: String(d.ultimoBackupPor ?? ''),
    ultimoAvisoNoRealizado: String(d.ultimoAvisoNoRealizado ?? ''),
  };
}

/** Días completos desde el último backup (null si nunca se ha hecho). */
export function diasSinBackup(e: EstadoBackup, ahora: Date): number | null {
  if (!e.ultimoBackup) return null;
  return Math.floor((ahora.getTime() - Date.parse(e.ultimoBackup)) / 86_400_000);
}

/** ¿Toca alertar? Nunca se ha hecho, o pasaron 7 días o más. */
export function backupAtrasado(e: EstadoBackup, ahora: Date): boolean {
  const dias = diasSinBackup(e, ahora);
  return dias === null || dias >= DIAS_ALERTA_BACKUP;
}
