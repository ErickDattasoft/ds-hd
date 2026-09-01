import type { IKnowledgeRepository, ListarKBFiltro } from '../../core/ports/repositories/IKnowledgeRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { ArticuloKB, type VisibilidadKB } from '../../core/entities/ArticuloKB.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

export interface DatosArticulo {
  titulo: string;
  categoria?: string;
  cuerpoMarkdown: string;
  tags?: string[];
  publicado?: boolean;
  visibilidad?: VisibilidadKB;
}

type Contexto = { esStaff: boolean; esCliente: boolean; anonimo: boolean };

/** Base de conocimiento: gestión (staff) y consulta (staff / portal / público). */
export class KnowledgeService {
  constructor(
    private readonly repo: IKnowledgeRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly bitacora: BitacoraService,
  ) {}

  /** Lista visible para un contexto dado (aplica publicado + visibilidad). */
  async listarVisibles(ctx: Contexto, filtro: ListarKBFiltro = {}): Promise<ArticuloKB[]> {
    const todos = await this.repo.list(ctx.esStaff ? filtro : { ...filtro, publicado: true });
    return todos.filter((a) => a.visiblePara(ctx));
  }

  async verVisible(ctx: Contexto, idOSlug: string): Promise<ArticuloKB> {
    const articulo =
      (await this.repo.findById(idOSlug)) ?? (await this.repo.findBySlug(idOSlug));
    if (!articulo || !articulo.visiblePara(ctx)) throw new NotFoundError('Artículo', idOSlug);
    return articulo;
  }

  async obtenerParaEditar(actor: SessionUser, id: string): Promise<ArticuloKB> {
    if (!actor.permisos.includes('kb:escribir')) throw new ForbiddenError('No puedes editar la base de conocimiento');
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundError('Artículo', id);
    return a;
  }

  async guardar(actor: SessionUser, datos: DatosArticulo, id?: string): Promise<ArticuloKB> {
    if (!actor.permisos.includes('kb:escribir')) throw new ForbiddenError('No puedes editar la base de conocimiento');
    if (datos.publicado && !actor.permisos.includes('kb:publicar')) {
      throw new ForbiddenError('No tienes permiso para publicar artículos');
    }
    const previo = id ? await this.repo.findById(id) : null;
    if (id && !previo) throw new NotFoundError('Artículo', id);

    const ahora = this.clock.now();
    const articulo = new ArticuloKB({
      id: id ?? this.ids.newId(),
      titulo: datos.titulo,
      categoria: datos.categoria ?? null,
      cuerpoMarkdown: datos.cuerpoMarkdown,
      tags: datos.tags ?? [],
      publicado: datos.publicado ?? previo?.publicado ?? false,
      visibilidad: datos.visibilidad ?? previo?.visibilidad ?? 'staff',
      autorUid: previo?.autorUid ?? actor.uid,
      autorNombre: previo?.autorNombre ?? actor.nombre,
      createdAt: previo?.createdAt ?? ahora,
      updatedAt: ahora,
    });
    await this.repo.save(articulo);
    await this.bitacora.registrar({
      actor,
      accion: id ? 'editar' : 'crear',
      modulo: 'kb',
      entidadTipo: 'ArticuloKB',
      entidadId: articulo.id,
      resumen: `${articulo.publicado ? 'Publicado' : 'Borrador'}: ${articulo.titulo}`,
    });
    return articulo;
  }

  async eliminar(actor: SessionUser, id: string): Promise<void> {
    if (!actor.permisos.includes('kb:publicar')) throw new ForbiddenError('No puedes eliminar artículos');
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundError('Artículo', id);
    await this.repo.eliminar(id);
    await this.bitacora.registrar({
      actor,
      accion: 'eliminar',
      modulo: 'kb',
      entidadTipo: 'ArticuloKB',
      entidadId: id,
      resumen: `Eliminado: ${a.titulo}`,
    });
  }
}
