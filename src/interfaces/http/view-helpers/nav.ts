import type { SessionUser } from '../../../application/shared/SessionUser.js';
import type { Permiso } from '../rbac/permissions.js';

export interface NavItem {
  etiqueta: string;
  href: string;
  icono: string;
  /** Permiso necesario para ver el item. Si falta, no se renderiza. */
  permiso: Permiso;
}

/** Navegación del back-office (`/app`). El orden es el de aparición en el menú. */
export const NAV_BACKOFFICE: readonly NavItem[] = [
  { etiqueta: 'Dashboard', href: '/app', icono: '📊', permiso: 'dashboard:ver' },
  { etiqueta: 'Tickets', href: '/app/tickets', icono: '🎫', permiso: 'tickets:leer' },
  { etiqueta: 'Empresas', href: '/app/empresas', icono: '🏢', permiso: 'empresas:leer' },
  { etiqueta: 'Contactos', href: '/app/contactos', icono: '👥', permiso: 'contactos:leer' },
  { etiqueta: 'Cotizaciones', href: '/app/cotizaciones', icono: '📄', permiso: 'cotizaciones:leer' },
  { etiqueta: 'Versiones', href: '/app/versiones', icono: '🧩', permiso: 'versiones:leer' },
  { etiqueta: 'Eventos', href: '/app/eventos', icono: '📅', permiso: 'eventos:leer' },
  { etiqueta: 'Base de conocimiento', href: '/app/kb', icono: '📚', permiso: 'kb:leer' },
  { etiqueta: 'Tareas', href: '/app/tareas', icono: '✅', permiso: 'seguimiento:leer' },
  { etiqueta: 'Papelera', href: '/app/papelera', icono: '🗑️', permiso: 'papelera:gestionar' },
  { etiqueta: 'Bitácora', href: '/app/bitacora', icono: '📓', permiso: 'bitacora:leer' },
  { etiqueta: 'Usuarios', href: '/app/usuarios', icono: '🔑', permiso: 'usuarios:gestionar' },
  { etiqueta: 'Configuración', href: '/app/configuracion', icono: '⚙️', permiso: 'configuracion:catalogos' },
];

/** Navegación del portal de clientes (`/portal`). */
export const NAV_PORTAL: readonly NavItem[] = [
  { etiqueta: 'Mis tickets', href: '/portal/tickets', icono: '🎫', permiso: 'portal:tickets' },
  { etiqueta: 'Base de conocimiento', href: '/portal/kb', icono: '📚', permiso: 'portal:tickets' },
  { etiqueta: 'Mi perfil', href: '/portal/perfil', icono: '👤', permiso: 'portal:perfil' },
];

/** Filtra la navegación al conjunto que el usuario puede ver. */
export function construirNav(user: SessionUser): NavItem[] {
  const fuente = user.esCliente ? NAV_PORTAL : NAV_BACKOFFICE;
  return fuente.filter((item) => user.permisos.includes(item.permiso));
}
