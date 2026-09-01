import { Router } from 'express';
import type { Container } from '../../../config/container.js';
import { requireAuth, requireStaff, requirePermission } from '../middlewares/authz.js';
import { construirNav } from '../view-helpers/nav.js';

/** Rutas del back-office (`/app`). Requiere sesión de staff. */
export function backofficeRoutes(container: Container): Router {
  const r = Router();
  const usuarios = () => container.resolve('usuarioController');

  r.use(requireAuth, requireStaff);
  r.use((req, res, next) => {
    res.locals.nav = construirNav(req.user!);
    res.locals.area = 'backoffice';
    next();
  });

  r.get('/', (req, res) => {
    res.render('pages/backoffice/dashboard', { titulo: 'Dashboard' });
  });

  r.get('/usuarios', requirePermission('usuarios:gestionar'), (req, res) =>
    usuarios().listar(req, res),
  );
  r.get('/usuarios/nuevo', requirePermission('usuarios:gestionar'), (req, res) =>
    usuarios().nuevo(req, res),
  );
  r.post('/usuarios', requirePermission('usuarios:gestionar'), (req, res) =>
    usuarios().crearPost(req, res),
  );
  r.get('/usuarios/invitar-cliente', requirePermission('usuarios:gestionar'), (req, res) =>
    usuarios().invitarClienteGet(req, res),
  );
  r.post('/usuarios/invitar-cliente', requirePermission('usuarios:gestionar'), (req, res) =>
    usuarios().invitarClientePost(req, res),
  );
  r.get('/usuarios/:uid', requirePermission('usuarios:gestionar'), (req, res) =>
    usuarios().editar(req, res),
  );
  r.post('/usuarios/:uid', requirePermission('usuarios:gestionar'), (req, res) =>
    usuarios().actualizarPost(req, res),
  );

  return r;
}
