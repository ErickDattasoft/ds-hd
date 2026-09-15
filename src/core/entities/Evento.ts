import { ConflictError, NotFoundError, ValidationError } from '../errors/DomainError.js';

export type EstadoEvento = 'borrador' | 'publicado' | 'finalizado' | 'cancelado';

/** Tope de inscripciones por IP y evento cuando el evento no fija uno propio. */
export const LIMITE_REGISTROS_POR_IP_DEFECTO = 5;

/** Texto de partida al crear un evento — el staff lo completa con el link real, etc. */
export const PLANTILLA_EVENTO_DEFAULT =
  'Hola [nombre] 👋\n\nQuedaste registrado en [evento].\n📅 [fecha] [hora]\n🔗 Liga de acceso: [link]\n\n' +
  'Para mayores informes, contáctanos por WhatsApp: [contacto_whatsapp]\n\n¡Nos vemos ahí!\n\n— [contacto_nombre]';

/**
 * Resuelve los comodines `[nombre] [evento] [fecha] [hora] [sistema] [link] [contacto_nombre]
 * [contacto_whatsapp]` de un texto cualquiera (plantilla de confirmación o mensaje de
 * seguimiento) contra los datos del evento y de un inscrito.
 */
export function resolverComodinesEvento(
  texto: string,
  evento: Pick<Evento, 'titulo' | 'fechaHora' | 'sistema' | 'urlWebinar' | 'contactoNombre' | 'contactoWhatsapp'>,
  inscrito: { nombre: string },
): string {
  const fechaFmt = evento.fechaHora.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const horaFmt = evento.fechaHora.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  return texto
    .replace(/\[nombre\]/g, inscrito.nombre || '')
    .replace(/\[evento\]/g, evento.titulo || '')
    .replace(/\[fecha\]/g, fechaFmt)
    .replace(/\[hora\]/g, horaFmt)
    .replace(/\[sistema\]/g, evento.sistema || '')
    .replace(/\[link\]/g, evento.urlWebinar || '')
    .replace(/\[contacto_nombre\]/g, evento.contactoNombre || '')
    .replace(/\[contacto_whatsapp\]/g, evento.contactoWhatsapp || '');
}

/** Resuelve la plantilla de CONFIRMACIÓN del evento (o {@link PLANTILLA_EVENTO_DEFAULT} si no
 *  tiene una propia) — usada tanto por el correo automático como por el botón manual de
 *  WhatsApp por inscrito. */
export function resolverPlantillaEvento(
  evento: Pick<Evento, 'titulo' | 'fechaHora' | 'sistema' | 'urlWebinar' | 'contactoNombre' | 'contactoWhatsapp' | 'plantilla'>,
  inscrito: { nombre: string },
): string {
  return resolverComodinesEvento(evento.plantilla || PLANTILLA_EVENTO_DEFAULT, evento, inscrito);
}

/** Respuesta de una empresa/persona invitada de forma dirigida a un evento. */
export type RespuestaInvitacion = 'pendiente' | 'asistira' | 'no_asistira' | 'no_localizado';

export const RESPUESTAS_INVITACION: readonly RespuestaInvitacion[] = [
  'pendiente',
  'asistira',
  'no_asistira',
  'no_localizado',
];

export const RESPUESTA_INVITACION_ETIQUETA: Record<RespuestaInvitacion, string> = {
  pendiente: 'Pendiente',
  asistira: '✅ Asistirá',
  no_asistira: '❌ No asistirá',
  no_localizado: '📵 No localizado',
};

/** Empresa de la cartera invitada de forma dirigida a un evento (paridad con el CRM viejo). */
export interface InvitacionEmpresa {
  /** Id estable de la entrada (para editar/quitar sin depender del índice del arreglo). */
  id: string;
  /** Empresa de la cartera, si se eligió de ahí; `null` si es un nombre suelto. */
  empresaId: string | null;
  empresaNombre: string;
  /** Sistemas contratados de la empresa, copiados al invitar (referencia rápida). */
  sistemas: string[];
  /** Quién de DATTASOFT se encarga de contactarla. */
  invitadoPor: string | null;
  /** Ya se le contactó/invitó. */
  contactado: boolean;
  respuesta: RespuestaInvitacion;
  notas: string | null;
}

/** Invitado externo (redes sociales, referidos) que no es una empresa de la cartera. */
export interface InvitadoExterno {
  id: string;
  nombre: string;
  fuente: string | null;
  contactado: boolean;
  respuesta: RespuestaInvitacion;
  notas: string | null;
}

/** Conteos de la invitación dirigida, para las tarjetas del panel del evento. */
export interface ResumenInvitaciones {
  invitados: number;
  contactados: number;
  asistiran: number;
  noAsistiran: number;
  noLocalizados: number;
  pendientes: number;
}

/** Imagen promocional del evento (poster/flayer), mostrada en la página pública de registro. */
export interface EventoFlayer {
  contentType: string;
  /** Tamaño del archivo original en bytes (antes de base64). */
  tamano: number;
  /** `data:<contentType>;base64,<...>`. */
  data: string;
}

/** Tipos MIME aceptados para el flayer. SVG queda fuera a propósito (puede llevar scripts). */
export const TIPOS_FLAYER_PERMITIDOS: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];

/** Tope de tamaño del flayer: un poster promocional, más grande que el logo de marca. */
export const MAX_FLAYER_BYTES = 700 * 1024;

/** Valida tipo y tamaño del flayer antes de guardarlo. Lanza `ValidationError` si algo falla. */
function validarFlayer(contentType: string, tamano: number): void {
  if (!TIPOS_FLAYER_PERMITIDOS.includes(contentType)) {
    throw new ValidationError('Tipo de imagen no permitido (usa PNG, JPG o WebP)', { archivo: 'Tipo no permitido' });
  }
  if (!Number.isFinite(tamano) || tamano <= 0) {
    throw new ValidationError('La imagen está vacía', { archivo: 'Vacío' });
  }
  if (tamano > MAX_FLAYER_BYTES) {
    const kb = Math.round(MAX_FLAYER_BYTES / 1024);
    throw new ValidationError(`La imagen supera el máximo de ${kb} KB`, { archivo: 'Muy grande' });
  }
}

const esRespuesta = (v: unknown): v is RespuestaInvitacion =>
  typeof v === 'string' && (RESPUESTAS_INVITACION as readonly string[]).includes(v);

/** Props para construir un {@link Evento}. */
export interface EventoProps {
  id: string;
  titulo: string;
  descripcion?: string | null;
  fechaHora: Date;
  cupo?: number;
  estado?: EstadoEvento;
  urlWebinar?: string | null;
  /** Horas antes del evento para enviar el recordatorio. */
  horasRecordatorio?: number;
  /** Máximo de inscripciones desde una misma IP; `null` = usar {@link LIMITE_REGISTROS_POR_IP_DEFECTO}. */
  limiteRegistrosPorIp?: number | null;
  /** Empresas de la cartera invitadas de forma dirigida. */
  invitaciones?: InvitacionEmpresa[];
  /** Invitados externos (redes sociales, referidos). */
  invitadosExternos?: InvitadoExterno[];
  /** Imagen promocional (poster/flayer) del evento. */
  flayer?: EventoFlayer | null;
  /** Sistema al que aplica el evento (p. ej. "Contabilidad"); dispara la pregunta "¿lo usas?"
   *  en el registro público y alimenta el comodín `[sistema]` de la plantilla. */
  sistema?: string | null;
  /** Contacto de referencia de ESTE evento (distinto del "invitado por" de cada invitación). */
  contactoNombre?: string | null;
  contactoWhatsapp?: string | null;
  /** Plantilla de mensaje con comodines, propia de este evento — ver {@link resolverPlantillaEvento}. */
  plantilla?: string | null;
  /** Mensaje de seguimiento por correo tras el evento; vacío = no se manda (opcional a propósito). */
  mensajeSeguimiento?: string | null;
  /** Horas después del evento para el seguimiento; `null` = usar el valor por defecto (24h). */
  horasSeguimiento?: number | null;
  creadoPorUid?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Evento / webinar con registro público. */
export class Evento {
  readonly id: string;
  titulo: string;
  descripcion: string | null;
  fechaHora: Date;
  cupo: number;
  estado: EstadoEvento;
  urlWebinar: string | null;
  horasRecordatorio: number;
  limiteRegistrosPorIp: number | null;
  invitaciones: InvitacionEmpresa[];
  invitadosExternos: InvitadoExterno[];
  flayer: EventoFlayer | null;
  sistema: string | null;
  contactoNombre: string | null;
  contactoWhatsapp: string | null;
  plantilla: string | null;
  mensajeSeguimiento: string | null;
  horasSeguimiento: number | null;
  readonly creadoPorUid: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: EventoProps) {
    if (props.titulo.trim().length < 3) {
      throw new ValidationError('El título del evento es obligatorio', { titulo: 'Mínimo 3 caracteres' });
    }
    this.id = props.id;
    this.titulo = props.titulo.trim();
    this.descripcion = props.descripcion?.trim() || null;
    this.fechaHora = props.fechaHora;
    this.cupo = props.cupo ?? 0;
    this.estado = props.estado ?? 'borrador';
    this.urlWebinar = props.urlWebinar?.trim() || null;
    this.horasRecordatorio = props.horasRecordatorio ?? 24;
    this.limiteRegistrosPorIp =
      typeof props.limiteRegistrosPorIp === 'number' && props.limiteRegistrosPorIp > 0
        ? Math.trunc(props.limiteRegistrosPorIp)
        : null;
    this.invitaciones = (props.invitaciones ?? []).map(sanearInvitacionEmpresa);
    this.invitadosExternos = (props.invitadosExternos ?? []).map(sanearInvitadoExterno);
    this.flayer = props.flayer ?? null;
    this.sistema = props.sistema?.trim() || null;
    this.contactoNombre = props.contactoNombre?.trim() || null;
    this.contactoWhatsapp = props.contactoWhatsapp?.trim() || null;
    this.plantilla = props.plantilla?.trim() || null;
    this.mensajeSeguimiento = props.mensajeSeguimiento?.trim() || null;
    this.horasSeguimiento =
      typeof props.horasSeguimiento === 'number' && props.horasSeguimiento > 0
        ? Math.trunc(props.horasSeguimiento)
        : null;
    this.creadoPorUid = props.creadoPorUid ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  get abiertoARegistro(): boolean {
    return this.estado === 'publicado' && this.fechaHora.getTime() > Date.now();
  }

  get sinCupo(): boolean {
    return this.cupo > 0;
  }

  /** El tope de inscripciones por IP que aplica de verdad (el propio o el de por defecto). */
  get limiteIpEfectivo(): number {
    return this.limiteRegistrosPorIp ?? LIMITE_REGISTROS_POR_IP_DEFECTO;
  }

  /** Conteos combinados de empresas invitadas + invitados externos. */
  get resumenInvitaciones(): ResumenInvitaciones {
    const todos = [...this.invitaciones, ...this.invitadosExternos];
    return {
      invitados: todos.length,
      contactados: todos.filter((i) => i.contactado).length,
      asistiran: todos.filter((i) => i.respuesta === 'asistira').length,
      noAsistiran: todos.filter((i) => i.respuesta === 'no_asistira').length,
      noLocalizados: todos.filter((i) => i.respuesta === 'no_localizado').length,
      pendientes: todos.filter((i) => i.respuesta === 'pendiente').length,
    };
  }

  // ── Invitación dirigida a empresas ─────────────────────────────────────
  agregarEmpresaInvitada(entrada: {
    id: string;
    empresaId?: string | null;
    empresaNombre: string;
    sistemas?: string[];
    invitadoPor?: string | null;
  }): InvitacionEmpresa {
    const nombre = entrada.empresaNombre.trim();
    if (nombre.length < 2) {
      throw new ValidationError('Indica el nombre de la empresa', { empresaNombre: 'Requerido' });
    }
    if (this.invitaciones.some((i) => i.empresaNombre.toLowerCase() === nombre.toLowerCase())) {
      throw new ConflictError(`«${nombre}» ya está invitada a este evento`);
    }
    const inv = sanearInvitacionEmpresa({
      id: entrada.id,
      empresaId: entrada.empresaId ?? null,
      empresaNombre: nombre,
      sistemas: entrada.sistemas ?? [],
      invitadoPor: entrada.invitadoPor ?? null,
      contactado: false,
      respuesta: 'pendiente',
      notas: null,
    });
    this.invitaciones.push(inv);
    return inv;
  }

  actualizarEmpresaInvitada(
    id: string,
    cambios: Partial<Pick<InvitacionEmpresa, 'invitadoPor' | 'contactado' | 'respuesta' | 'notas'>>,
  ): void {
    const inv = this.invitaciones.find((i) => i.id === id);
    if (!inv) throw new NotFoundError('Empresa invitada', id);
    aplicarCambiosInvitado(inv, cambios);
  }

  quitarEmpresaInvitada(id: string): void {
    const i = this.invitaciones.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundError('Empresa invitada', id);
    this.invitaciones.splice(i, 1);
  }

  // ── Invitados externos ────────────────────────────────────────────────
  agregarInvitadoExterno(entrada: { id: string; nombre?: string; fuente?: string | null }): InvitadoExterno {
    const ext = sanearInvitadoExterno({
      id: entrada.id,
      nombre: entrada.nombre ?? '',
      fuente: entrada.fuente ?? 'Redes sociales',
      contactado: false,
      respuesta: 'pendiente',
      notas: null,
    });
    this.invitadosExternos.push(ext);
    return ext;
  }

  actualizarInvitadoExterno(
    id: string,
    cambios: Partial<Pick<InvitadoExterno, 'nombre' | 'fuente' | 'contactado' | 'respuesta' | 'notas'>>,
  ): void {
    const ext = this.invitadosExternos.find((i) => i.id === id);
    if (!ext) throw new NotFoundError('Invitado externo', id);
    if (cambios.nombre !== undefined) ext.nombre = cambios.nombre.trim();
    if (cambios.fuente !== undefined) ext.fuente = cambios.fuente?.trim() || null;
    aplicarCambiosInvitado(ext, cambios);
  }

  quitarInvitadoExterno(id: string): void {
    const i = this.invitadosExternos.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundError('Invitado externo', id);
    this.invitadosExternos.splice(i, 1);
  }

  /** Reemplaza el flayer del evento; `null` lo quita. */
  actualizarFlayer(flayer: EventoFlayer | null): void {
    if (flayer) validarFlayer(flayer.contentType, flayer.tamano);
    this.flayer = flayer;
  }
}

/** Aplica los campos comunes de edición (contactado/respuesta/notas/invitadoPor) a una entrada. */
function aplicarCambiosInvitado(
  destino: { contactado: boolean; respuesta: RespuestaInvitacion; notas: string | null; invitadoPor?: string | null },
  cambios: { contactado?: boolean; respuesta?: RespuestaInvitacion; notas?: string | null; invitadoPor?: string | null },
): void {
  if (cambios.contactado !== undefined) destino.contactado = Boolean(cambios.contactado);
  if (cambios.respuesta !== undefined) {
    if (!esRespuesta(cambios.respuesta)) {
      throw new ValidationError('Respuesta no válida', { respuesta: 'No reconocida' });
    }
    destino.respuesta = cambios.respuesta;
  }
  if (cambios.notas !== undefined) destino.notas = cambios.notas?.trim() || null;
  if ('invitadoPor' in cambios && destino.invitadoPor !== undefined) {
    destino.invitadoPor = cambios.invitadoPor?.trim() || null;
  }
}

/** Normaliza una entrada de empresa invitada leída de la BD o del formulario. */
function sanearInvitacionEmpresa(d: Partial<InvitacionEmpresa> & { id: string }): InvitacionEmpresa {
  return {
    id: d.id,
    empresaId: d.empresaId ?? null,
    empresaNombre: String(d.empresaNombre ?? '').trim(),
    sistemas: Array.isArray(d.sistemas) ? [...new Set(d.sistemas.map(String).filter(Boolean))] : [],
    invitadoPor: d.invitadoPor?.trim() || null,
    contactado: d.contactado === true,
    respuesta: esRespuesta(d.respuesta) ? d.respuesta : 'pendiente',
    notas: d.notas?.trim() || null,
  };
}

/** Normaliza una entrada de invitado externo leída de la BD o del formulario. */
function sanearInvitadoExterno(d: Partial<InvitadoExterno> & { id: string }): InvitadoExterno {
  return {
    id: d.id,
    nombre: String(d.nombre ?? '').trim(),
    fuente: d.fuente?.trim() || null,
    contactado: d.contactado === true,
    respuesta: esRespuesta(d.respuesta) ? d.respuesta : 'pendiente',
    notas: d.notas?.trim() || null,
  };
}
