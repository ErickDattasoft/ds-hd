import type {
  IEventoRepository,
  IInscripcionRepository,
  IListaNegraRepository,
} from '../../core/ports/repositories/IEventoRepository.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ICaptchaVerifier } from '../../core/ports/services/ICaptchaVerifier.js';
import {
  Evento,
  type EstadoEvento,
  type InvitacionEmpresa,
  type InvitadoExterno,
} from '../../core/entities/Evento.js';
import type { EntradaListaNegra, EstadoInscripcion, Inscripcion } from '../../core/entities/Inscripcion.js';
import { Email } from '../../core/entities/value-objects/Email.js';
import { esCorreoDesechable } from '../../core/entities/value-objects/dominiosDesechables.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Datos editables de un evento (alta o edición, uso staff). */
export interface DatosEvento {
  titulo: string;
  descripcion?: string;
  fechaHora: string;
  cupo?: number;
  urlWebinar?: string;
  horasRecordatorio?: number;
  limiteRegistrosPorIp?: number | null;
  estado?: EstadoEvento;
}

/** Datos del formulario público de registro a un evento/webinar. */
export interface RegistroPublicoInput {
  eventoId: string;
  nombre: string;
  email: string;
  telefono?: string;
  empresa?: string;
  captchaToken?: string;
  ip?: string;
}

/** Eventos/webinars: gestión (staff), registro público, lista negra. */
export class EventoService {
  constructor(
    private readonly eventos: IEventoRepository,
    private readonly inscripciones: IInscripcionRepository,
    private readonly listaNegra: IListaNegraRepository,
    private readonly empresas: IEmpresaRepository,
    private readonly captcha: ICaptchaVerifier,
    private readonly email: IEmailSender,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly logger: ILogger,
    private readonly bitacora: BitacoraService,
    private readonly baseUrl: string,
  ) {}

  // ── Consulta ─────────────────────────────────────────────────────────────
  listar(soloPublicados = false): Promise<Evento[]> {
    return this.eventos.list(soloPublicados);
  }

  async obtener(id: string): Promise<Evento> {
    const e = await this.eventos.findById(id);
    if (!e) throw new NotFoundError('Evento', id);
    return e;
  }

  async detalleConInscritos(id: string): Promise<{ evento: Evento; inscritos: Inscripcion[] }> {
    const [evento, inscritos] = await Promise.all([this.obtener(id), this.inscripciones.listPorEvento(id)]);
    return { evento, inscritos };
  }

  // ── Gestión (staff) ─────────────────────────────────────────────────────
  async guardar(actor: SessionUser, datos: DatosEvento, id?: string): Promise<Evento> {
    if (!actor.permisos.includes('eventos:gestionar')) throw new ForbiddenError('No puedes gestionar eventos');
    const previo = id ? await this.eventos.findById(id) : null;
    if (id && !previo) throw new NotFoundError('Evento', id);
    if (!datos.fechaHora) throw new ValidationError('Indica la fecha y hora', { fechaHora: 'Requerida' });

    const evento = new Evento({
      id: id ?? this.ids.newId(),
      titulo: datos.titulo,
      descripcion: datos.descripcion ?? null,
      fechaHora: new Date(datos.fechaHora),
      cupo: datos.cupo ?? previo?.cupo ?? 0,
      estado: datos.estado ?? previo?.estado ?? 'borrador',
      urlWebinar: datos.urlWebinar ?? previo?.urlWebinar ?? null,
      horasRecordatorio: datos.horasRecordatorio ?? previo?.horasRecordatorio ?? 24,
      limiteRegistrosPorIp:
        datos.limiteRegistrosPorIp !== undefined
          ? datos.limiteRegistrosPorIp
          : (previo?.limiteRegistrosPorIp ?? null),
      // La edición del evento (título/fecha/…) no toca la invitación dirigida: se conserva.
      invitaciones: previo?.invitaciones ?? [],
      invitadosExternos: previo?.invitadosExternos ?? [],
      creadoPorUid: previo?.creadoPorUid ?? actor.uid,
      createdAt: previo?.createdAt ?? this.clock.now(),
      updatedAt: this.clock.now(),
    });
    await this.eventos.save(evento);
    await this.bitacora.registrar({
      actor,
      accion: id ? 'editar' : 'crear',
      modulo: 'eventos',
      entidadTipo: 'Evento',
      entidadId: evento.id,
      resumen: `${evento.estado}: ${evento.titulo}`,
    });
    return evento;
  }

  async marcarInscripcion(
    actor: SessionUser,
    eventoId: string,
    inscripcionId: string,
    estado: EstadoInscripcion,
  ): Promise<void> {
    if (!actor.permisos.includes('eventos:gestionar')) throw new ForbiddenError('No puedes gestionar eventos');
    const inscritos = await this.inscripciones.listPorEvento(eventoId);
    const inscripcion = inscritos.find((i) => i.id === inscripcionId);
    if (!inscripcion) throw new NotFoundError('Inscripción', inscripcionId);
    inscripcion.estado = estado;
    await this.inscripciones.save(inscripcion);
  }

  async reenviarConfirmacion(actor: SessionUser, eventoId: string, inscripcionId: string): Promise<void> {
    if (!actor.permisos.includes('eventos:gestionar')) throw new ForbiddenError('No puedes gestionar eventos');
    const [evento, inscritos] = await Promise.all([
      this.obtener(eventoId),
      this.inscripciones.listPorEvento(eventoId),
    ]);
    const inscripcion = inscritos.find((i) => i.id === inscripcionId);
    if (!inscripcion) throw new NotFoundError('Inscripción', inscripcionId);
    await this.enviarConfirmacion(evento, inscripcion);
  }

  // ── Invitación dirigida a empresas ─────────────────────────────────────
  /** Nombres de empresas activas de la cartera, para el autocompletado del panel. */
  async empresasParaInvitar(): Promise<{ nombre: string; sistemas: string[] }[]> {
    const empresas = await this.empresas.list({ activa: true });
    return empresas
      .map((e) => ({ nombre: e.nombre, sistemas: e.sistemasContratados }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  /**
   * Historial cruzado: por cada empresa invitada al evento dado, en cuántos OTROS eventos
   * participó y a cuántos asistió (respuesta `asistira`). Sirve para no reinvitar de más.
   */
  async historialEmpresas(eventoId: string): Promise<Record<string, { eventos: number; asistio: number }>> {
    const [evento, todos] = await Promise.all([this.obtener(eventoId), this.eventos.list()]);
    const objetivo = new Set(evento.invitaciones.map((i) => i.empresaNombre.toLowerCase()));
    const acc: Record<string, { eventos: number; asistio: number }> = {};
    for (const otro of todos) {
      if (otro.id === eventoId) continue;
      for (const inv of otro.invitaciones) {
        const clave = inv.empresaNombre.toLowerCase();
        if (!objetivo.has(clave)) continue;
        acc[clave] ??= { eventos: 0, asistio: 0 };
        acc[clave].eventos++;
        if (inv.respuesta === 'asistira') acc[clave].asistio++;
      }
    }
    return acc;
  }

  async agregarEmpresaInvitada(
    actor: SessionUser,
    eventoId: string,
    datos: { empresaNombre: string; invitadoPor?: string },
  ): Promise<InvitacionEmpresa> {
    const evento = await this.paraGestion(actor, eventoId);
    const nombre = datos.empresaNombre.trim();
    const enCartera = (await this.empresas.list({ activa: true })).find(
      (e) => e.nombre.toLowerCase() === nombre.toLowerCase(),
    );
    const inv = evento.agregarEmpresaInvitada({
      id: this.ids.newId(),
      empresaId: enCartera?.id ?? null,
      empresaNombre: enCartera?.nombre ?? nombre,
      sistemas: enCartera?.sistemasContratados ?? [],
      invitadoPor: datos.invitadoPor?.trim() || actor.nombre,
    });
    await this.persistirPanel(actor, evento, `Invitó a «${inv.empresaNombre}»`);
    return inv;
  }

  async actualizarEmpresaInvitada(
    actor: SessionUser,
    eventoId: string,
    invId: string,
    cambios: Partial<Pick<InvitacionEmpresa, 'invitadoPor' | 'contactado' | 'respuesta' | 'notas'>>,
  ): Promise<void> {
    const evento = await this.paraGestion(actor, eventoId);
    evento.actualizarEmpresaInvitada(invId, cambios);
    await this.persistirPanel(actor, evento);
  }

  async quitarEmpresaInvitada(actor: SessionUser, eventoId: string, invId: string): Promise<void> {
    const evento = await this.paraGestion(actor, eventoId);
    evento.quitarEmpresaInvitada(invId);
    await this.persistirPanel(actor, evento);
  }

  async agregarInvitadoExterno(
    actor: SessionUser,
    eventoId: string,
    datos: { nombre?: string; fuente?: string },
  ): Promise<InvitadoExterno> {
    const evento = await this.paraGestion(actor, eventoId);
    const ext = evento.agregarInvitadoExterno({ id: this.ids.newId(), nombre: datos.nombre, fuente: datos.fuente });
    await this.persistirPanel(actor, evento);
    return ext;
  }

  async actualizarInvitadoExterno(
    actor: SessionUser,
    eventoId: string,
    extId: string,
    cambios: Partial<Pick<InvitadoExterno, 'nombre' | 'fuente' | 'contactado' | 'respuesta' | 'notas'>>,
  ): Promise<void> {
    const evento = await this.paraGestion(actor, eventoId);
    evento.actualizarInvitadoExterno(extId, cambios);
    await this.persistirPanel(actor, evento);
  }

  async quitarInvitadoExterno(actor: SessionUser, eventoId: string, extId: string): Promise<void> {
    const evento = await this.paraGestion(actor, eventoId);
    evento.quitarInvitadoExterno(extId);
    await this.persistirPanel(actor, evento);
  }

  private async paraGestion(actor: SessionUser, eventoId: string): Promise<Evento> {
    if (!actor.permisos.includes('eventos:gestionar')) throw new ForbiddenError('No puedes gestionar eventos');
    return this.obtener(eventoId);
  }

  private async persistirPanel(actor: SessionUser, evento: Evento, resumen?: string): Promise<void> {
    evento.updatedAt = this.clock.now();
    await this.eventos.save(evento);
    if (resumen) {
      await this.bitacora.registrar({
        actor,
        accion: 'editar',
        modulo: 'eventos',
        entidadTipo: 'Evento',
        entidadId: evento.id,
        resumen: `${evento.titulo}: ${resumen}`,
      });
    }
  }

  // ── Lista negra ─────────────────────────────────────────────────────────
  listaNegraTodos(): Promise<EntradaListaNegra[]> {
    return this.listaNegra.list();
  }

  async agregarListaNegra(actor: SessionUser, email: string, motivo?: string): Promise<void> {
    if (!actor.permisos.includes('eventos:gestionar')) throw new ForbiddenError('No puedes gestionar eventos');
    const e = Email.create(email);
    await this.listaNegra.agregar({ email: e.value, motivo: motivo?.trim() || null, createdAt: this.clock.now() });
    await this.bitacora.registrar({
      actor,
      accion: 'agregar',
      modulo: 'eventos',
      entidadTipo: 'ListaNegra',
      entidadId: e.value,
      resumen: `Lista negra: ${e.value}`,
    });
  }

  async quitarListaNegra(actor: SessionUser, email: string): Promise<void> {
    if (!actor.permisos.includes('eventos:gestionar')) throw new ForbiddenError('No puedes gestionar eventos');
    await this.listaNegra.quitar(email.trim().toLowerCase());
  }

  // ── Registro público ───────────────────────────────────────────────────
  async registrarPublico(input: RegistroPublicoInput): Promise<Inscripcion> {
    const evento = await this.obtener(input.eventoId);
    if (!evento.abiertoARegistro) {
      throw new ValidationError('El registro para este evento no está disponible');
    }
    if (!(await this.captcha.verificar(input.captchaToken, input.ip))) {
      throw new ValidationError('No pudimos verificar que no eres un robot. Recarga e inténtalo de nuevo.');
    }

    const correo = Email.create(input.email);
    const nombre = input.nombre.trim();
    if (nombre.length < 2) throw new ValidationError('Escribe tu nombre', { nombre: 'Requerido' });

    if (await this.listaNegra.contiene(correo.value)) {
      this.logger.info('Registro bloqueado por lista negra', { email: correo.value });
      throw new ValidationError('No fue posible completar tu registro. Contacta a soporte.');
    }
    if (await this.inscripciones.findByEmail(evento.id, correo.value)) {
      throw new ConflictError('Ya estás registrado en este evento con ese correo');
    }
    if (evento.cupo > 0 && (await this.inscripciones.contar(evento.id)) >= evento.cupo) {
      throw new ValidationError('El evento ya alcanzó su cupo máximo');
    }

    const ip = input.ip?.trim() || null;
    if (ip && (await this.inscripciones.contarPorIp(evento.id, ip)) >= evento.limiteIpEfectivo) {
      this.logger.info('Registro bloqueado por límite de IP', { evento: evento.id, ip });
      throw new ValidationError(
        'Se alcanzó el límite de registros permitidos desde esta conexión para este evento. Si necesitas inscribir a varias personas, contáctanos directamente.',
      );
    }

    const inscripcion: Inscripcion = {
      id: this.ids.newId(),
      eventoId: evento.id,
      nombre,
      email: correo.value,
      telefono: input.telefono?.trim() || null,
      empresa: input.empresa?.trim() || null,
      estado: 'registrado',
      origen: 'publico',
      correoEstado: 'pendiente',
      recordatoriosEnviados: [],
      ip,
      correoSospechoso: esCorreoDesechable(correo.value),
      createdAt: this.clock.now(),
    };
    await this.inscripciones.create(inscripcion);
    await this.enviarConfirmacion(evento, inscripcion);
    this.logger.info('Inscripción a evento', { evento: evento.id, email: correo.value });
    return inscripcion;
  }

  // ── Webhook de Brevo (entregado / rebotado) ────────────────────────────
  async procesarWebhookBrevo(payload: {
    event?: string;
    email?: string;
    tag?: string;
    tags?: string[];
  }): Promise<{ actualizada: boolean }> {
    const tags = [payload.tag, ...(payload.tags ?? [])].filter((t): t is string => Boolean(t));
    const tagInsc = tags.find((t) => t.startsWith('insc_'));
    if (!tagInsc) return { actualizada: false };

    const inscripcion = await this.inscripciones.findGlobal(tagInsc.slice('insc_'.length));
    if (!inscripcion) return { actualizada: false };

    const estado =
      payload.event === 'delivered'
        ? 'entregado'
        : payload.event === 'hard_bounce' || payload.event === 'soft_bounce' || payload.event === 'blocked'
          ? 'rebotado'
          : null;
    if (!estado) return { actualizada: false };

    inscripcion.correoEstado = estado;
    await this.inscripciones.save(inscripcion);
    this.logger.info('Webhook Brevo aplicado a inscripción', { id: inscripcion.id, estado });
    return { actualizada: true };
  }

  // ── Recordatorios (cron) ───────────────────────────────────────────────
  async enviarRecordatorios(): Promise<{ eventos: number; correos: number }> {
    const ahora = this.clock.now();
    const eventos = await this.eventos.proximos(ahora, new Date(ahora.getTime() + 48 * 3_600_000));
    let correos = 0;
    for (const evento of eventos) {
      const disparo = new Date(evento.fechaHora.getTime() - evento.horasRecordatorio * 3_600_000);
      if (disparo.getTime() > ahora.getTime()) continue; // aún no toca
      const inscritos = await this.inscripciones.listPorEvento(evento.id);
      for (const ins of inscritos) {
        if (ins.recordatoriosEnviados.includes('previo') || ins.estado === 'no_asistio') continue;
        await this.email.enviar({
          para: [{ email: ins.email, nombre: ins.nombre }],
          asunto: `Recordatorio: ${evento.titulo}`,
          html: `<p>Hola ${ins.nombre}, te recordamos el evento <strong>${evento.titulo}</strong> el ${evento.fechaHora.toLocaleString('es-MX')}.</p>${
            evento.urlWebinar ? `<p><a href="${evento.urlWebinar}">Enlace para conectarte</a></p>` : ''
          }`,
          tags: ['evento-recordatorio', `evento-${evento.id}`, `insc_${ins.id}`],
        });
        ins.recordatoriosEnviados.push('previo');
        await this.inscripciones.save(ins);
        correos++;
      }
    }
    this.logger.info('Recordatorios de eventos enviados', { eventos: eventos.length, correos });
    return { eventos: eventos.length, correos };
  }

  private async enviarConfirmacion(evento: Evento, ins: Inscripcion): Promise<void> {
    await this.email.enviar({
      para: [{ email: ins.email, nombre: ins.nombre }],
      asunto: `Registro confirmado: ${evento.titulo}`,
      html: `<p>Hola ${ins.nombre}, tu registro para <strong>${evento.titulo}</strong> (${evento.fechaHora.toLocaleString('es-MX')}) quedó confirmado.</p>
             <p>Detalles: ${this.baseUrl}/eventos/${evento.id}</p>`,
      tags: ['evento-confirmacion', `evento-${evento.id}`, `insc_${ins.id}`],
    });
  }
}
