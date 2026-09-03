import type { SessionUser } from '../../../application/shared/SessionUser.js';
import type { Permiso } from '../rbac/permissions.js';

/** Secciones de la barra lateral. El orden es el de aparición. */
export type NavGrupo = 'principal' | 'soporte' | 'comercial' | 'admin';

export const NAV_GRUPO_ETIQUETA: Record<NavGrupo, string> = {
  principal: 'Principal',
  soporte: 'Soporte',
  comercial: 'Comercial',
  admin: 'Administración',
};

const ORDEN_GRUPOS: readonly NavGrupo[] = ['principal', 'soporte', 'comercial', 'admin'];

export interface NavItem {
  etiqueta: string;
  href: string;
  icono: string;
  /** Permiso necesario para ver el item. Si falta, no se renderiza. */
  permiso: Permiso;
  /** Sección de la barra lateral en la que aparece. */
  grupo: NavGrupo;
}

/** Un grupo de navegación con al menos un item visible para el usuario. */
export interface NavSeccion {
  grupo: NavGrupo;
  etiqueta: string;
  items: NavItem[];
}

/** Navegación del back-office (`/app`). El orden es el de aparición en el menú. */
export const NAV_BACKOFFICE: readonly NavItem[] = [
  { etiqueta: 'Dashboard', href: '/app', icono: '📊', permiso: 'dashboard:ver', grupo: 'principal' },
  { etiqueta: 'Base de conocimiento', href: '/app/kb', icono: '📚', permiso: 'kb:leer', grupo: 'principal' },
  { etiqueta: 'Versiones', href: '/app/versiones', icono: '🧩', permiso: 'versiones:leer', grupo: 'principal' },
  { etiqueta: 'Eventos', href: '/app/eventos', icono: '📅', permiso: 'eventos:leer', grupo: 'principal' },

  { etiqueta: 'Tickets', href: '/app/tickets', icono: '🎫', permiso: 'tickets:leer', grupo: 'soporte' },

  { etiqueta: 'Empresas', href: '/app/empresas', icono: '🏢', permiso: 'empresas:leer', grupo: 'comercial' },
  { etiqueta: 'Contactos', href: '/app/contactos', icono: '👥', permiso: 'contactos:leer', grupo: 'comercial' },
  { etiqueta: 'Cotizaciones', href: '/app/cotizaciones', icono: '📄', permiso: 'cotizaciones:leer', grupo: 'comercial' },
  { etiqueta: 'Tareas', href: '/app/tareas', icono: '✅', permiso: 'seguimiento:leer', grupo: 'comercial' },

  { etiqueta: 'Usuarios', href: '/app/usuarios', icono: '🔑', permiso: 'usuarios:gestionar', grupo: 'admin' },
  { etiqueta: 'Configuración', href: '/app/configuracion', icono: '⚙️', permiso: 'configuracion:catalogos', grupo: 'admin' },
  { etiqueta: 'Bitácora', href: '/app/bitacora', icono: '📓', permiso: 'bitacora:leer', grupo: 'admin' },
  { etiqueta: 'Papelera', href: '/app/papelera', icono: '🗑️', permiso: 'papelera:gestionar', grupo: 'admin' },
];

/** Navegación del portal de clientes (`/portal`). */
export const NAV_PORTAL: readonly NavItem[] = [
  { etiqueta: 'Mis tickets', href: '/portal/tickets', icono: '🎫', permiso: 'portal:tickets', grupo: 'principal' },
  { etiqueta: 'Base de conocimiento', href: '/portal/kb', icono: '📚', permiso: 'portal:tickets', grupo: 'principal' },
  { etiqueta: 'Mi perfil', href: '/portal/perfil', icono: '👤', permiso: 'portal:perfil', grupo: 'principal' },
];

/** Filtra la navegación al conjunto que el usuario puede ver (lista plana). */
export function construirNav(user: SessionUser): NavItem[] {
  const fuente = user.esCliente ? NAV_PORTAL : NAV_BACKOFFICE;
  return fuente.filter((item) => user.permisos.includes(item.permiso));
}

/**
 * La navegación agrupada por sección, saltando las secciones que quedarían vacías.
 * Así un usuario `soporte` solo ve "Principal" + "Soporte" y uno `ventas` ve "Comercial".
 */
export function construirNavSecciones(user: SessionUser): NavSeccion[] {
  const items = construirNav(user);
  return ORDEN_GRUPOS.map((grupo) => ({
    grupo,
    etiqueta: NAV_GRUPO_ETIQUETA[grupo],
    items: items.filter((i) => i.grupo === grupo),
  })).filter((s) => s.items.length > 0);
}
