import { Router } from 'express';
import type { Container } from '../../../config/container.js';
import { requireAuth, requireCliente } from '../middlewares/authz.js';
import { construirNav } from '../view-helpers/nav.js';

/** Rutas del portal de clientes (`/portal`). Requiere sesión con rol `cliente`. */
export function portalRoutes(container: Container): Router {
  const r = Router();
  const perfil = () => container.resolve('portalPerfilController');

  r.use(requireAuth, requireCliente);
  r.use((req, res, next) => {
    res.locals.nav = construirNav(req.user!);
    res.locals.area = 'portal';
    next();
  });

  r.get('/', (req, res) => {
    res.render('pages/portal/dashboard', { titulo: 'Portal' });
  });

  r.get('/perfil', (req, res) => perfil().ver(req, res));
  r.post('/perfil', (req, res) => perfil().actualizar_(req, res));

  return r;
}
