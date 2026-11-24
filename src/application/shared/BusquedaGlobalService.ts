import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { IKnowledgeRepository } from '../../core/ports/repositories/IKnowledgeRepository.js';
import type { SessionUser } from './SessionUser.js';
import {
  coincideTexto,
  fragmentoKB,
  relevanciaKB,
  type ArticuloKB,
  type FragmentoKB,
} from '../../core/entities/ArticuloKB.js';

const LIMITE_POR_TIPO = 5;
const LIMITE_KB = 8;
/** La KB solo cambia al reindexar: se guarda un rato en memoria para que cada letra tecleada en
 * Ctrl+K no vuelva a leer toda la colección de Firestore (cada artículo = 1 lectura). */
const KB_CACHE_MS = 10 * 60_000;

/** Un resultado de la búsqueda global, ya listo para pintar (título + enlace). */
export interface ResultadoBusqueda {
  tipo: 'empresa' | 'contacto' | 'ticket' | 'kb';
  etiquetaTipo: string;
  titulo: string;
  subtitulo: string;
  href: string;
  /** Solo KB: el pedazo del contenido donde apareció lo buscado. */
  fragmento?: FragmentoKB | null;
  /** Solo KB: vista rápida para leer el artículo dentro de la misma ventana de Ctrl+K. */
  vista?: string;
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

  private kbCache: { at: number; articulos: Promise<ArticuloKB[]> } | null = null;

  private articulosKB(): Promise<ArticuloKB[]> {
    const ahora = Date.now();
    if (!this.kbCache || ahora - this.kbCache.at > KB_CACHE_MS) {
      const articulos = this.kb.list();
      this.kbCache = { at: ahora, articulos };
      // Si falla, no se queda guardado el error.
      articulos.catch(() => {
        if (this.kbCache?.articulos === articulos) this.kbCache = null;
      });
    }
    return this.kbCache.articulos;
  }

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

    // kb:leer ya viene filtrado por persona (solo el propietario y a quien él marcó en
    // Configuración de la KB, ver aplicarAccesoKB); con él se ve toda la KB.
    if (user.permisos.includes('kb:leer')) {
      tareas.push(
        this.articulosKB().then((todos) =>
          todos
            .filter((a) => coincideTexto(a, texto, false))
            .sort(
              (a, b) =>
                relevanciaKB(b, texto) - relevanciaKB(a, texto) ||
                b.updatedAt.getTime() - a.updatedAt.getTime(),
            )
            .slice(0, LIMITE_KB)
            .map((a) => ({
              tipo: 'kb' as const,
              etiquetaTipo: a.esScript ? '⚡ Script' : '📚 KB',
              titulo: a.titulo,
              subtitulo: a.subcarpeta || a.categoria || '',
              href: `/app/kb/${a.id}`,
              vista: `/app/buscar/kb/${a.id}`,
              fragmento: fragmentoKB(a, texto, 50),
            })),
        ),
      );
    }

    const resultados = await Promise.all(tareas);
    return resultados.flat();
  }
}
