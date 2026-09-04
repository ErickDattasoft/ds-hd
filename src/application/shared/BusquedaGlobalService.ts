import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { IKnowledgeRepository } from '../../core/ports/repositories/IKnowledgeRepository.js';
import type { SessionUser } from './SessionUser.js';

const LIMITE_POR_TIPO = 5;

/** Un resultado de la búsqueda global, ya listo para pintar (título + enlace). */
export interface ResultadoBusqueda {
  tipo: 'empresa' | 'contacto' | 'ticket' | 'kb';
  etiquetaTipo: string;
  titulo: string;
  subtitulo: string;
  href: string;
}

/** Búsqueda global (Ctrl+K): empresas, contactos, tickets y KB, acotada a lo que el usuario
 * puede ver — nunca busca en un módulo para el que no tiene permiso de lectura. */
export class BusquedaGlobalService {
  constructor(
    private readonly empresas: IEmpresaRepository,
    private readonly contactos: IContactoRepository,
    private readonly tickets: ITicketQueries,
    private readonly kb: IKnowledgeRepository,
  ) {}

  async buscar(user: SessionUser, textoCrudo: string): Promise<ResultadoBusqueda[]> {
    const texto = textoCrudo.trim();
    if (texto.length < 2) return [];

    const tareas: Promise<ResultadoBusqueda[]>[] = [];

    if (user.permisos.includes('empresas:leer')) {
      tareas.push(
        this.empresas
          .list({ texto, activa: true })
          .then((rows) =>
            rows.slice(0, LIMITE_POR_TIPO).map((e) => ({
              tipo: 'empresa' as const,
              etiquetaTipo: 'Empresa',
              titulo: e.nombre,
              subtitulo: e.rfc ?? e.email ?? '',
              href: `/app/empresas/${e.id}`,
            })),
          ),
      );
    }

    if (user.permisos.includes('contactos:leer')) {
      tareas.push(
        this.contactos
          .list({ texto, activo: true })
          .then((rows) =>
            rows.slice(0, LIMITE_POR_TIPO).map((c) => ({
              tipo: 'contacto' as const,
              etiquetaTipo: 'Contacto',
              titulo: c.nombre,
              subtitulo: c.email ?? c.telefono ?? '',
              // No a /editar: requiere contactos:editar, que quien busca puede no tener
              // (contactos:leer alcanza para ver el contacto dentro de su empresa).
              href: `/app/empresas/${c.empresaId}`,
            })),
          ),
      );
    }

    if (user.permisos.includes('tickets:leer')) {
      tareas.push(
        this.tickets
          .listar({ texto, archivado: false, limite: LIMITE_POR_TIPO })
          .then((rows) =>
            rows.map((t) => ({
              tipo: 'ticket' as const,
              etiquetaTipo: 'Ticket',
              titulo: `#${t.numero} — ${t.asunto}`,
              subtitulo: t.empresaNombre ?? t.estado,
              href: `/app/tickets/${t.id}`,
            })),
          ),
      );
    }

    if (user.permisos.includes('kb:leer')) {
      tareas.push(
        this.kb
          .list({ texto })
          .then((rows) =>
            rows.slice(0, LIMITE_POR_TIPO).map((a) => ({
              tipo: 'kb' as const,
              etiquetaTipo: 'Base de conocimiento',
              titulo: a.titulo,
              subtitulo: a.categoria ?? '',
              // /editar requiere kb:escribir; /app/kb/:idOrSlug solo pide kb:leer, que es lo
              // que ya se validó para incluir este resultado.
              href: `/app/kb/${a.slug || a.id}`,
            })),
          ),
      );
    }

    const resultados = await Promise.all(tareas);
    return resultados.flat();
  }
}
