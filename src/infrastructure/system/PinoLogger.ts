import { pino, type Logger as Pino } from 'pino';
import type { ILogger, LogFields } from '../../core/ports/services/ILogger.js';

/** Adaptador de {@link ILogger} sobre pino. */
export class PinoLogger implements ILogger {
  private constructor(private readonly logger: Pino) {}

  static create(opts: { level: string; pretty: boolean }): PinoLogger {
    const logger = pino({
      level: opts.level,
      ...(opts.pretty
        ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }
        : {}),
    });
    return new PinoLogger(logger);
  }

  /** Envuelve una instancia de pino ya creada (p. ej. la de pino-http). */
  static wrap(logger: Pino): PinoLogger {
    return new PinoLogger(logger);
  }

  debug(msg: string, fields?: LogFields): void {
    this.logger.debug(fields ?? {}, msg);
  }
  info(msg: string, fields?: LogFields): void {
    this.logger.info(fields ?? {}, msg);
  }
  warn(msg: string, fields?: LogFields): void {
    this.logger.warn(fields ?? {}, msg);
  }
  error(msg: string, fields?: LogFields): void {
    this.logger.error(fields ?? {}, msg);
  }
  child(fields: LogFields): ILogger {
    return new PinoLogger(this.logger.child(fields));
  }
}
