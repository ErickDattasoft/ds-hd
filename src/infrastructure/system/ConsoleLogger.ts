import type { ILogger, LogFields } from '../../core/ports/services/ILogger.js';

const NIVELES = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
type Nivel = (typeof NIVELES)[number];

/**
 * Adaptador de {@link ILogger} sobre `console`, en JSON de una línea.
 *
 * Para Cloudflare Workers: `pino` arrastra `thread-stream`/`sonic-boom` (worker threads +
 * escritura a file descriptors) que no corren en `workerd`. `console.*` en Workers ya emite
 * a los logs de observabilidad de Cloudflare.
 */
export class ConsoleLogger implements ILogger {
  private constructor(
    private readonly minimo: number,
    private readonly base: LogFields,
  ) {}

  static create(opts: { level: string }): ConsoleLogger {
    const idx = NIVELES.indexOf(opts.level as Nivel);
    return new ConsoleLogger(idx === -1 ? NIVELES.indexOf('info') : idx, {});
  }

  private emit(nivel: Nivel, msg: string, fields?: LogFields): void {
    if (NIVELES.indexOf(nivel) < this.minimo) return;
    const linea = JSON.stringify({
      level: nivel,
      time: new Date().toISOString(),
      msg,
      ...this.base,
      ...fields,
    });
    if (nivel === 'error' || nivel === 'fatal') console.error(linea);
    else if (nivel === 'warn') console.warn(linea);
    // eslint-disable-next-line no-console -- este adaptador ES la salida de log
    else console.log(linea);
  }

  debug(msg: string, fields?: LogFields): void {
    this.emit('debug', msg, fields);
  }
  info(msg: string, fields?: LogFields): void {
    this.emit('info', msg, fields);
  }
  warn(msg: string, fields?: LogFields): void {
    this.emit('warn', msg, fields);
  }
  error(msg: string, fields?: LogFields): void {
    this.emit('error', msg, fields);
  }
  child(fields: LogFields): ILogger {
    return new ConsoleLogger(this.minimo, { ...this.base, ...fields });
  }
}
