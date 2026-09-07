import { Router } from 'express';
import type { Container } from '../../../config/container.js';

/** Endpoints para el cron (GitHub Actions). Protegidos por bearer/`?key=` JOBS_SECRET. */
export function jobsRoutes(container: Container): Router {
  const r = Router();
  const jobs = () => container.resolve('jobsController');
  r.post('/recordatorios-eventos', (req, res) => jobs().recordatoriosEventos(req, res));
  r.get('/recordatorios-eventos', (req, res) => jobs().recordatoriosEventos(req, res));
  r.post('/recalcular-sla', (req, res) => jobs().recalcularSla(req, res));
  r.get('/recalcular-sla', (req, res) => jobs().recalcularSla(req, res));
  r.post('/purgar-bitacora', (req, res) => jobs().purgarBitacora(req, res));
  r.get('/purgar-bitacora', (req, res) => jobs().purgarBitacora(req, res));
  return r;
}
