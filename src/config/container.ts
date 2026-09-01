import { asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import type { AppConfig } from './env.js';
import { initFirebase, type FirebaseServices } from './firebase.js';
import { PinoLogger } from '../infrastructure/system/PinoLogger.js';
import { SystemClock } from '../infrastructure/system/SystemClock.js';
import { UuidGenerator } from '../infrastructure/system/UuidGenerator.js';
import type { ILogger } from '../core/ports/services/ILogger.js';
import type { IClock } from '../core/ports/services/IClock.js';
import type { IIdGenerator } from '../core/ports/services/IIdGenerator.js';

/**
 * Registro de todo lo que se puede resolver del contenedor.
 * Las capas internas (`core`, `application`) reciben estas dependencias por constructor;
 * SOLO el borde HTTP (routers/controllers) toca el contenedor directamente.
 */
export interface Cradle {
  config: AppConfig;
  logger: ILogger;
  clock: IClock;
  idGenerator: IIdGenerator;
  firebase: FirebaseServices | null;
}

export type Container = AwilixContainer<Cradle>;

/**
 * Composition root: el ÚNICO lugar donde se instancian adaptadores concretos.
 * Cambiar una implementación (p. ej. otro proveedor de correo) se hace aquí, sin tocar
 * `application/` (OCP + DIP).
 */
export function buildContainer(config: AppConfig): Container {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });

  const logger = PinoLogger.create({
    level: config.logLevel,
    pretty: !config.isProduction && !config.isTest,
  });

  container.register({
    config: asValue(config),
    logger: asValue(logger),
    clock: asFunction(() => new SystemClock()).singleton(),
    idGenerator: asFunction(() => new UuidGenerator()).singleton(),
    firebase: asValue(initFirebase(config, logger)),
  });

  return container;
}
