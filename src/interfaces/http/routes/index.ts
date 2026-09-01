import { Router } from 'express';
import type { Container } from '../../../config/container.js';
import { HealthController } from '../controllers/public/HealthController.js';
import { APP_VERSION } from '../../../config/version.js';

/**
 * Monta todos los routers de la app. Cada área (público, back-office, portal, webhooks, jobs)
 * será un router propio registrado aquí a medida que avancen las fases.
 */
export function buildRouter(container: Container): Router {
  const router = Router();
  const { firebase, logger } = container.cradle;

  const health = new HealthController(firebase, logger, APP_VERSION);
  router.get('/healthz', health.handle);

  // Landing pública temporal (Fase 0). Se reemplaza por el router público real en Fase 1.
  router.get('/', (_req, res) => {
    res.render('pages/public/home', { titulo: 'ds-hd', version: APP_VERSION });
  });

  return router;
}
