import type {
  IEventoRepository,
  IInscripcionRepository,
  IListaNegraRepository,
} from '../../core/ports/repositories/IEventoRepository.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ICaptchaVerifier } from '../../core/ports/services/ICaptchaVerifier.js';
import type { IExcelIO } from '../../core/ports/services/IExcelIO.js';
import {
  Evento,
  ESTILO_EVENTO_INFO,
  resolverComodinesEvento,
  resolverPlantillaEvento,
  PLANTILLA_EVENTO_DEFAULT,
  PLANTILLA_PRESENCIAL_DEFAULT,
  type EstadoEvento,
  type EventoFlayer,
  type RespuestaRsvp,
  type CambiosDestinatario,
  type DatosRsvp,
  type TipoEvento,
  type EstiloEvento,
  itinerarioDeTexto,
  type InvitacionEmpresa,
  type InvitadoExterno,
} from '../../core/entities/Evento.js';
import type { EntradaListaNegra, EstadoInscripcion, Inscripcion } from '../../core/entities/Inscripcion.js';
import { Email } from '../../core/entities/value-objects/Email.js';
import { esCorreoDesechable } from '../../core/entities/value-objects/dominiosDesechables.js';
import { esTelefonoPlausible } from '../../core/entities/value-objects/Telefono.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { ZONA_MEXICO, instanteDeDatetimeLocal } from '../../core/entities/value-objects/horaMexico.js';

/** Datos editables de un evento (alta o edición, uso staff). */
export interface DatosEvento {
  titulo: string;
  tipo?: TipoEvento;
  estilo?: EstiloEvento;
  lugarNombre?: string;
  lugarDireccion?: string;
  lugarMapsUrl?: string;
  vestimenta?: string;
  /** Un renglón por actividad: «3:00 PM - Recepción». */
  itinerario?: string;
  maxPersonasRegistro?: number;
  descripcion?: string;
  fechaHora: string;
  cupo?: number;
  urlWebinar?: string;
  horasRecordatorio?: number;
  limiteRegistrosPorIp?: number | null;
  estado?: EstadoEvento;
  sistema?: string;
  contactoNombre?: string;
  contactoWhatsapp?: string;
  plantilla?: string;
  mensajeSeguimiento?: string;
  horasSeguimiento?: number | null;
}

/** Campos de un inscrito que el staff puede corregir a mano desde el detalle del evento. */
export interface CambiosInscripcion {
  nombre?: string;
  empresa?: string;
  email?: string;
  telefono?: string;
  contactadoWsp?: boolean;
  asistioReal?: boolean;
}

/** Datos del formulario público de registro a un evento/webinar. */
export interface RegistroPublicoInput {
  eventoId: string;
  nombre: string;
  email: string;
  telefono?: string;
  empresa?: string;
  /** "Sí" / "No" / "Tal vez". */
  asistira?: string;
  /** Cuántos van con este registro (solo si el evento permite más de 1). */
  personas?: number;
  /** Solo tiene sentido si el evento tiene `sistema`. */
  usaSistema?: string;
  fuente?: string;
  deseaCanalWhatsapp?: boolean;
  captchaToken?: string;
  ip?: string;
}

/** Si la plantilla es idéntica a una de las de fábrica, no se guarda: así un evento creado con
 *  el texto de webinar que luego pasa a presencial usa el texto de presencial (y viceversa). */
function plantillaPropia(texto: string | null): string | null {
  const t = (texto ?? '').replace(/\r\n/g, '\n').trim();
  if (!t || t === PLANTILLA_EVENTO_DEFAULT.trim() || t === PLANTILLA_PRESENCIAL_DEFAULT.trim()) return null;
  return t;
}

/** Personas de un registro público: solo cuenta si dijo que sí va y el evento deja anotar a más. */
function personasRegistro(max: number, input: { asistira?: string; personas?: number }): number | null {
  if (max <= 1 || (input.asistira ?? '').trim().toLowerCase() === 'no') return null;
  const n = Math.trunc(Number(input.personas ?? 1));
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > max) {
    throw new ValidationError(`Puedes registrar hasta ${max} personas`, { personas: `Máximo ${max}` });
  }
  return n;
}

/** Máximo de invitaciones por correo en un solo clic (presupuesto por petición del Worker). */
const ENVIOS_POR_LOTE = 25;

/** Eventos/webinars: gestión (staff), registro público, lista negra. */
export class EventoService {
  constructor(
    private readonly eventos: IEventoRepository,
    private readonly inscripciones: IInscripcionRepository,
    private readonly listaNegra: IListaNegraRepository,
    private readonly empresas: IEmpresaRepository,
    private readonly captcha: ICaptchaVerifier,
    private readonly email: IEmailSender,
    private readonly excel: IExcelIO,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly logger: ILogger,
    private readonly bitacora: BitacoraService,
    private readonly baseUrl: string,
    /** En producción, sin Turnstile configurado el registro público se rechaza. */
    private readonly exigirCaptcha: boolean = false,
    /** Para tomar el contacto principal (correo/celular) al invitar una empresa de la cartera. */
    private readonly contactos?: IContactoRepository,
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
      tipo: datos.tipo ?? previo?.tipo ?? 'webinar',
      estilo: datos.estilo ?? previo?.estilo ?? null,
      lugarNombre: datos.lugarNombre ?? previo?.lugarNombre ?? null,
      lugarDireccion: datos.lugarDireccion ?? previo?.lugarDireccion ?? null,
      lugarMapsUrl: datos.lugarMapsUrl ?? previo?.lugarMapsUrl ?? null,
      vestimenta: datos.vestimenta ?? previo?.vestimenta ?? null,
      itinerario: datos.itinerario !== undefined ? itinerarioDeTexto(datos.itinerario) : (previo?.itinerario ?? []),
      maxPersonasRegistro: datos.maxPersonasRegistro ?? previo?.maxPersonasRegistro ?? 1,
      descripcion: datos.descripcion ?? null,
      fechaHora: instanteDeDatetimeLocal(datos.fechaHora),
      cupo: datos.cupo ?? previo?.cupo ?? 0,
      estado: datos.estado ?? previo?.estado ?? 'borrador',
      urlWebinar: datos.urlWebinar ?? previo?.urlWebinar ?? null,
      horasRecordatorio: datos.horasRecordatorio ?? previo?.horasRecordatorio ?? 24,
      limiteRegistrosPorIp:
        datos.limiteRegistrosPorIp !== undefined
          ? datos.limiteRegistrosPorIp
          : (previo?.limiteRegistrosPorIp ?? null),
      // La edición del evento (título/fecha/…) no toca la invitación dirigida ni el flayer: se conservan.
      invitaciones: previo?.invitaciones ?? [],
      invitadosExternos: previo?.invitadosExternos ?? [],
      flayer: previo?.flayer ?? null,
      sistema: datos.sistema ?? previo?.sistema ?? null,
      contactoNombre: datos.contactoNombre ?? previo?.contactoNombre ?? null,
      contactoWhatsapp: datos.contactoWhatsapp ?? previo?.contactoWhatsapp ?? null,
      plantilla: plantillaPropia(datos.plantilla ?? previo?.plantilla ?? null),
      mensajeSeguimiento: datos.mensajeSeguimiento ?? previo?.mensajeSeguimiento ?? null,
      horasSeguimiento:
        datos.horasSeguimiento !== undefined ? datos.horasSeguimiento : (previo?.horasSeguimiento ?? null),
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

  /** Borra el evento y todas sus inscripciones. Permanente. */
  async eliminar(actor: SessionUser, id: string): Promise<void> {
    const evento = await this.paraGestion(actor, id);
    await this.inscripciones.eliminarPorEvento(id);
    await this.eventos.eliminar(id);
    await this.bitacora.registrar({
      actor,
      accion: 'eliminar',
      modulo: 'eventos',
      entidadTipo: 'Evento',
      entidadId: id,
      resumen: `Evento eliminado: ${evento.titulo}`,
    });
    this.logger.info('Evento eliminado', { id, por: actor.uid });
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

  /**
   * Corrige a mano los datos de un inscrito (el registro público los captura el propio
   * interesado y a veces vienen con erratas), y las dos marcas de seguimiento del staff:
   * `contactadoWsp` y `asistioReal`. Solo se tocan los campos presentes en `cambios`.
   */
  async actualizarInscripcion(
    actor: SessionUser,
    eventoId: string,
    inscripcionId: string,
    cambios: CambiosInscripcion,
  ): Promise<void> {
    if (!actor.permisos.includes('eventos:gestionar')) throw new ForbiddenError('No puedes gestionar eventos');
    const inscritos = await this.inscripciones.listPorEvento(eventoId);
    const inscripcion = inscritos.find((i) => i.id === inscripcionId);
    if (!inscripcion) throw new NotFoundError('Inscripción', inscripcionId);

    if (cambios.email !== undefined) {
      const nuevo = Email.create(cambios.email);
      if (
        nuevo.value !== inscripcion.email &&
        inscritos.some((i) => i.id !== inscripcionId && i.email === nuevo.value)
      ) {
        throw new ConflictError('Ya hay otro inscrito en este evento con ese correo');
      }
      // El correo cambió: el semáforo de entrega del anterior ya no dice nada del nuevo.
      if (nuevo.value !== inscripcion.email) {
        inscripcion.correoEstado = 'pendiente';
        inscripcion.correoSospechoso = esCorreoDesechable(nuevo.value);
      }
      inscripcion.email = nuevo.value;
    }
    if (cambios.nombre !== undefined) {
      const nombre = cambios.nombre.trim();
      if (nombre.length < 2) throw new ValidationError('El nombre no puede quedar vacío', { nombre: 'Requerido' });
      inscripcion.nombre = nombre;
    }
    if (cambios.empresa !== undefined) inscripcion.empresa = cambios.empresa.trim() || null;
    if (cambios.telefono !== undefined) inscripcion.telefono = cambios.telefono.trim() || null;
    if (cambios.contactadoWsp !== undefined) inscripcion.contactadoWsp = cambios.contactadoWsp;
    if (cambios.asistioReal !== undefined) inscripcion.asistioReal = cambios.asistioReal;

    await this.inscripciones.save(inscripcion);
  }

  /** Marca como ya contactado por WhatsApp — lo usa el botón 💬 al abrir wa.me. */
  async marcarContactadoWsp(actor: SessionUser, eventoId: string, inscripcionId: string): Promise<void> {
    await this.actualizarInscripcion(actor, eventoId, inscripcionId, { contactadoWsp: true });
  }

  async eliminarInscripcion(actor: SessionUser, eventoId: string, inscripcionId: string): Promise<void> {
    if (!actor.permisos.includes('eventos:gestionar')) throw new ForbiddenError('No puedes gestionar eventos');
    const inscritos = await this.inscripciones.listPorEvento(eventoId);
    const inscripcion = inscritos.find((i) => i.id === inscripcionId);
    if (!inscripcion) throw new NotFoundError('Inscripción', inscripcionId);
    await this.inscripciones.eliminar(eventoId, inscripcionId);
    await this.bitacora.registrar({
      actor,
      accion: 'eliminar',
      modulo: 'eventos',
      entidadTipo: 'Inscripcion',
      entidadId: inscripcionId,
      resumen: `Inscrito eliminado: ${inscripcion.nombre} <${inscripcion.email}>`,
    });
  }

  /**
   * Manda a la lista negra a partir de una inscripción — así queda registrado también su
   * teléfono, no solo el correo, y el 🚫 lo cruza si vuelve a registrarse en otro evento.
   */
  async marcarInscritoEnListaNegra(
    actor: SessionUser,
    eventoId: string,
    inscripcionId: string,
    motivo?: string,
  ): Promise<void> {
    if (!actor.permisos.includes('eventos:gestionar')) throw new ForbiddenError('No puedes gestionar eventos');
    const inscritos = await this.inscripciones.listPorEvento(eventoId);
    const inscripcion = inscritos.find((i) => i.id === inscripcionId);
    if (!inscripcion) throw new NotFoundError('Inscripción', inscripcionId);
    if (!inscripcion.email) {
      throw new ValidationError('Ese inscrito no dejó correo; la lista negra se indexa por correo.');
    }
    await this.agregarListaNegra(actor, inscripcion.email, motivo, inscripcion.telefono ?? undefined);
  }

  /**
   * Por cada persona, si ya asistió de verdad (`asistioReal`) a OTRO evento: el título de ese
   * evento. Indexado por correo y por teléfono, porque puede volver con uno u otro distinto.
   * Sirve para no reinvitar a quien ya fue cuando un webinar se repite.
   */
  async historialAsistencias(eventoIdActual: string): Promise<Record<string, string>> {
    // El cruce es informativo: si la consulta falla, se degrada a "sin historial" en vez de
    // tumbar el detalle del evento.
    const [asistencias, eventos] = await Promise.all([
      this.inscripciones.listAsistenciasReales().catch((err: unknown) => {
        this.logger.warn('No se pudo cruzar el historial de asistencias', { err: String(err) });
        return [];
      }),
      this.eventos.list(),
    ]);
    const titulos = new Map(eventos.map((e) => [e.id, e.titulo]));
    const acc: Record<string, string> = {};
    for (const a of asistencias) {
      if (a.eventoId === eventoIdActual) continue;
      const titulo = titulos.get(a.eventoId) ?? 'otro evento';
      if (a.email) acc[a.email.toLowerCase()] ??= titulo;
      if (a.telefono) acc[a.telefono.trim()] ??= titulo;
    }
    return acc;
  }

  /** Inscritos del evento en `.xlsx` — mismas columnas que exportaba el CRM anterior. */
  async exportarInscritosExcel(actor: SessionUser, eventoId: string): Promise<{ buffer: Buffer; nombre: string }> {
    if (!actor.permisos.includes('eventos:leer')) throw new ForbiddenError('No puedes ver eventos');
    const [evento, inscritos, listaNegra, historial] = await Promise.all([
      this.obtener(eventoId),
      this.inscripciones.listPorEvento(eventoId),
      this.listaNegra.list(),
      this.historialAsistencias(eventoId),
    ]);
    const correosNegra = new Set(listaNegra.map((e) => e.email));
    const telefonosNegra = new Set(listaNegra.map((e) => e.telefono).filter((t): t is string => Boolean(t)));
    const sistema = evento.sistema || 'el sistema';

    const columnas = [
      { header: 'Nombre', key: 'nombre', width: 26 },
      { header: 'Empresa', key: 'empresa', width: 26 },
      { header: 'Correo', key: 'correo', width: 30 },
      { header: 'Estado del correo', key: 'correoEstado', width: 16 },
      { header: 'Correo sospechoso (desechable)', key: 'sospechoso', width: 14 },
      { header: 'Lista negra', key: 'listaNegra', width: 12 },
      { header: 'Ya asistió antes a otro evento', key: 'antes', width: 28 },
      { header: 'Teléfono', key: 'telefono', width: 16 },
      { header: '¿Asistirá?', key: 'asistira', width: 12 },
      { header: 'Personas', key: 'personas', width: 10 },
      { header: 'Asistió (real)', key: 'asistioReal', width: 12 },
      { header: 'Cómo se enteró', key: 'fuente', width: 18 },
      { header: `Usa ${sistema}`, key: 'usaSistema', width: 16 },
      { header: 'Quiere canal WhatsApp', key: 'canalWsp', width: 18 },
      { header: 'Contactado por WhatsApp', key: 'contactadoWsp', width: 18 },
      { header: 'Fecha de registro', key: 'fecha', width: 16 },
    ];
    const si = (v: boolean): string => (v ? 'Sí' : 'No');
    const filas = inscritos.map((i) => ({
      nombre: i.nombre,
      empresa: i.empresa ?? '',
      correo: i.email ?? '',
      correoEstado: i.email ? (i.correoEstado ?? 'pendiente') : 'sin correo',
      sospechoso: si(i.correoSospechoso),
      listaNegra: si(
        Boolean(i.email && correosNegra.has(i.email)) ||
          Boolean(i.telefono && telefonosNegra.has(i.telefono.trim())),
      ),
      antes: (i.email ? historial[i.email.toLowerCase()] : undefined) ?? (i.telefono ? historial[i.telefono.trim()] ?? '' : ''),
      telefono: i.telefono ?? '',
      asistira: i.asistira ?? '',
      personas: String(i.personas ?? 1),
      asistioReal: si(i.asistioReal),
      fuente: i.fuente ?? '',
      usaSistema: i.usaSistema ?? '',
      canalWsp: si(i.deseaCanalWhatsapp),
      contactadoWsp: i.telefono ? si(i.contactadoWsp) : '',
      fecha: i.createdAt.toLocaleDateString('es-MX', { timeZone: ZONA_MEXICO }),
    }));
    const buffer = await this.excel.escribir('Inscritos', columnas, filas);
    const slug = evento.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || eventoId;
    return { buffer, nombre: `inscritos-${slug}.xlsx` };
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
    datos: { empresaNombre: string; invitadoPor?: string; pases?: number } & CambiosDestinatario,
  ): Promise<InvitacionEmpresa> {
    const evento = await this.paraGestion(actor, eventoId);
    const nombre = datos.empresaNombre.trim();
    const enCartera = (await this.empresas.list({ activa: true })).find(
      (e) => e.nombre.toLowerCase() === nombre.toLowerCase(),
    );
    const contacto = enCartera ? await this.contactoParaInvitar(enCartera.id, enCartera.contactoPrincipalId) : null;
    const inv = evento.agregarEmpresaInvitada({
      id: this.ids.newId(),
      empresaId: enCartera?.id ?? null,
      empresaNombre: enCartera?.nombre ?? nombre,
      sistemas: enCartera?.sistemasContratados ?? [],
      invitadoPor: datos.invitadoPor?.trim() || actor.nombre,
      token: this.nuevoTokenInvitacion(),
      pases: datos.pases,
      // Lo que el staff escriba gana; si no, el contacto principal de la empresa.
      paraNombre: datos.paraNombre?.trim() || contacto?.nombre || null,
      correo: datos.correo?.trim() || contacto?.email || null,
      telefono: datos.telefono?.trim() || contacto?.telefono || contacto?.celular || null,
    });
    await this.persistirPanel(actor, evento, `Invitó a «${inv.empresaNombre}»`);
    return inv;
  }

  async actualizarEmpresaInvitada(
    actor: SessionUser,
    eventoId: string,
    invId: string,
    cambios: Partial<Pick<InvitacionEmpresa, 'invitadoPor' | 'contactado' | 'respuesta' | 'notas' | 'pases' | 'personas'>> & CambiosDestinatario,
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
    datos: { nombre?: string; fuente?: string; pases?: number; correo?: string; telefono?: string },
  ): Promise<InvitadoExterno> {
    const evento = await this.paraGestion(actor, eventoId);
    const ext = evento.agregarInvitadoExterno({
      id: this.ids.newId(),
      nombre: datos.nombre,
      fuente: datos.fuente,
      token: this.nuevoTokenInvitacion(),
      pases: datos.pases,
      correo: datos.correo,
      telefono: datos.telefono,
    });
    await this.persistirPanel(actor, evento);
    return ext;
  }

  async actualizarInvitadoExterno(
    actor: SessionUser,
    eventoId: string,
    extId: string,
    cambios: Partial<Pick<InvitadoExterno, 'nombre' | 'fuente' | 'contactado' | 'respuesta' | 'notas' | 'pases' | 'personas'>> & CambiosDestinatario,
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

  // ── Link personal de cada invitado (RSVP) ──────────────────────────────
  /** Clave del link personal: 128 bits al azar, corta para que el link quepa en un WhatsApp. */
  private nuevoTokenInvitacion(): string {
    return this.ids.newToken().slice(0, 22);
  }

  /** Contacto principal de la empresa (o el primero activo con correo) para mandarle la invitación. */
  private async contactoParaInvitar(
    empresaId: string,
    principalId: string | null,
  ): Promise<{ nombre: string; email: string | null; telefono: string | null; celular: string | null } | null> {
    if (!this.contactos) return null;
    try {
      const principal = principalId ? await this.contactos.findById(principalId) : null;
      if (principal?.activo !== false && principal) return principal;
      const todos = (await this.contactos.list({ empresaId, activo: true })).filter((c) => c.email);
      return todos[0] ?? null;
    } catch (err) {
      this.logger.warn('No se pudo leer el contacto de la empresa invitada', { err: String(err), empresaId });
      return null;
    }
  }

  /** Link personal de un invitado (lo que se manda por correo o WhatsApp). */
  linkInvitacion(evento: Evento, inv: Pick<DatosRsvp, 'token'>): string {
    return `${this.baseUrl}/eventos/${evento.id}/i/${inv.token}`;
  }

  /** Texto para mandar la invitación por WhatsApp (corto, con el link personal). */
  mensajeWhatsAppInvitacion(evento: Evento, inv: DatosRsvp & { id: string }, nombre: string): string {
    const cuando =
      evento.tipo === 'felicitacion'
        ? ''
        : `\n📅 ${evento.fechaHora.toLocaleString('es-MX', { timeZone: ZONA_MEXICO, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}`;
    const donde = evento.tipo === 'presencial' && evento.lugarNombre ? `\n📍 ${evento.lugarNombre}` : '';
    const pases = evento.pideConfirmacion ? `\n🎟 ${inv.pases} ${inv.pases === 1 ? 'pase' : 'pases'}` : '';
    const accion = evento.pideConfirmacion ? 'Aquí tu invitación, ¿nos confirmas?' : 'Te dejamos esto:';
    return `¡Hola${nombre ? ` ${nombre}` : ''}! 👋\n${evento.titulo}${cuando}${donde}${pases}\n\n${accion}\n${this.linkInvitacion(evento, inv)}`;
  }

  /** Manda por correo la invitación de UN invitado (empresa o externo). */
  async enviarInvitacion(actor: SessionUser, eventoId: string, invId: string): Promise<void> {
    const evento = await this.paraGestion(actor, eventoId);
    if (evento.estado === 'borrador') {
      throw new ValidationError('Publica el evento antes de mandar invitaciones (está en borrador)');
    }
    evento.asignarTokensFaltantes(() => this.nuevoTokenInvitacion());
    const inv = evento.buscarInvitado(invId);
    if (!inv) throw new NotFoundError('Invitado', invId);
    await this.mandarCorreoInvitacion(evento, inv);
    evento.marcarEnviada(invId, this.clock.now());
    await this.persistirPanel(actor, evento);
  }

  /** Manda la invitación a todos los que tienen correo y aún no se les ha mandado. */
  async enviarInvitacionesPendientes(
    actor: SessionUser,
    eventoId: string,
  ): Promise<{ enviadas: number; fallidas: number; sinCorreo: number; faltan: number }> {
    const evento = await this.paraGestion(actor, eventoId);
    if (evento.estado === 'borrador') {
      throw new ValidationError('Publica el evento antes de mandar invitaciones (está en borrador)');
    }
    evento.asignarTokensFaltantes(() => this.nuevoTokenInvitacion());
    const todos = [...evento.invitaciones, ...evento.invitadosExternos];
    const porMandar = todos.filter((i) => i.correo && !i.enviadaAt && i.respuesta === 'pendiente');
    // Tope por clic: el Worker tiene presupuesto por petición; con más, se vuelve a picar.
    const lote = porMandar.slice(0, ENVIOS_POR_LOTE);
    let enviadas = 0;
    let fallidas = 0;
    for (const inv of lote) {
      try {
        await this.mandarCorreoInvitacion(evento, inv);
        evento.marcarEnviada(inv.id, this.clock.now());
        enviadas++;
      } catch (err) {
        fallidas++;
        this.logger.warn('No se pudo mandar una invitación', { err: String(err), eventoId, invId: inv.id });
      }
    }
    await this.persistirPanel(actor, evento, `invitaciones enviadas por correo: ${enviadas}`);
    return {
      enviadas,
      fallidas,
      sinCorreo: todos.filter((i) => !i.correo && i.respuesta === 'pendiente').length,
      faltan: porMandar.length - lote.length,
    };
  }

  private async mandarCorreoInvitacion(
    evento: Evento,
    inv: (InvitacionEmpresa | InvitadoExterno),
  ): Promise<void> {
    if (!inv.correo) throw new ValidationError('Este invitado no tiene correo; agrégaselo o mándala por WhatsApp');
    const nombre = 'empresaNombre' in inv ? (inv.paraNombre ?? inv.empresaNombre) : inv.nombre || inv.paraNombre || '';
    const link = this.linkInvitacion(evento, inv);
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fecha = evento.fechaHora.toLocaleString('es-MX', {
      timeZone: ZONA_MEXICO,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });
    const renglones = [
      evento.tipo !== 'felicitacion' ? `📅 ${esc(fecha)}` : '',
      evento.tipo === 'presencial' && evento.lugarNombre ? `📍 ${esc(evento.lugarNombre)}` : '',
      evento.pideConfirmacion ? `🎟 ${inv.pases} ${inv.pases === 1 ? 'pase' : 'pases'}` : '',
    ].filter(Boolean);
    const flayer = evento.flayer
      ? `<p><img src="${this.baseUrl}/eventos/${evento.id}/flayer?v=${evento.flayer.tamano}" alt="" style="max-width:100%;border-radius:10px"></p>`
      : '';
    const boton = evento.pideConfirmacion ? 'Ver mi invitación y confirmar' : 'Abrir';
    const est = ESTILO_EVENTO_INFO[evento.estilo];
    const adorno = est.adorno ? `<p style="font-size:22px;letter-spacing:10px;margin:0 0 6px;color:${est.color}">${est.adorno} ${est.adorno} ${est.adorno}</p>` : '';
    await this.email.enviar({
      para: [{ email: inv.correo, nombre: nombre || undefined }],
      asunto: evento.tipo === 'felicitacion' ? evento.titulo : `Invitación: ${evento.titulo}`,
      html: `<div style="font-family:${est.fuente};max-width:560px;margin:auto;text-align:center;background:${est.fondo};color:${est.texto};padding:28px 22px;border-radius:14px;border-top:6px solid ${est.color}">
        <p style="font-size:16px">¡Hola${nombre ? ` ${esc(nombre)}` : ''}! 👋</p>
        ${adorno}
        <h2 style="margin:8px 0 16px;color:${est.color};font-size:26px">${esc(evento.titulo)}</h2>
        ${flayer}
        ${evento.descripcion ? `<p style="white-space:pre-wrap;opacity:.85">${esc(evento.descripcion)}</p>` : ''}
        <p style="font-size:15px;line-height:1.7">${renglones.join('<br>')}</p>
        <p style="margin:24px 0"><a href="${link}" style="background:${est.color};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">${boton}</a></p>
        <p style="opacity:.6;font-size:12px">Si el botón no abre, copia este link: ${link}</p>
      </div>`,
      tags: ['evento-invitacion', `evento-${evento.id}`],
    });
  }

  /** Las invitaciones de antes de esta función no tienen link: se les da al abrir el evento. */
  async asegurarLinksInvitados(evento: Evento): Promise<void> {
    if (evento.asignarTokensFaltantes(() => this.nuevoTokenInvitacion())) {
      await this.eventos.save(evento);
    }
  }

  /** Abre la invitación personal (sin sesión). Registra la primera apertura. */
  async abrirInvitacion(
    eventoId: string,
    token: string,
    /** El equipo revisando la invitación: ve borradores y no cuenta como «abierta». */
    vistaStaff = false,
  ): Promise<{ evento: Evento; nombre: string; inv: InvitacionEmpresa | InvitadoExterno }> {
    const evento = await this.obtener(eventoId);
    const r = evento.buscarPorToken(token);
    if (!r) throw new NotFoundError('Invitación', token);
    if (evento.estado === 'borrador' && !vistaStaff) throw new NotFoundError('Invitación', token);
    if (!vistaStaff && evento.marcarAbierta(token, this.clock.now())) {
      // Solo la primera vez escribe: abrirla cien veces no gasta cuota de Firestore.
      await this.eventos.save(evento).catch((err) =>
        this.logger.warn('No se pudo registrar la apertura de la invitación', { err: String(err), eventoId }),
      );
    }
    return { evento, nombre: r.nombre, inv: r.inv };
  }

  /** El invitado contesta desde su link personal. */
  async responderInvitacion(
    eventoId: string,
    token: string,
    resp: RespuestaRsvp,
  ): Promise<{ evento: Evento; nombre: string; inv: InvitacionEmpresa | InvitadoExterno }> {
    const evento = await this.obtener(eventoId);
    if (evento.estado === 'borrador') throw new NotFoundError('Invitación', token);
    const inv = evento.responderInvitacion(token, resp, this.clock.now());
    evento.updatedAt = this.clock.now();
    await this.eventos.save(evento);
    const nombre = evento.buscarPorToken(token)!.nombre;
    this.logger.info('Invitado contestó su invitación', {
      eventoId,
      asistira: resp.asistira,
      personas: inv.personas,
    });
    return { evento, nombre, inv };
  }

  // ── Flayer (imagen promocional) ─────────────────────────────────────────
  async actualizarFlayer(
    actor: SessionUser,
    eventoId: string,
    input: { contentType: string; base64: string },
  ): Promise<void> {
    const evento = await this.paraGestion(actor, eventoId);
    const base64 = input.base64.replace(/\s/g, '');
    const tamano = Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    const flayer: EventoFlayer = { contentType: input.contentType, tamano, data: `data:${input.contentType};base64,${base64}` };
    evento.actualizarFlayer(flayer);
    await this.persistirPanel(actor, evento, 'flayer actualizado');
  }

  async eliminarFlayer(actor: SessionUser, eventoId: string): Promise<void> {
    const evento = await this.paraGestion(actor, eventoId);
    evento.actualizarFlayer(null);
    await this.persistirPanel(actor, evento, 'flayer eliminado');
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

  async agregarListaNegra(
    actor: SessionUser,
    email: string,
    motivo?: string,
    telefono?: string,
  ): Promise<void> {
    if (!actor.permisos.includes('eventos:gestionar')) throw new ForbiddenError('No puedes gestionar eventos');
    const e = Email.create(email);
    await this.listaNegra.agregar({
      email: e.value,
      telefono: telefono?.trim() || null,
      motivo: motivo?.trim() || null,
      marcadoPor: actor.nombre,
      createdAt: this.clock.now(),
    });
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
    // Falla cerrado, como el CRM anterior: sin verificación anti-bots real no se registra a
    // nadie. En desarrollo (sin TURNSTILE_SECRET) se deja pasar para poder probar el formulario.
    if (!this.captcha.activo) {
      if (this.exigirCaptcha) {
        this.logger.error('Registro a evento rechazado: Turnstile no está configurado en el servidor');
        throw new ValidationError(
          'La verificación anti-bots no está disponible en este momento. Inténtalo más tarde o contáctanos directamente.',
        );
      }
    } else if (!input.captchaToken) {
      throw new ValidationError('Falta la verificación anti-bots: marca la casilla «No soy un robot» y vuelve a intentar.', {
        general: 'Falta la verificación anti-bots: marca la casilla «No soy un robot» y vuelve a intentar.',
        captcha: 'Completa la verificación',
      });
    } else if (!(await this.captcha.verificar(input.captchaToken, input.ip))) {
      throw new ValidationError('No pudimos verificar que eres una persona real. Recarga la página e inténtalo de nuevo.', {
        general: 'No pudimos verificar que eres una persona real. Recarga la página e inténtalo de nuevo.',
        captcha: 'La verificación no pasó',
      });
    }

    const nombre = input.nombre.trim();
    if (nombre.length < 2) throw new ValidationError('Escribe tu nombre', { nombre: 'Requerido' });

    // Correo **o** teléfono, al menos uno — misma regla que el CRM anterior: hay prospectos que
    // solo dejan WhatsApp, y exigirles correo los perdía.
    const correoCrudo = input.email?.trim() || '';
    const telefonoRegistro = input.telefono?.trim() || '';
    if (!correoCrudo && !telefonoRegistro) {
      throw new ValidationError('Ingresa al menos un correo o un teléfono para poder mandarte el acceso', {
        general: 'Ingresa al menos un correo o un teléfono: por ahí te mandamos el acceso al evento.',
        email: 'Escribe tu correo o tu teléfono',
      });
    }
    const correo = correoCrudo ? Email.create(correoCrudo) : null;
    if (telefonoRegistro && !esTelefonoPlausible(telefonoRegistro)) {
      throw new ValidationError('Revisa el teléfono', {
        general: 'El teléfono no parece un número válido. Revísalo, por favor.',
        telefono: 'No parece un número válido',
      });
    }

    const bloqueado =
      (correo ? await this.listaNegra.contiene(correo.value) : false) ||
      (telefonoRegistro ? await this.listaNegra.contieneTelefono(telefonoRegistro) : false);
    if (bloqueado) {
      this.logger.info('Registro bloqueado por lista negra', { email: correo?.value ?? null });
      throw new ValidationError('No fue posible completar tu registro. Contacta a soporte.');
    }
    if (await this.inscripciones.findByContacto(evento.id, correo?.value ?? null, telefonoRegistro || null)) {
      throw new ConflictError('Ya estás registrado en este evento');
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
      email: correo?.value ?? null,
      telefono: telefonoRegistro || null,
      empresa: input.empresa?.trim() || null,
      estado: 'registrado',
      origen: 'publico',
      correoEstado: correo ? 'pendiente' : null,
      recordatoriosEnviados: [],
      ip,
      correoSospechoso: correo ? esCorreoDesechable(correo.value) : false,
      asistira: input.asistira?.trim() || null,
      personas: personasRegistro(evento.maxPersonasRegistro, input),
      usaSistema: evento.sistema ? input.usaSistema?.trim() || null : null,
      fuente: input.fuente?.trim() || null,
      deseaCanalWhatsapp: Boolean(input.deseaCanalWhatsapp),
      contactadoWsp: false,
      asistioReal: false,
      createdAt: this.clock.now(),
    };
    await this.inscripciones.create(inscripcion);
    await this.enviarConfirmacion(evento, inscripcion);
    this.logger.info('Inscripción a evento', { evento: evento.id, email: correo?.value ?? null });
    return inscripcion;
  }

  /** Reenvía la confirmación si el correo ya está registrado en el evento — respuesta genérica
   *  a propósito (no revela si el correo existe o no, para no facilitar enumeración). */
  async reenviarLinkPublico(eventoId: string, email: string): Promise<void> {
    const evento = await this.obtener(eventoId);
    const correo = Email.create(email);
    const inscripcion = await this.inscripciones.findByEmail(evento.id, correo.value);
    if (!inscripcion) return;
    await this.enviarConfirmacion(evento, inscripcion);
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
      // 0 = recordatorio desactivado para este evento (igual que el CRM viejo).
      if (evento.horasRecordatorio <= 0) continue;
      const disparo = new Date(evento.fechaHora.getTime() - evento.horasRecordatorio * 3_600_000);
      if (disparo.getTime() > ahora.getTime()) continue; // aún no toca
      const inscritos = await this.inscripciones.listPorEvento(evento.id);
      for (const ins of inscritos) {
        // Sin correo no hay a dónde mandarlo (se registró solo con WhatsApp).
        if (!ins.email || ins.recordatoriosEnviados.includes('previo') || ins.estado === 'no_asistio') continue;
        await this.email.enviar({
          para: [{ email: ins.email, nombre: ins.nombre }],
          asunto: `Recordatorio: ${evento.titulo}`,
          // La plantilla del evento (o la de por defecto), como en el CRM viejo: lleva el link de
          // Zoom/Meet y el contacto de ESTE evento, no un texto genérico.
          html: `<p style="white-space:pre-wrap">${resolverPlantillaEvento(evento, ins).replace(/\n/g, '<br>')}</p>`,
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

  /**
   * Mensaje de seguimiento por correo tras el evento — opcional a propósito (vacío = no se
   * manda, evento por evento), horas configurables después de `fechaHora` (default 24h). Mismo
   * patrón que {@link enviarRecordatorios} (marca `recordatoriosEnviados` para no repetir).
   */
  async enviarSeguimiento(): Promise<{ eventos: number; correos: number }> {
    const ahora = this.clock.now();
    const todos = await this.eventos.list();
    let eventosProcesados = 0;
    let correos = 0;
    for (const evento of todos) {
      if (!evento.mensajeSeguimiento) continue;
      const disparo = new Date(evento.fechaHora.getTime() + (evento.horasSeguimiento ?? 24) * 3_600_000);
      if (disparo.getTime() > ahora.getTime()) continue; // aún no toca
      eventosProcesados++;
      const inscritos = await this.inscripciones.listPorEvento(evento.id);
      for (const ins of inscritos) {
        if (!ins.email || ins.recordatoriosEnviados.includes('seguimiento') || ins.estado === 'no_asistio') continue;
        const mensaje = resolverComodinesEvento(evento.mensajeSeguimiento, evento, ins);
        await this.email.enviar({
          para: [{ email: ins.email, nombre: ins.nombre }],
          asunto: `Seguimiento: ${evento.titulo}`,
          html: `<p style="white-space:pre-wrap">${mensaje.replace(/\n/g, '<br>')}</p>`,
          tags: ['evento-seguimiento', `evento-${evento.id}`, `insc_${ins.id}`],
        });
        ins.recordatoriosEnviados.push('seguimiento');
        await this.inscripciones.save(ins);
        correos++;
      }
    }
    this.logger.info('Seguimiento de eventos enviado', { eventos: eventosProcesados, correos });
    return { eventos: eventosProcesados, correos };
  }

  private async enviarConfirmacion(evento: Evento, ins: Inscripcion): Promise<void> {
    // Quien se registró solo con teléfono no recibe correo: el staff lo contacta por WhatsApp.
    if (!ins.email) return;
    // En presenciales siempre va el texto (con lugar y dirección), aunque no tenga uno propio.
    const mensajePersonalizado = evento.plantilla || evento.tipo === 'presencial'
      ? `<p style="white-space:pre-wrap">${resolverPlantillaEvento(evento, ins).replace(/\n/g, '<br>')}</p>`
      : '';
    await this.email.enviar({
      para: [{ email: ins.email, nombre: ins.nombre }],
      asunto: `Registro confirmado: ${evento.titulo}`,
      html: `<p>Hola ${ins.nombre}, tu registro para <strong>${evento.titulo}</strong> (${evento.fechaHora.toLocaleString('es-MX', { timeZone: ZONA_MEXICO })}) quedó confirmado.</p>
             ${mensajePersonalizado}
             <p>Detalles: ${this.baseUrl}/eventos/${evento.id}</p>`,
      tags: ['evento-confirmacion', `evento-${evento.id}`, `insc_${ins.id}`],
    });
  }
}
