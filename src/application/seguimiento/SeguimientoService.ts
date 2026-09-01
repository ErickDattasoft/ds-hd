import type {
  IInteraccionRepository,
  ITareaRepository,
  ListarTareasFiltro,
} from '../../core/ports/repositories/ISeguimientoRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { Interaccion, type TipoInteraccion } from '../../core/entities/Interaccion.js';
import { Tarea } from '../../core/entities/Tarea.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Seguimiento comercial: interacciones (log) y tareas (asignables, con vencimiento). */
export class SeguimientoService {
  constructor(
    private readonly interacciones: IInteraccionRepository,
    private readonly tareas: ITareaRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly bitacora: BitacoraService,
  ) {}

  // ── Interacciones ────────────────────────────────────────────────────────
  interaccionesDe(empresaId: string): Promise<Interaccion[]> {
    return this.interacciones.listPorEmpresa(empresaId);
  }

  async registrarInteraccion(input: {
    actor: SessionUser;
    empresaId: string;
    contactoId?: string;
    tipo: TipoInteraccion;
    fecha: string;
    resumen: string;
  }): Promise<void> {
    if (!input.actor.esStaff) throw new ForbiddenError('Solo el staff registra interacciones');
    const interaccion = new Interaccion({
      id: this.ids.newId(),
      empresaId: input.empresaId,
      contactoId: input.contactoId ?? null,
      tipo: input.tipo,
      fecha: input.fecha ? new Date(input.fecha + 'T12:00:00') : this.clock.now(),
      resumen: input.resumen,
      creadoPorUid: input.actor.uid,
      creadoPorNombre: input.actor.nombre,
      createdAt: this.clock.now(),
    });
    await this.interacciones.create(interaccion);
    await this.bitacora.registrar({
      actor: input.actor,
      accion: 'crear',
      modulo: 'interacciones',
      entidadTipo: 'Interaccion',
      entidadId: interaccion.id,
      resumen: `${input.tipo} con empresa ${input.empresaId}`,
    });
  }

  // ── Tareas ───────────────────────────────────────────────────────────────
  listarTareas(filtro?: ListarTareasFiltro): Promise<Tarea[]> {
    return this.tareas.list(filtro);
  }

  async crearTarea(input: {
    actor: SessionUser;
    titulo: string;
    descripcion?: string;
    empresaId?: string;
    ticketId?: string;
    asignadoAUid: string;
    asignadoANombre?: string;
    vence?: string;
  }): Promise<Tarea> {
    if (!input.actor.esStaff) throw new ForbiddenError('Solo el staff gestiona tareas');
    const ahora = this.clock.now();
    const tarea = new Tarea({
      id: this.ids.newId(),
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      empresaId: input.empresaId ?? null,
      ticketId: input.ticketId ?? null,
      asignadoAUid: input.asignadoAUid || input.actor.uid,
      asignadoANombre: input.asignadoANombre ?? null,
      vence: input.vence ?? null,
      creadoPorUid: input.actor.uid,
      createdAt: ahora,
    });
    await this.tareas.save(tarea);
    await this.bitacora.registrar({
      actor: input.actor,
      accion: 'crear',
      modulo: 'tareas',
      entidadTipo: 'Tarea',
      entidadId: tarea.id,
      resumen: `Tarea: ${tarea.titulo}`,
    });
    return tarea;
  }

  async marcarTarea(actor: SessionUser, id: string, completada: boolean): Promise<void> {
    const tarea = await this.tareas.findById(id);
    if (!tarea) throw new NotFoundError('Tarea', id);
    if (!actor.esStaff) throw new ForbiddenError('Solo el staff gestiona tareas');
    tarea.marcar(completada, this.clock.now());
    await this.tareas.save(tarea);
  }
}
