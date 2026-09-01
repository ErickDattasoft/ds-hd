import { Router } from 'express';
import type { Container } from '../../../config/container.js';
import { requireAuth, requireStaff, requirePermission } from '../middlewares/authz.js';
import { construirNav } from '../view-helpers/nav.js';

/** Rutas del back-office (`/app`). Requiere sesión de staff. */
export function backofficeRoutes(container: Container): Router {
  const r = Router();
  const usuarios = () => container.resolve('usuarioController');
  const tickets = () => container.resolve('ticketController');
  const configuracion = () => container.resolve('configuracionController');
  const empresas = () => container.resolve('empresaController');
  const contactos = () => container.resolve('contactoController');
  const bitacora = () => container.resolve('bitacoraController');
  const gestUsuarios = requirePermission('usuarios:gestionar');
  const leerTickets = requirePermission('tickets:leer');

  r.use(requireAuth, requireStaff);
  r.use((req, res, next) => {
    res.locals.nav = construirNav(req.user!);
    res.locals.area = 'backoffice';
    next();
  });

  r.get('/', (req, res) => res.render('pages/backoffice/dashboard', { titulo: 'Dashboard' }));

  // ── Usuarios ───────────────────────────────────────────────────────────────
  r.get('/usuarios', gestUsuarios, (req, res) => usuarios().listar(req, res));
  r.get('/usuarios/nuevo', gestUsuarios, (req, res) => usuarios().nuevo(req, res));
  r.post('/usuarios', gestUsuarios, (req, res) => usuarios().crearPost(req, res));
  r.get('/usuarios/invitar-cliente', gestUsuarios, (req, res) => usuarios().invitarClienteGet(req, res));
  r.post('/usuarios/invitar-cliente', gestUsuarios, (req, res) => usuarios().invitarClientePost(req, res));
  r.get('/usuarios/:uid', gestUsuarios, (req, res) => usuarios().editar(req, res));
  r.post('/usuarios/:uid', gestUsuarios, (req, res) => usuarios().actualizarPost(req, res));

  // ── Tickets ────────────────────────────────────────────────────────────────
  r.get('/tickets', leerTickets, (req, res) => tickets().listarView(req, res));
  r.get('/tickets/tablero', leerTickets, (req, res) => tickets().tableroView(req, res));
  r.get('/tickets/mis-asignados', leerTickets, (req, res) => tickets().misAsignadosView(req, res));
  r.get('/tickets/carga-agentes', requirePermission('tickets:asignar'), (req, res) =>
    tickets().cargaAgentesView(req, res),
  );
  r.get('/tickets/buzon', requirePermission('tickets:crear'), (req, res) => tickets().buzonView(req, res));
  r.post('/tickets/buzon/:id/aceptar', requirePermission('tickets:crear'), (req, res) =>
    tickets().aceptarPublicoPost(req, res),
  );
  r.post('/tickets/buzon/:id/rechazar', requirePermission('tickets:crear'), (req, res) =>
    tickets().rechazarPublicoPost(req, res),
  );
  r.get('/tickets/nuevo', requirePermission('tickets:crear'), (req, res) => tickets().nuevoForm(req, res));
  r.post('/tickets', requirePermission('tickets:crear'), (req, res) => tickets().crearPost(req, res));
  r.get('/tickets/:id', leerTickets, (req, res) => tickets().detalleView(req, res));
  r.post('/tickets/:id/estado', requirePermission('tickets:cambiar_estado'), (req, res) =>
    tickets().cambiarEstadoPost(req, res),
  );
  r.post('/tickets/:id/asignar', requirePermission('tickets:asignar'), (req, res) =>
    tickets().asignarPost(req, res),
  );
  r.post('/tickets/:id/nota', requirePermission('tickets:editar'), (req, res) => tickets().notaPost(req, res));
  r.post('/tickets/:id/facturar', requirePermission('tickets:editar'), (req, res) =>
    tickets().facturarPost(req, res),
  );

  // ── Empresas ───────────────────────────────────────────────────────────────
  r.get('/empresas', requirePermission('empresas:leer'), (req, res) => empresas().listar(req, res));
  r.get('/empresas/nueva', requirePermission('empresas:crear'), (req, res) => empresas().nuevo(req, res));
  r.post('/empresas', requirePermission('empresas:crear'), (req, res) => empresas().crearPost(req, res));
  r.get('/empresas/:id', requirePermission('empresas:leer'), (req, res) => empresas().ver(req, res));
  r.get('/empresas/:id/editar', requirePermission('empresas:editar'), (req, res) => empresas().editar(req, res));
  r.post('/empresas/:id', requirePermission('empresas:editar'), (req, res) => empresas().actualizarPost(req, res));
  r.post('/empresas/:id/archivar', requirePermission('empresas:eliminar'), (req, res) => empresas().archivarPost(req, res));

  // ── Contactos ──────────────────────────────────────────────────────────────
  r.get('/contactos', requirePermission('contactos:leer'), (req, res) => contactos().listar(req, res));
  r.get('/contactos/nuevo', requirePermission('contactos:crear'), (req, res) => contactos().nuevo(req, res));
  r.post('/contactos', requirePermission('contactos:crear'), (req, res) => contactos().crearPost(req, res));
  r.get('/contactos/:id/editar', requirePermission('contactos:editar'), (req, res) => contactos().editar(req, res));
  r.post('/contactos/:id', requirePermission('contactos:editar'), (req, res) => contactos().actualizarPost(req, res));
  r.post('/contactos/:id/archivar', requirePermission('contactos:eliminar'), (req, res) => contactos().archivarPost(req, res));

  // ── Bitácora ───────────────────────────────────────────────────────────────
  r.get('/bitacora', requirePermission('bitacora:leer'), (req, res) => bitacora().listar(req, res));

  // ── Configuración ──────────────────────────────────────────────────────────
  r.get('/configuracion', requirePermission('configuracion:catalogos'), (req, res) =>
    res.redirect('/app/configuracion/tickets'),
  );
  r.get('/configuracion/tickets', requirePermission('configuracion:catalogos'), (req, res) =>
    configuracion().ticketsView(req, res),
  );
  r.post('/configuracion/tickets', requirePermission('configuracion:catalogos'), (req, res) =>
    configuracion().ticketsPost(req, res),
  );

  return r;
}
