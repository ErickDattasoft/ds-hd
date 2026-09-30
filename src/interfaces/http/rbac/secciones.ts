import type { Rol } from '../../../core/entities/value-objects/Rol.js';
import type { Permiso } from './permissions.js';
import { permisosDeRol } from './roles.js';

/**
 * «👁️ Secciones visibles» por usuario, como en el CRM viejo: cada sección se controla con su
 * permiso de lectura. Desmarcar una sección = revocar ese permiso (desaparece del menú y sus
 * rutas responden 403). Es un atajo sobre «Permisos avanzados».
 */
export const SECCIONES_VISIBLES: readonly { permiso: Permiso; etiqueta: string }[] = [
  { permiso: 'empresas:leer', etiqueta: '🏢 Empresas' },
  { permiso: 'contactos:leer', etiqueta: '👥 Contactos' },
  { permiso: 'cotizaciones:leer', etiqueta: '📄 Cotizaciones y embudo' },
  { permiso: 'tickets:leer', etiqueta: '🎫 Tickets' },
  { permiso: 'eventos:leer', etiqueta: '📅 Eventos' },
  { permiso: 'versiones:leer', etiqueta: '🧩 Versiones' },
  { permiso: 'kb:leer', etiqueta: '📚 Base de conocimiento' },
  { permiso: 'seguimiento:leer', etiqueta: '✅ Tareas' },
  { permiso: 'configuracion:catalogos', etiqueta: '⚙️ Configuración' },
];

/** Secciones que los roles del usuario (o sus extras) le dan — las únicas que tiene sentido ocultar. */
export function seccionesConfigurables(
  roles: readonly Rol[],
  extras: readonly string[] = [],
): { permiso: Permiso; etiqueta: string }[] {
  if (roles.includes('admin')) return [];
  const base = new Set<string>(extras);
  for (const r of roles) for (const p of permisosDeRol(r)) base.add(p);
  return SECCIONES_VISIBLES.filter((s) => base.has(s.permiso));
}

/**
 * Revocados finales: los de «Permisos avanzados» más/menos lo que diga el bloque de secciones.
 * Solo se tocan las secciones que el formulario mostró (`configurables`).
 */
export function revocadosConSecciones(
  revocados: readonly string[],
  configurables: readonly string[],
  visibles: readonly string[],
): string[] {
  const conf = new Set(configurables);
  const vis = new Set(visibles);
  return [
    ...new Set([
      ...revocados.filter((p) => !conf.has(p)),
      ...configurables.filter((p) => !vis.has(p)),
    ]),
  ];
}
