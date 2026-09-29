import { Router } from 'express';
import type { Container } from '../../../config/container.js';
import { requireAuth, requireCliente, requirePermission } from '../middlewares/authz.js';
import { construirNavSecciones } from '../view-helpers/nav.js';

/** Rutas del portal de clientes (`/portal`). Requiere sesión con rol `cliente`. */
export function portalRoutes(container: Container): Router {
  const r = Router();
  const perfil = () => container.resolve('portalPerfilController');
  const tickets = () => container.resolve('portalTicketController');

  r.use(requireAuth, requireCliente);
  r.use((req, res, next) => {
    res.locals.navSecciones = construirNavSecciones(req.user!);
    res.locals.area = 'portal';
    next();
  });

  r.get('/', (req, res) => tickets().dashboard(req, res));

  const puedeTickets = requirePermission('portal:tickets');
  r.get('/tickets', puedeTickets, (req, res) => tickets().listar(req, res));
  r.get('/tickets/nuevo', puedeTickets, (req, res) => tickets().nuevoForm(req, res));
  r.post('/tickets', puedeTickets, (req, res) => tickets().crearPost(req, res));
  r.get('/tickets/:id', puedeTickets, (req, res) => tickets().detalle(req, res));
  r.post('/tickets/:id/responder', puedeTickets, (req, res) => tickets().responderPost(req, res));
  r.post('/tickets/:id/adjuntos', puedeTickets, (req, res) => tickets().adjuntoSubirPost(req, res));
  r.get('/tickets/:id/adjuntos/:adjId', puedeTickets, (req, res) => tickets().adjuntoVerGet(req, res));
  r.post('/tickets/:id/adjuntos/:adjId/eliminar', puedeTickets, (req, res) =>
    tickets().adjuntoEliminarPost(req, res),
  );

  r.get('/perfil', requirePermission('portal:perfil'), (req, res) => perfil().ver(req, res));
  r.post('/perfil', requirePermission('portal:perfil'), (req, res) => perfil().actualizar_(req, res));

  // La base de conocimiento es solo del equipo (Administrador / Soporte): los clientes ya no la
  // ven. Los enlaces viejos regresan al inicio del portal.
  r.all(/^\/kb(\/.*)?$/, (_req, res) => res.redirect('/portal'));

  r.get('/manual', (req, res) => container.resolve('manualController').ver(req, res));

  return r;
}
