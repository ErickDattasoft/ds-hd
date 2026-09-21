import { Router } from 'express';
import type { Container } from '../../../config/container.js';

/** Rutas públicas: login, logout, solicitud de acceso, aceptación de invitaciones. */
export function publicRoutes(container: Container): Router {
  const r = Router();
  const ctrl = () => container.resolve('authController');

  r.get('/login', (req, res) => ctrl().mostrarLogin(req, res));
  r.post('/login', (req, res) => ctrl().procesarLogin(req, res));
  r.get('/login/verificacion', (req, res) => ctrl().mostrarVerificacion(req, res));
  r.post('/login/verificacion', (req, res) => ctrl().procesarVerificacion(req, res));
  r.post('/logout', (req, res) => ctrl().logout(req, res));
  r.get('/logout', (req, res) => ctrl().logout(req, res));

  r.get('/solicitar-acceso', (req, res) => ctrl().mostrarSolicitud(req, res));
  r.post('/solicitar-acceso', (req, res) => ctrl().procesarSolicitud(req, res));

  r.get('/invitacion/:token', (req, res) => ctrl().mostrarInvitacion(req, res));
  r.post('/invitacion/:token', (req, res) => ctrl().procesarInvitacion(req, res));

  const ticketPublico = () => container.resolve('ticketPublicoController');
  r.get('/ticket-publico', (req, res) => ticketPublico().form(req, res));
  r.post('/ticket-publico', (req, res) => ticketPublico().crearPost(req, res));

  const encuesta = () => container.resolve('encuestaController');
  r.get('/encuesta/:id/:firma', (req, res) => encuesta().ver(req, res));
  r.post('/encuesta/:id/:firma', (req, res) => encuesta().guardarPost(req, res));

  const kb = () => container.resolve('knowledgeController');
  r.get('/kb', (req, res) => kb().listar(req, res));
  r.get('/kb/comparar', (req, res) => kb().comparar(req, res));
  r.get('/kb/:idOrSlug', (req, res) => kb().ver(req, res));

  const eventos = () => container.resolve('eventoPublicoController');
  r.get('/eventos', (req, res) => eventos().listar(req, res));
  r.get('/eventos/:id', (req, res) => eventos().detalle(req, res));
  r.get('/eventos/:id/flayer', (req, res) => eventos().flayerGet(req, res));
  r.post('/eventos/:id', (req, res) => eventos().registrarPost(req, res));
  r.post('/eventos/:id/reenviar-link', (req, res) => eventos().reenviarLinkPost(req, res));

  // Sin sesión: lo consumen los correos salientes, las vistas de impresión y el portal.
  const configuracion = () => container.resolve('configuracionController');
  r.get('/logo', (req, res) => configuracion().logoArchivoGet(req, res));

  // Imagen de un ticket para los correos (los programas de correo no muestran `data:` URI).
  // Como `/adjunto` del CRM viejo: solo imágenes, por id aleatorio, sin listar ni buscar nada.
  r.get('/adjunto/:id', async (req, res) => {
    const id = String(req.params.id ?? '');
    const adj = /^[A-Za-z0-9_-]{15,64}$/.test(id) ? await container.resolve('adjuntoTicketRepo').obtener(id) : null;
    const m = adj ? /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/s.exec(adj.data) : null;
    if (!m) return void res.status(404).type('text/plain').send('No encontrado');
    res.setHeader('Content-Type', m[1]!);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(m[2]!, 'base64'));
  });

  return r;
}
