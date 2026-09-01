/** Campos estructurados adicionales para una línea de log. */
export type LogFields = Record<string, unknown>;

/**
 * Puerto de logging. La capa de aplicación depende de esta interfaz, nunca de pino
 * directamente (DIP). El adaptador vive en infrastructure/system/PinoLogger.ts.
 */
export interface ILogger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  /** Devuelve un logger hijo con campos fijos (p. ej. `{ requestId }`). */
  child(fields: LogFields): ILogger;
}
