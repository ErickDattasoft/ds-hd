import { Router } from 'express';
import type { Container } from '../../../config/container.js';

/** Rutas públicas: login, logout, solicitud de acceso, aceptación de invitaciones. */
export function publicRoutes(container: Container): Router {
  const r = Router();
  const ctrl = () => container.resolve('authController');

  r.get('/login', (req, res) => ctrl().mostrarLogin(req, res));
  r.post('/login', (req, res) => ctrl().procesarLogin(req, res));
  r.post('/logout', (req, res) => ctrl().logout(req, res));
  r.get('/logout', (req, res) => ctrl().logout(req, res));

  r.get('/solicitar-acceso', (req, res) => ctrl().mostrarSolicitud(req, res));
  r.post('/solicitar-acceso', (req, res) => ctrl().procesarSolicitud(req, res));

  r.get('/invitacion/:token', (req, res) => ctrl().mostrarInvitacion(req, res));
  r.post('/invitacion/:token', (req, res) => ctrl().procesarInvitacion(req, res));

  const ticketPublico = () => container.resolve('ticketPublicoController');
  r.get('/ticket-publico', (req, res) => ticketPublico().form(req, res));
  r.post('/ticket-publico', (req, res) => ticketPublico().crearPost(req, res));

  const kb = () => container.resolve('knowledgeController');
  r.get('/kb', (req, res) => kb().listar(req, res));
  r.get('/kb/:idOrSlug', (req, res) => kb().ver(req, res));

  const eventos = () => container.resolve('eventoPublicoController');
  r.get('/eventos', (req, res) => eventos().listar(req, res));
  r.get('/eventos/:id', (req, res) => eventos().detalle(req, res));
  r.post('/eventos/:id', (req, res) => eventos().registrarPost(req, res));

  return r;
}
