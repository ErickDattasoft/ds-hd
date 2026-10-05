import type { Rol } from '../../../core/entities/value-objects/Rol.js';
import type { Permiso } from './permissions.js';
import { permisosDeRol } from './roles.js';

/** Niveles de cada casilla del panel de permisos. */
export type NivelApartado = 'ver' | 'editar' | 'todos';

/**
 * Un apartado del panel «🔐 Permisos por apartado» (como el panel de usuarios del CRM viejo):
 * cada casilla prende o apaga un grupo de permisos. `todos` solo existe en Tickets (ver los de
 * todo el equipo, no solo los suyos).
 */
export interface ApartadoPermisos {
  id: string;
  etiqueta: string;
  niveles: Partial<Record<NivelApartado, readonly Permiso[]>>;
}

export const NIVEL_ETIQUETA: Record<NivelApartado, string> = {
  ver: 'Ver',
  editar: 'Editar',
  todos: 'Todos',
};

/** Los apartados del menú, en su orden. La base de conocimiento NO va: la controla su propietario. */
export const APARTADOS: readonly ApartadoPermisos[] = [
  {
    id: 'tickets',
    etiqueta: '🎫 Tickets',
    niveles: {
      ver: ['tickets:leer', 'tickets:ver_notas_internas'],
      editar: ['tickets:crear', 'tickets:editar', 'tickets:asignar', 'tickets:cambiar_estado'],
      todos: ['tickets:leer_todos'],
    },
  },
  { id: 'empresas', etiqueta: '🏢 Empresas', niveles: { ver: ['empresas:leer'], editar: ['empresas:crear', 'empresas:editar'] } },
  { id: 'contactos', etiqueta: '👥 Contactos', niveles: { ver: ['contactos:leer'], editar: ['contactos:crear', 'contactos:editar'] } },
  {
    id: 'cotizaciones',
    etiqueta: '📄 Cotizaciones',
    niveles: { ver: ['cotizaciones:leer'], editar: ['cotizaciones:crear', 'cotizaciones:editar'] },
  },
  { id: 'versiones', etiqueta: '🧩 Versiones', niveles: { ver: ['versiones:leer'], editar: ['versiones:editar'] } },
  { id: 'eventos', etiqueta: '📅 Eventos', niveles: { ver: ['eventos:leer'], editar: ['eventos:gestionar'] } },
  { id: 'tareas', etiqueta: '✅ Tareas', niveles: { ver: ['seguimiento:leer'], editar: ['seguimiento:gestionar'] } },
  { id: 'bitacora', etiqueta: '📓 Bitácora', niveles: { ver: ['bitacora:leer'] } },
  { id: 'configuracion', etiqueta: '⚙️ Configuración', niveles: { ver: ['configuracion:catalogos'] } },
];

/** ¿El usuario tiene TODO el grupo de permisos de la casilla? */
export function casillaMarcada(efectivos: readonly string[], permisos: readonly Permiso[]): boolean {
  return permisos.every((p) => efectivos.includes(p));
}

/** Lo mínimo del usuario que hace falta para recalcular sus overrides. */
export interface OverridesUsuario {
  roles: readonly Rol[];
  permisosExtra: readonly string[];
  permisosRevocados: readonly string[];
}

/**
 * Aplica cambios de casillas a los overrides de un usuario. Dar = quitar de revocados y, si su
 * rol no lo trae, agregar a extras; quitar = al revés. Lo que no se tocó se queda igual.
 * Coherencia: Editar o Todos sin Ver no sirve → si se quitó Ver, se quitan también; si se dio
 * Editar/Todos, se da Ver.
 */
export function aplicarCasillas(
  usuario: OverridesUsuario,
  efectivos: readonly string[],
  cambios: ReadonlyMap<string, Partial<Record<NivelApartado, boolean>>>,
): { permisosExtra: string[]; permisosRevocados: string[] } {
  const base = new Set<string>();
  for (const r of usuario.roles) for (const p of permisosDeRol(r)) base.add(p);
  const extras = new Set(usuario.permisosExtra);
  const revocados = new Set(usuario.permisosRevocados);
  const poner = (permisos: readonly Permiso[], dar: boolean) => {
    for (const p of permisos) {
      if (dar) {
        revocados.delete(p);
        if (!base.has(p)) extras.add(p);
      } else {
        extras.delete(p);
        if (base.has(p)) revocados.add(p);
      }
    }
  };

  for (const ap of APARTADOS) {
    const c = cambios.get(ap.id);
    if (!c) continue;
    const estado = (n: NivelApartado): boolean | undefined => {
      const permisos = ap.niveles[n];
      if (!permisos) return undefined;
      return c[n] ?? casillaMarcada(efectivos, permisos);
    };
    let ver = estado('ver');
    let editar = estado('editar');
    let todos = estado('todos');
    if (ver === false && c.ver === false) {
      editar = editar === undefined ? undefined : false;
      todos = todos === undefined ? undefined : false;
    } else if (editar || todos) {
      ver = true;
    }
    const finales: Partial<Record<NivelApartado, boolean | undefined>> = { ver, editar, todos };
    for (const n of ['ver', 'editar', 'todos'] as const) {
      const permisos = ap.niveles[n];
      const valor = finales[n];
      if (!permisos || valor === undefined) continue;
      // Solo se escribe si cambió respecto a lo que tiene, para no ensuciar overrides.
      if (valor !== casillaMarcada(efectivos, permisos)) poner(permisos, valor);
    }
  }
  return { permisosExtra: [...extras], permisosRevocados: [...revocados] };
}
