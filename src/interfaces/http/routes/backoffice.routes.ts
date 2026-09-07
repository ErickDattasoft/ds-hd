import { Router } from 'express';
import type { Container } from '../../../config/container.js';
import { requireAuth, requireStaff, requirePermission } from '../middlewares/authz.js';
import { uploadSingleFile } from '../middlewares/uploadSingleFile.js';
import { construirNavSecciones, contadoresNecesarios, conContadores, type ContadoresNav } from '../view-helpers/nav.js';

/** Excel `.xlsx` de import (empresas/contactos), en memoria — nunca toca disco. */
const uploadExcel = uploadSingleFile('archivo', 10 * 1024 * 1024);

/** Rutas del back-office (`/app`). Requiere sesión de staff. */
export function backofficeRoutes(container: Container): Router {
  const r = Router();
  const usuarios = () => container.resolve('usuarioController');
  const tickets = () => container.resolve('ticketController');
  const configuracion = () => container.resolve('configuracionController');
  const empresas = () => container.resolve('empresaController');
  const contactos = () => container.resolve('contactoController');
  const bitacora = () => container.resolve('bitacoraController');
  const versiones = () => container.resolve('versionController');
  const kb = () => container.resolve('knowledgeController');
  const cotizaciones = () => container.resolve('cotizacionController');
  const seguimiento = () => container.resolve('seguimientoController');
  const papelera = () => container.resolve('papeleraController');
  const eventos = () => container.resolve('eventoController');
  const gestUsuarios = requirePermission('usuarios:gestionar');
  const leerTickets = requirePermission('tickets:leer');

  r.use(requireAuth, requireStaff);
  r.use(async (req, res, next) => {
    const secciones = construirNavSecciones(req.user!);
    const claves = contadoresNecesarios(secciones);
    const contadores: ContadoresNav = {};
    if (claves.includes('ticketsAbiertos')) {
      contadores.ticketsAbiertos = await container
        .resolve('ticketQueries')
        .contar({ soloAbiertos: true, archivado: false });
    }
    if (claves.includes('cotizacionesBorrador')) {
      const porEstado = await container.resolve('cotizacionRepo').contarPorEstado();
      contadores.cotizacionesBorrador = porEstado.borrador ?? 0;
    }
    res.locals.navSecciones = conContadores(secciones, contadores);
    res.locals.area = 'backoffice';
    next();
  });

  r.get('/', requirePermission('dashboard:ver'), (req, res) =>
    container.resolve('dashboardController').ver(req, res),
  );

  r.get('/buscar', (req, res) => container.resolve('busquedaController').buscar(req, res));

  // Acerca de — visible para cualquier staff; editar requiere configuracion:catalogos.
  r.get('/acerca-de', (req, res) => configuracion().acercaDeView(req, res));
  r.post('/acerca-de', requirePermission('configuracion:catalogos'), (req, res) =>
    configuracion().acercaDePost(req, res),
  );

  // ── Usuarios ───────────────────────────────────────────────────────────────
  r.get('/mi-perfil', (req, res) => usuarios().miPerfilView(req, res));
  r.post('/mi-perfil', (req, res) => usuarios().miPerfilPost(req, res));

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
  r.get('/tickets/exportar', leerTickets, (req, res) => tickets().exportarExcel(req, res));
  r.get('/tickets/:id', leerTickets, (req, res) => tickets().detalleView(req, res));
  r.post('/tickets/:id/estado', requirePermission('tickets:cambiar_estado'), (req, res) =>
    tickets().cambiarEstadoPost(req, res),
  );
  r.post('/tickets/:id/asignar', requirePermission('tickets:asignar'), (req, res) =>
    tickets().asignarPost(req, res),
  );
  r.post('/tickets/:id/nota', requirePermission('tickets:editar'), (req, res) => tickets().notaPost(req, res));
  r.post('/tickets/:id/agenda', requirePermission('tickets:editar'), (req, res) =>
    tickets().agendaPost(req, res),
  );
  r.post('/tickets/:id/tiempo', requirePermission('tickets:editar'), (req, res) =>
    tickets().tiempoPost(req, res),
  );
  r.post('/tickets/:id/facturar', requirePermission('tickets:editar'), (req, res) =>
    tickets().facturarPost(req, res),
  );
  r.post('/tickets/:id/archivar', requirePermission('tickets:eliminar'), (req, res) =>
    tickets().archivarPost(req, res),
  );

  // ── Empresas ───────────────────────────────────────────────────────────────
  r.get('/empresas', requirePermission('empresas:leer'), (req, res) => empresas().listar(req, res));
  r.get('/empresas/nueva', requirePermission('empresas:crear'), (req, res) => empresas().nuevo(req, res));
  r.post('/empresas', requirePermission('empresas:crear'), (req, res) => empresas().crearPost(req, res));
  r.post('/empresas/avisar', requirePermission('empresas:editar'), (req, res) => empresas().avisarPost(req, res));
  r.get('/empresas/exportar', requirePermission('empresas:leer'), (req, res) => empresas().exportarExcel(req, res));
  r.get('/empresas/importar', requirePermission('empresas:crear'), (req, res) => empresas().importarView(req, res));
  r.post('/empresas/importar', requirePermission('empresas:crear'), uploadExcel, (req, res) =>
    empresas().importarPost(req, res),
  );
  r.get('/empresas/:id', requirePermission('empresas:leer'), (req, res) => empresas().ver(req, res));
  r.get('/empresas/:id/editar', requirePermission('empresas:editar'), (req, res) => empresas().editar(req, res));
  r.post('/empresas/:id', requirePermission('empresas:editar'), (req, res) => empresas().actualizarPost(req, res));
  r.post('/empresas/:id/archivar', requirePermission('empresas:eliminar'), (req, res) => empresas().archivarPost(req, res));
  r.post('/empresas/:id/favorita', requirePermission('empresas:editar'), (req, res) => empresas().favoritaPost(req, res));

  // ── Contactos ──────────────────────────────────────────────────────────────
  r.get('/contactos', requirePermission('contactos:leer'), (req, res) => contactos().listar(req, res));
  r.get('/contactos/nuevo', requirePermission('contactos:crear'), (req, res) => contactos().nuevo(req, res));
  r.post('/contactos', requirePermission('contactos:crear'), (req, res) => contactos().crearPost(req, res));
  r.get('/contactos/exportar', requirePermission('contactos:leer'), (req, res) => contactos().exportarExcel(req, res));
  r.get('/contactos/importar', requirePermission('contactos:crear'), (req, res) => contactos().importarView(req, res));
  r.post('/contactos/importar', requirePermission('contactos:crear'), uploadExcel, (req, res) =>
    contactos().importarPost(req, res),
  );
  r.get('/contactos/:id/editar', requirePermission('contactos:editar'), (req, res) => contactos().editar(req, res));
  r.post('/contactos/:id', requirePermission('contactos:editar'), (req, res) => contactos().actualizarPost(req, res));
  r.post('/contactos/:id/archivar', requirePermission('contactos:eliminar'), (req, res) => contactos().archivarPost(req, res));

  // ── Cotizaciones ───────────────────────────────────────────────────────────
  const leerCot = requirePermission('cotizaciones:leer');
  r.get('/cotizaciones', leerCot, (req, res) => cotizaciones().listar(req, res));
  r.get('/cotizaciones/calculadora', requirePermission('cotizaciones:crear'), (req, res) => cotizaciones().calculadoraForm(req, res));
  r.post('/cotizaciones/calcular', requirePermission('cotizaciones:crear'), (req, res) => cotizaciones().calcularPost(req, res));
  r.get('/cotizaciones/nueva', requirePermission('cotizaciones:crear'), (req, res) => cotizaciones().nuevo(req, res));
  r.post('/cotizaciones', requirePermission('cotizaciones:crear'), (req, res) => cotizaciones().crearPost(req, res));
  r.get('/cotizaciones/:id', leerCot, (req, res) => cotizaciones().ver(req, res));
  r.get('/cotizaciones/:id/imprimir', leerCot, (req, res) => cotizaciones().imprimir(req, res));
  r.get('/cotizaciones/:id/editar', requirePermission('cotizaciones:editar'), (req, res) => cotizaciones().editar(req, res));
  r.post('/cotizaciones/:id/estado', requirePermission('cotizaciones:editar'), (req, res) => cotizaciones().cambiarEstadoPost(req, res));
  r.post('/cotizaciones/:id/enviar', requirePermission('cotizaciones:editar'), (req, res) => cotizaciones().enviarPost(req, res));
  r.post('/cotizaciones/:id/crear-ticket', requirePermission('tickets:crear'), (req, res) => cotizaciones().crearTicketPost(req, res));
  r.post('/cotizaciones/:id', requirePermission('cotizaciones:editar'), (req, res) => cotizaciones().actualizarPost(req, res));

  // ── Versiones de sistemas ──────────────────────────────────────────────────
  r.get('/versiones', requirePermission('versiones:leer'), (req, res) => versiones().listar(req, res));
  r.get('/versiones/avisos', requirePermission('versiones:editar'), (req, res) => versiones().avisosView(req, res));
  r.post('/versiones/avisos', requirePermission('versiones:editar'), (req, res) => versiones().avisosPost(req, res));
  r.get('/versiones/nueva', requirePermission('versiones:editar'), (req, res) => versiones().nuevo(req, res));
  r.post('/versiones', requirePermission('versiones:editar'), (req, res) => versiones().guardarPost(req, res));
  r.get('/versiones/:id/editar', requirePermission('versiones:editar'), (req, res) => versiones().editar(req, res));
  r.post('/versiones/:id', requirePermission('versiones:editar'), (req, res) => versiones().guardarPost(req, res));
  r.post('/versiones/:id/eliminar', requirePermission('versiones:editar'), (req, res) => versiones().eliminarPost(req, res));

  // ── Base de conocimiento ───────────────────────────────────────────────────
  r.get('/kb', requirePermission('kb:leer'), (req, res) => kb().gestionar(req, res));
  r.get('/kb/nuevo', requirePermission('kb:escribir'), (req, res) => kb().nuevo(req, res));
  r.post('/kb', requirePermission('kb:escribir'), (req, res) => kb().guardarPost(req, res));
  r.get('/kb/:id/editar', requirePermission('kb:escribir'), (req, res) => kb().editar(req, res));
  r.post('/kb/:id/eliminar', requirePermission('kb:publicar'), (req, res) => kb().eliminarPost(req, res));
  r.post('/kb/:id', requirePermission('kb:escribir'), (req, res) => kb().guardarPost(req, res));
  r.get('/kb/:idOrSlug', requirePermission('kb:leer'), (req, res) => kb().ver(req, res));

  // ── Seguimiento comercial ──────────────────────────────────────────────────
  r.get('/tareas', requirePermission('seguimiento:leer'), (req, res) => seguimiento().tareas(req, res));
  r.post('/tareas', requirePermission('seguimiento:gestionar'), (req, res) => seguimiento().crearTareaPost(req, res));
  r.post('/tareas/:id/marcar', requirePermission('seguimiento:gestionar'), (req, res) => seguimiento().marcarTareaPost(req, res));
  r.post('/interacciones', requirePermission('seguimiento:gestionar'), (req, res) => seguimiento().crearInteraccionPost(req, res));

  // ── Eventos ────────────────────────────────────────────────────────────────
  r.get('/eventos', requirePermission('eventos:leer'), (req, res) => eventos().listar(req, res));
  r.get('/eventos/nuevo', requirePermission('eventos:gestionar'), (req, res) => eventos().nuevo(req, res));
  r.post('/eventos', requirePermission('eventos:gestionar'), (req, res) => eventos().guardarPost(req, res));
  r.get('/eventos/:id', requirePermission('eventos:leer'), (req, res) => eventos().ver(req, res));
  r.get('/eventos/:id/editar', requirePermission('eventos:gestionar'), (req, res) => eventos().editar(req, res));
  r.post('/eventos/:id', requirePermission('eventos:gestionar'), (req, res) => eventos().guardarPost(req, res));
  r.post('/eventos/:id/inscritos/:insId/marcar', requirePermission('eventos:gestionar'), (req, res) => eventos().marcarInscripcionPost(req, res));
  r.post('/eventos/:id/inscritos/:insId/reenviar', requirePermission('eventos:gestionar'), (req, res) => eventos().reenviarPost(req, res));
  r.post('/eventos/:id/lista-negra', requirePermission('eventos:gestionar'), (req, res) => eventos().listaNegraAgregarPost(req, res));
  r.post('/eventos/:id/lista-negra/quitar', requirePermission('eventos:gestionar'), (req, res) => eventos().listaNegraQuitarPost(req, res));

  // ── Papelera ───────────────────────────────────────────────────────────────
  r.get('/papelera', requirePermission('papelera:gestionar'), (req, res) => papelera().ver(req, res));
  r.post('/papelera/restaurar', requirePermission('papelera:gestionar'), (req, res) =>
    papelera().restaurarPost(req, res),
  );
  r.post('/papelera/eliminar', requirePermission('papelera:gestionar'), (req, res) =>
    papelera().eliminarPost(req, res),
  );
  r.post('/papelera/vaciar', requirePermission('papelera:gestionar'), (req, res) =>
    papelera().vaciarPost(req, res),
  );

  // ── Bitácora ───────────────────────────────────────────────────────────────
  r.get('/bitacora', requirePermission('bitacora:leer'), (req, res) => bitacora().listar(req, res));
  r.get('/bitacora/export.csv', requirePermission('bitacora:leer'), (req, res) =>
    bitacora().exportarCsv(req, res),
  );
  r.post('/bitacora/limpiar', requirePermission('bitacora:gestionar'), (req, res) =>
    bitacora().limpiar(req, res),
  );

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
  r.get('/configuracion/integraciones', requirePermission('configuracion:integraciones'), (req, res) =>
    configuracion().integracionesView(req, res),
  );
  r.post('/configuracion/integraciones', requirePermission('configuracion:integraciones'), (req, res) =>
    configuracion().integracionesPost(req, res),
  );
  r.post(
    '/configuracion/integraciones/probar-webhook',
    requirePermission('configuracion:integraciones'),
    (req, res) => configuracion().probarWebhookPost(req, res),
  );
  r.post(
    '/configuracion/integraciones/probar-whatsapp',
    requirePermission('configuracion:integraciones'),
    (req, res) => configuracion().probarWhatsappPost(req, res),
  );
  r.get('/configuracion/backup', requirePermission('configuracion:integraciones'), (req, res) =>
    configuracion().backupView(req, res),
  );
  r.get('/configuracion/backup/descargar', requirePermission('configuracion:integraciones'), (req, res) =>
    configuracion().backupDescargar(req, res),
  );
  r.post('/configuracion/backup/restaurar', requirePermission('configuracion:integraciones'), (req, res) =>
    configuracion().backupRestaurarPost(req, res),
  );

  return r;
}
