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

  return r;
}
