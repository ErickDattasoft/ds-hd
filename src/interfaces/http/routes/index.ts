import { Router } from 'express';
import type { Container } from '../../../config/container.js';
import { HealthController } from '../controllers/public/HealthController.js';
import { APP_VERSION } from '../../../config/version.js';
import { sessionAuth } from '../middlewares/sessionAuth.js';
import { csrf } from '../middlewares/csrf.js';
import { publicRoutes } from './public.routes.js';
import { backofficeRoutes } from './backoffice.routes.js';
import { portalRoutes } from './portal.routes.js';
import { webhookRoutes } from './webhooks.routes.js';

/** Monta todos los routers de la app. */
export function buildRouter(container: Container): Router {
  const router = Router();
  const { firebase, logger, config } = container.cradle;

  // Health primero: sin sesión, sin CSRF.
  const health = new HealthController(firebase, logger, APP_VERSION);
  router.get('/healthz', health.handle);

  // Sesión + CSRF para todo lo demás.
  router.use(sessionAuth(container, logger));
  router.use(csrf({ secure: config.isProduction, exentas: /^\/(webhooks|jobs)\// }));

  // Landing: redirige según el rol si hay sesión.
  router.get('/', (req, res) => {
    if (req.user) return res.redirect(req.user.esCliente ? '/portal' : '/app');
    res.render('pages/public/home', { titulo: 'ds-hd', version: APP_VERSION });
  });

  router.use('/webhooks', webhookRoutes(container));
  router.use('/', publicRoutes(container));
  router.use('/app', backofficeRoutes(container));
  router.use('/portal', portalRoutes(container));

  return router;
}
