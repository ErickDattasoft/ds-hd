/**
 * Recorridos por rol que `capture-screenshots.ts` reproduce contra la app dockerizada
 * (con `npm run seed:roles` + `npm run seed:demo` ya corridos) para ilustrar los manuales.
 * Cada paso genera `docs/manual/screenshots/<modulo>-<paso>.png`, referenciable desde
 * `docs/manual/_sources/<modulo>.md` como `![](../screenshots/<modulo>-<paso>.png)`.
 */
export interface FlowStep {
  /** Slug del módulo (coincide con el nombre de archivo en `_sources/`, sin extensión). */
  modulo: string;
  /** Sufijo del paso dentro del módulo (p. ej. "lista", "detalle"). */
  paso: string;
  ruta: string;
  /** Espera opcional a que aparezca un selector antes de capturar (contenido async/htmx). */
  esperarSelector?: string;
}

export interface Flow {
  rol: 'admin' | 'agente' | 'cliente';
  email: string;
  password: string;
  pasos: FlowStep[];
}

export const FLOWS: Flow[] = [
  {
    rol: 'admin',
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@dattasoft.mx',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'admin12345',
    pasos: [
      { modulo: 'dashboard', paso: 'panel', ruta: '/app' },
      { modulo: 'tickets', paso: 'lista', ruta: '/app/tickets' },
      { modulo: 'tickets', paso: 'tablero', ruta: '/app/tickets/tablero' },
      { modulo: 'tickets', paso: 'carga-agentes', ruta: '/app/tickets/carga-agentes' },
      { modulo: 'empresas-contactos', paso: 'empresas', ruta: '/app/empresas' },
      { modulo: 'empresas-contactos', paso: 'contactos', ruta: '/app/contactos' },
      { modulo: 'cotizaciones', paso: 'lista', ruta: '/app/cotizaciones' },
      { modulo: 'cotizaciones', paso: 'calculadora', ruta: '/app/cotizaciones/calculadora' },
      { modulo: 'versiones-sistemas', paso: 'lista', ruta: '/app/versiones' },
      { modulo: 'base-conocimiento', paso: 'staff', ruta: '/app/kb' },
      { modulo: 'seguimiento-comercial', paso: 'tareas', ruta: '/app/tareas' },
      { modulo: 'papelera', paso: 'lista', ruta: '/app/papelera' },
      { modulo: 'bitacora', paso: 'lista', ruta: '/app/bitacora' },
      { modulo: 'eventos-staff', paso: 'lista', ruta: '/app/eventos' },
      { modulo: 'usuarios-y-permisos', paso: 'lista', ruta: '/app/usuarios' },
      { modulo: 'configuracion', paso: 'tickets', ruta: '/app/configuracion/tickets' },
    ],
  },
  {
    rol: 'agente',
    email: 'ana@dattasoft.mx',
    password: 'agente12345',
    pasos: [{ modulo: 'tickets', paso: 'mis-asignados', ruta: '/app/tickets/mis-asignados' }],
  },
  {
    rol: 'cliente',
    email: 'cliente@dattasoft.mx',
    password: 'cliente12345',
    pasos: [
      { modulo: 'portal-tickets', paso: 'dashboard', ruta: '/portal' },
      { modulo: 'portal-tickets', paso: 'lista', ruta: '/portal/tickets' },
      { modulo: 'portal-tickets', paso: 'nuevo', ruta: '/portal/tickets/nuevo' },
      { modulo: 'portal-perfil', paso: 'ver', ruta: '/portal/perfil' },
      { modulo: 'base-conocimiento', paso: 'portal', ruta: '/portal/kb' },
    ],
  },
];

/** Capturas públicas: no requieren sesión. */
export const FLUJO_PUBLICO: FlowStep[] = [
  { modulo: 'login-y-acceso', paso: 'login', ruta: '/login' },
  { modulo: 'ticket-publico', paso: 'form', ruta: '/ticket-publico' },
  { modulo: 'eventos-publico', paso: 'lista', ruta: '/eventos' },
];
