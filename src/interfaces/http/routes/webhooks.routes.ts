import { Router } from 'express';
import type { Container } from '../../../config/container.js';

/** Endpoints de webhooks entrantes (sin sesión, sin CSRF — protegidos por `?key=`). */
export function webhookRoutes(container: Container): Router {
  const r = Router();
  r.post('/brevo', (req, res) => container.resolve('brevoWebhookController').handle(req, res));
  return r;
}
