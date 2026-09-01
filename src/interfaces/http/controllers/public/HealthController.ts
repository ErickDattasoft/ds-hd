import type { Request, Response } from 'express';
import type { FirebaseServices } from '../../../../config/firebase.js';
import type { ILogger } from '../../../../core/ports/services/ILogger.js';

const STARTED_AT = Date.now();

/** Endpoint de salud usado por el HEALTHCHECK de Docker y por el balanceador. */
export class HealthController {
  constructor(
    private readonly firebase: FirebaseServices | null,
    private readonly logger: ILogger,
    private readonly version: string,
  ) {}

  handle = async (_req: Request, res: Response): Promise<void> => {
    let firestore: 'ok' | 'desactivado' | 'error' = 'desactivado';
    if (this.firebase) {
      try {
        // Lectura barata: no requiere que exista ningún documento.
        await this.firebase.firestore.collection('_health').limit(1).get();
        firestore = 'ok';
      } catch (err) {
        firestore = 'error';
        this.logger.error('Healthcheck: Firestore no responde', {
          err: err instanceof Error ? err.message : err,
        });
      }
    }

    const status = firestore === 'error' ? 503 : 200;
    res.status(status).json({
      status: status === 200 ? 'ok' : 'degradado',
      version: this.version,
      uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
      checks: { firestore },
    });
  };
}
