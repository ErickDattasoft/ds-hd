import { ConflictError, NotFoundError, ValidationError } from '../errors/DomainError.js';
import { ZONA_MEXICO } from './value-objects/horaMexico.js';

export type EstadoEvento = 'borrador' | 'publicado' | 'finalizado' | 'cancelado';

/** Qué clase de evento es: decide qué secciones muestra la invitación y si pide confirmación. */
export type TipoEvento = 'webinar' | 'presencial' | 'felicitacion' | 'comunicado';

export const TIPOS_EVENTO: readonly TipoEvento[] = ['webinar', 'presencial', 'felicitacion', 'comunicado'];

export const TIPO_EVENTO_ETIQUETA: Record<TipoEvento, string> = {
  webinar: '💻 Webinar',
  presencial: '📍 Presencial',
  felicitacion: '🎉 Felicitación',
  comunicado: '📢 Comunicado',
};

/** Explicación corta de cada tipo (tarjetas de Eventos y del formulario). */
export const TIPO_EVENTO_AYUDA: Record<TipoEvento, string> = {
  webinar: 'En línea, con liga para entrar',
  presencial: 'En un lugar, con mapa y programa',
  felicitacion: 'Una tarjeta para leer, sin confirmar',
  comunicado: 'Pegas el link que pasa CONTPAQi y lo mandas',
};

/** Título de cada recuadro en la lista de Eventos. */
export const TIPO_EVENTO_GRUPO: Record<TipoEvento, string> = {
  webinar: '💻 Webinars',
  presencial: '📍 Eventos presenciales',
  felicitacion: '🎉 Felicitaciones',
  comunicado: '📢 Comunicados',
};

const esTipoEvento = (v: unknown): v is TipoEvento =>
  typeof v === 'string' && (TIPOS_EVENTO as readonly string[]).includes(v);

/** Diseño de la invitación: colores, letra del título y un adorno discreto. */
export type EstiloEvento = 'corporativo' | 'elegante' | 'fiesta' | 'cumpleanos' | 'navidad';

export const ESTILOS_EVENTO: readonly EstiloEvento[] = ['corporativo', 'elegante', 'fiesta', 'cumpleanos', 'navidad'];

/** Datos de cada estilo (los mismos colores que `.inv-estilo--*` en el CSS; aquí para el correo). */
export const ESTILO_EVENTO_INFO: Record<
  EstiloEvento,
  { nombre: string; adorno: string; ayuda: string; color: string; fondo: string; texto: string; fuente: string }
> = {
  corporativo: { nombre: 'Corporativo', adorno: '', ayuda: 'Webinars y cursos', color: '#1f5fae', fondo: '#eef4fb', texto: '#16243a', fuente: 'Arial,Helvetica,sans-serif' },
  elegante: { nombre: 'Elegante', adorno: '✦', ayuda: 'Cenas y eventos formales', color: '#c9a24a', fondo: '#17171b', texto: '#f3eee2', fuente: 'Georgia,"Times New Roman",serif' },
  fiesta: { nombre: 'Fiesta', adorno: '🎉', ayuda: 'Celebraciones y aniversarios', color: '#d6336c', fondo: '#fff4e6', texto: '#2b1b3a', fuente: '"Trebuchet MS",Arial,sans-serif' },
  cumpleanos: { nombre: 'Cumpleaños', adorno: '🎈', ayuda: 'Felicitaciones', color: '#8b5cc7', fondo: '#fdf2f8', texto: '#3a2a48', fuente: '"Trebuchet MS",Arial,sans-serif' },
  navidad: { nombre: 'Navidad', adorno: '🎄', ayuda: 'Posadas y felicitación navideña', color: '#b3262e', fondo: '#f3f8ef', texto: '#1f3324', fuente: 'Georgia,"Times New Roman",serif' },
};

const esEstiloEvento = (v: unknown): v is EstiloEvento =>
  typeof v === 'string' && (ESTILOS_EVENTO as readonly string[]).includes(v);

/** Estilo que toca por defecto según el tipo (eventos viejos no traen estilo). */
export function estiloPorDefecto(tipo: TipoEvento): EstiloEvento {
  return tipo === 'felicitacion' ? 'fiesta' : 'corporativo';
}

/**
 * Limpia el link pegado de un comunicado: sin espacios y con `https://` si venía sin él
 * («www.contpaqi.com/…»). Vacío = `null`. Lanza `ValidationError` si no parece un link.
 */
export function normalizarLinkComunicado(v: string | null | undefined): string | null {
  let t = String(v ?? '').trim();
  if (!t) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = `https://${t}`;
  if (!/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(t)) {
    throw new ValidationError('El link del comunicado no es válido', { urlComunicado: 'Pega el link completo (https://…)' });
  }
  return t;
}

/** Máximo de pases que se le pueden dar a una sola invitación. */
export const MAX_PASES = 20;

/** Un renglón del itinerario («3:00 PM — Recepción»). */
export interface RenglonItinerario {
  hora: string;
  actividad: string;
}

/** Convierte el texto del formulario («hora - actividad» por renglón) en el itinerario. */
export function itinerarioDeTexto(texto: string | null | undefined): RenglonItinerario[] {
  return String(texto ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((l) => {
      const m = l.match(/^(.{1,20}?)\s+[-–—|·]\s+(.+)$/);
      return m ? { hora: m[1]!.trim(), actividad: m[2]!.trim() } : { hora: '', actividad: l };
    });
}

/** Lo inverso de {@link itinerarioDeTexto}, para volver a llenar el formulario. */
export function itinerarioATexto(it: RenglonItinerario[]): string {
  return it.map((r) => (r.hora ? `${r.hora} - ${r.actividad}` : r.actividad)).join('\n');
}

/** Tope de inscripciones por IP y evento cuando el evento no fija uno propio. */
export const LIMITE_REGISTROS_POR_IP_DEFECTO = 5;

/** Texto de partida al crear un evento — el staff lo completa con el link real, etc. */
export const PLANTILLA_EVENTO_DEFAULT =
  'Hola [nombre] 👋\n\nQuedaste registrado en [evento].\n📅 [fecha] [hora]\n🔗 Liga de acceso: [link]\n\n' +
  'Para mayores informes, contáctanos por WhatsApp: [contacto_whatsapp]\n\n¡Nos vemos ahí!\n\n— [contacto_nombre]';

/** Texto de partida para eventos PRESENCIALES: sin liga de acceso, con el lugar. */
export const PLANTILLA_PRESENCIAL_DEFAULT =
  'Hola [nombre] 👋\n\n¡Gracias por confirmar! Te esperamos en [evento].\n📅 [fecha] [hora]\n📍 [lugar]\n[direccion]\n\n' +
  'Cualquier duda, escríbenos por WhatsApp: [contacto_whatsapp]\n\n— [contacto_nombre]';

/** Comodines que, si el evento no tiene ese dato, se llevan su renglón entero (no dejar
 *  «escríbenos por WhatsApp:» sin número, ni «📍» sin lugar). */
const COMODINES_DE_RENGLON = ['contacto_whatsapp', 'link', 'lugar', 'direccion', 'mapa', 'sistema', 'contacto_nombre'];

/**
 * Resuelve los comodines `[nombre] [evento] [fecha] [hora] [sistema] [link] [contacto_nombre]
 * [contacto_whatsapp]` de un texto cualquiera (plantilla de confirmación o mensaje de
 * seguimiento) contra los datos del evento y de un inscrito. El WhatsApp de contacto, si falta,
 * es el de «📤 Se envía desde»; si tampoco hay, el renglón que lo pedía se quita.
 */
export function resolverComodinesEvento(
  texto: string,
  evento: Pick<Evento, 'titulo' | 'fechaHora' | 'sistema' | 'urlWebinar' | 'contactoNombre' | 'contactoWhatsapp'> &
    Partial<Pick<Evento, 'lugarNombre' | 'lugarDireccion' | 'lugarMapsUrl' | 'envioWhatsapp'>>,
  inscrito: { nombre: string },
): string {
  const fechaFmt = evento.fechaHora.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA_MEXICO,
  });
  const horaFmt = evento.fechaHora.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', timeZone: ZONA_MEXICO });
  const valores: Record<string, string> = {
    contacto_whatsapp: evento.contactoWhatsapp || evento.envioWhatsapp || '',
    link: evento.urlWebinar || '',
    lugar: evento.lugarNombre || '',
    direccion: evento.lugarDireccion || '',
    mapa: evento.lugarMapsUrl || '',
    sistema: evento.sistema || '',
    contacto_nombre: evento.contactoNombre || '',
  };
  const vacios = COMODINES_DE_RENGLON.filter((c) => !valores[c]!.trim());
  const sinRenglonesVacios = vacios.length
    ? texto
        .split('\n')
        .filter((renglon) => !vacios.some((c) => renglon.includes(`[${c}]`)))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : texto;
  return sinRenglonesVacios
    .replace(/\[nombre\]/g, inscrito.nombre || '')
    .replace(/\[evento\]/g, evento.titulo || '')
    .replace(/\[fecha\]/g, fechaFmt)
    .replace(/\[hora\]/g, horaFmt)
    .replace(/\[sistema\]/g, evento.sistema || '')
    .replace(/\[link\]/g, evento.urlWebinar || '')
    .replace(/\[contacto_nombre\]/g, evento.contactoNombre || '')
    .replace(/\[contacto_whatsapp\]/g, valores.contacto_whatsapp!)
    .replace(/\[lugar\]/g, evento.lugarNombre || '')
    .replace(/\[direccion\]/g, evento.lugarDireccion || '')
    .replace(/\[mapa\]/g, evento.lugarMapsUrl || '');
}

/** Resuelve la plantilla de CONFIRMACIÓN del evento (o {@link PLANTILLA_EVENTO_DEFAULT} si no
 *  tiene una propia) — usada tanto por el correo automático como por el botón manual de
 *  WhatsApp por inscrito. */
export function resolverPlantillaEvento(
  evento: Pick<Evento, 'titulo' | 'fechaHora' | 'sistema' | 'urlWebinar' | 'contactoNombre' | 'contactoWhatsapp' | 'plantilla'> &
    Partial<Pick<Evento, 'tipo' | 'lugarNombre' | 'lugarDireccion' | 'lugarMapsUrl' | 'envioWhatsapp'>>,
  inscrito: { nombre: string },
): string {
  const porDefecto = evento.tipo === 'presencial' ? PLANTILLA_PRESENCIAL_DEFAULT : PLANTILLA_EVENTO_DEFAULT;
  return resolverComodinesEvento(evento.plantilla || porDefecto, evento, inscrito);
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

/**
 * Lo que comparte toda invitación dirigida para que el invitado confirme SOLO desde su link
 * personal (`/eventos/:id/i/:token`): sus pases y lo que contestó. Las fechas van como texto ISO
 * porque viven dentro de un arreglo en Firestore (ahí un Date regresa como Timestamp).
 */
export interface DatosRsvp {
  /** Clave del link personal; `null` en invitaciones viejas hasta que se les asigna. */
  token: string | null;
  /** Personas que puede llevar esta invitación (incluido el invitado). */
  pases: number;
  /** Cuántas personas confirmó que van; `null` si no ha contestado o no asiste. */
  personas: number | null;
  /** Nombre de quien contestó desde el link (puede no ser el invitado mismo). */
  respondioNombre: string | null;
  /** Mensaje que dejó al confirmar. */
  mensaje: string | null;
  respondioAt: string | null;
  /** Primera vez que se abrió el link personal. */
  abiertaAt: string | null;
  /** A quién va dirigida (en empresas: su contacto principal al invitarla). */
  paraNombre: string | null;
  correo: string | null;
  telefono: string | null;
  /** Última vez que se le mandó la invitación por correo desde el CRM. */
  enviadaAt: string | null;
  /** Última vez que se abrió su WhatsApp con la invitación desde el CRM (💬). */
  enviadaWspAt: string | null;
}

/** Campos de destinatario que el staff edita a mano. */
export type CambiosDestinatario = Partial<Pick<DatosRsvp, 'paraNombre' | 'correo' | 'telefono'>>;

/** Empresa de la cartera invitada de forma dirigida a un evento (paridad con el CRM viejo). */
export interface InvitacionEmpresa extends DatosRsvp {
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
export interface InvitadoExterno extends DatosRsvp {
  id: string;
  nombre: string;
  fuente: string | null;
  contactado: boolean;
  respuesta: RespuestaInvitacion;
  notas: string | null;
}

/**
 * Persona a la que se le manda el LINK ABIERTO (sin invitación personal): se carga de Excel o se
 * captura en la pestaña «🌐 Link abierto». Solo lleva la palomita de enviado; la respuesta llega
 * cuando la persona se registra en el link.
 */
export interface DestinatarioLink {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  /** Se le mandó el link por correo desde el CRM. */
  enviadaAt: string | null;
  /** Se abrió su WhatsApp con el link desde el CRM. */
  enviadaWspAt: string | null;
}

/** Tope de la lista del link abierto (tamaño del documento del evento). */
export const MAX_DIFUSION = 1000;

/** Conteos de la invitación dirigida, para las tarjetas del panel del evento. */
export interface ResumenInvitaciones {
  invitados: number;
  contactados: number;
  asistiran: number;
  noAsistiran: number;
  noLocalizados: number;
  pendientes: number;
  /** Pases repartidos entre todas las invitaciones. */
  pases: number;
  /** Personas que confirmaron que van (suma de lo que contestó cada quien). */
  personas: number;
  /** Invitaciones cuyo link ya se abrió. */
  abiertas: number;
}

/** Lo que el invitado contesta desde su link personal. */
export interface RespuestaRsvp {
  asistira: boolean;
  personas?: number;
  nombre?: string;
  mensaje?: string;
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

type ConRsvpOpcional<T extends DatosRsvp> = Omit<T, keyof DatosRsvp> & Partial<DatosRsvp>;

/** Props para construir un {@link Evento}. */
export interface EventoProps {
  id: string;
  titulo: string;
  tipo?: TipoEvento;
  /** Diseño de la invitación; si falta, el de su tipo. */
  estilo?: EstiloEvento | null;
  /** Evento de ejemplo (botón «🧪 Crear eventos de ejemplo»): no sale en la lista pública. */
  esPrueba?: boolean;
  /** Comunicado: el link que pasa CONTPAQi; la invitación (personal o abierta) lleva directo ahí. */
  urlComunicado?: string | null;
  /** Presencial: dónde. */
  lugarNombre?: string | null;
  lugarDireccion?: string | null;
  /** Link de Google Maps («Cómo llegar»). */
  lugarMapsUrl?: string | null;
  /** Código de vestimenta o «qué llevar». */
  vestimenta?: string | null;
  itinerario?: RenglonItinerario[];
  /** Registro público (link sin nombre): cuántas personas puede anotar cada quien (1 = solo él). */
  maxPersonasRegistro?: number;
  descripcion?: string | null;
  fechaHora: Date;
  cupo?: number;
  estado?: EstadoEvento;
  urlWebinar?: string | null;
  /** Horas antes del evento para enviar el recordatorio. */
  horasRecordatorio?: number;
  /** Máximo de inscripciones desde una misma IP; `null` = usar {@link LIMITE_REGISTROS_POR_IP_DEFECTO}. */
  limiteRegistrosPorIp?: number | null;
  /** Empresas de la cartera invitadas de forma dirigida (los datos de RSVP son opcionales:
   *  las de antes de esa función, o las importadas del CRM viejo, no los traen). */
  invitaciones?: ConRsvpOpcional<InvitacionEmpresa>[];
  /** Invitados externos (redes sociales, referidos). */
  invitadosExternos?: ConRsvpOpcional<InvitadoExterno>[];
  /** A quién se le manda el link abierto (pestaña «🌐 Link abierto»). */
  difusion?: Partial<DestinatarioLink>[];
  /** Imagen promocional (poster/flayer) del evento. */
  flayer?: EventoFlayer | null;
  /** Sistema al que aplica el evento (p. ej. "Contabilidad"); dispara la pregunta "¿lo usas?"
   *  en el registro público y alimenta el comodín `[sistema]` de la plantilla. */
  sistema?: string | null;
  /** Contacto de referencia de ESTE evento (distinto del "invitado por" de cada invitación). */
  contactoNombre?: string | null;
  contactoWhatsapp?: string | null;
  /** «📤 Se envía desde»: el WhatsApp que debe estar abierto en la computadora al mandar invitaciones
   *  (el CRM no puede elegir el número: es un recordatorio visible para quien manda). */
  envioWhatsapp?: string | null;
  /** «📤 Se envía desde»: a este correo llegan las respuestas de las invitaciones por correo. */
  envioCorreo?: string | null;
  /** 🔔 A quién avisar por correo cada vez que alguien se registra o contesta su invitación.
   *  Vacío = al correo de envío (o a quien creó el evento). */
  avisarRegistros?: string[];
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
  tipo: TipoEvento;
  estilo: EstiloEvento;
  esPrueba: boolean;
  urlComunicado: string | null;
  lugarNombre: string | null;
  lugarDireccion: string | null;
  lugarMapsUrl: string | null;
  vestimenta: string | null;
  itinerario: RenglonItinerario[];
  maxPersonasRegistro: number;
  descripcion: string | null;
  fechaHora: Date;
  cupo: number;
  estado: EstadoEvento;
  urlWebinar: string | null;
  horasRecordatorio: number;
  limiteRegistrosPorIp: number | null;
  invitaciones: InvitacionEmpresa[];
  invitadosExternos: InvitadoExterno[];
  difusion: DestinatarioLink[];
  flayer: EventoFlayer | null;
  sistema: string | null;
  contactoNombre: string | null;
  contactoWhatsapp: string | null;
  envioWhatsapp: string | null;
  envioCorreo: string | null;
  avisarRegistros: string[];
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
    this.tipo = esTipoEvento(props.tipo) ? props.tipo : 'webinar';
    this.estilo = esEstiloEvento(props.estilo) ? props.estilo : estiloPorDefecto(this.tipo);
    this.esPrueba = props.esPrueba === true;
    this.urlComunicado = normalizarLinkComunicado(props.urlComunicado);
    if (this.tipo === 'comunicado' && !this.urlComunicado) {
      throw new ValidationError('Pega el link del comunicado', { urlComunicado: 'Pega aquí el link que te pasó CONTPAQi' });
    }
    this.lugarNombre = props.lugarNombre?.trim() || null;
    this.lugarDireccion = props.lugarDireccion?.trim() || null;
    const maps = props.lugarMapsUrl?.trim() || null;
    if (maps && !/^https:\/\//i.test(maps)) {
      throw new ValidationError('El link del mapa debe empezar con https://', { lugarMapsUrl: 'Link no válido' });
    }
    this.lugarMapsUrl = maps;
    this.vestimenta = props.vestimenta?.trim() || null;
    this.itinerario = (props.itinerario ?? [])
      .map((r) => ({ hora: String(r?.hora ?? '').trim(), actividad: String(r?.actividad ?? '').trim() }))
      .filter((r) => r.actividad);
    this.maxPersonasRegistro = sanearPases(props.maxPersonasRegistro ?? 1);
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
    this.difusion = (props.difusion ?? []).filter((d) => d && d.id).map(sanearDestinatarioLink);
    this.flayer = props.flayer ?? null;
    this.sistema = props.sistema?.trim() || null;
    this.contactoNombre = props.contactoNombre?.trim() || null;
    this.contactoWhatsapp = props.contactoWhatsapp?.trim() || null;
    this.envioWhatsapp = props.envioWhatsapp?.trim() || null;
    // Al leer de la BD no se valida (un correo raro no debe tumbar el evento): se valida al cambiarlo.
    this.envioCorreo = props.envioCorreo?.trim().toLowerCase() || null;
    this.avisarRegistros = [...new Set((props.avisarRegistros ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean))];
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
    // En borrador también, para probar el link público; lo que lo esconde es no salir en la lista.
    return (this.estado === 'publicado' || this.estado === 'borrador') && this.fechaHora.getTime() > Date.now();
  }

  /** La fecha del evento ya quedó atrás — para explicar por qué cerró el registro. */
  get yaPaso(): boolean {
    return this.fechaHora.getTime() <= Date.now();
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
      pases: todos.reduce((t, i) => t + i.pases, 0),
      personas: todos.reduce((t, i) => t + (i.respuesta === 'asistira' ? (i.personas ?? 1) : 0), 0),
      abiertas: todos.filter((i) => i.abiertaAt).length,
    };
  }

  /** Las felicitaciones y los comunicados solo se leen; los demás tipos piden confirmar asistencia. */
  get pideConfirmacion(): boolean {
    return this.tipo !== 'felicitacion' && this.tipo !== 'comunicado';
  }

  /** Comunicado: sus links (personal y abierto) llevan directo al link de CONTPAQi. */
  get esComunicado(): boolean {
    return this.tipo === 'comunicado';
  }

  // ── Link personal de cada invitado ─────────────────────────────────────
  /** Busca la invitación (empresa o externo) dueña del token. */
  buscarPorToken(token: string): { clase: 'empresa' | 'externo'; inv: InvitacionEmpresa | InvitadoExterno; nombre: string } | null {
    if (!token) return null;
    const emp = this.invitaciones.find((i) => i.token === token);
    if (emp) return { clase: 'empresa', inv: emp, nombre: emp.paraNombre ?? emp.empresaNombre };
    const ext = this.invitadosExternos.find((i) => i.token === token);
    if (ext) return { clase: 'externo', inv: ext, nombre: ext.nombre || ext.paraNombre || '' };
    return null;
  }

  /** Busca una invitación (empresa o externo) por su id. */
  buscarInvitado(id: string): InvitacionEmpresa | InvitadoExterno | null {
    return this.invitaciones.find((i) => i.id === id) ?? this.invitadosExternos.find((i) => i.id === id) ?? null;
  }

  /** Registra que se le mandó la invitación por correo. */
  marcarEnviada(id: string, ahora: Date): void {
    const inv = this.buscarInvitado(id);
    if (!inv) throw new NotFoundError('Invitado', id);
    inv.enviadaAt = ahora.toISOString();
    inv.contactado = true;
  }

  /** Registra que se abrió su WhatsApp con la invitación (💬). */
  marcarEnviadaWsp(id: string, ahora: Date): void {
    const inv = this.buscarInvitado(id);
    if (!inv) throw new NotFoundError('Invitado', id);
    inv.enviadaWspAt = ahora.toISOString();
    inv.contactado = true;
  }

  /** «📤 Se envía desde»: el WhatsApp y el correo de quien manda las invitaciones de este evento. */
  cambiarEnvio(datos: { whatsapp: string; correo: string; avisar?: string; contactoNombre?: string }): void {
    const correo = datos.correo.trim().toLowerCase();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      throw new ValidationError(`«${correo}» no parece un correo`, { envioCorreo: 'Correo no válido' });
    }
    const whatsapp = datos.whatsapp.trim();
    if (whatsapp && whatsapp.replace(/\D/g, '').length < 10) {
      throw new ValidationError('El WhatsApp debe tener al menos 10 dígitos', { envioWhatsapp: 'Número no válido' });
    }
    let avisar = this.avisarRegistros;
    if (datos.avisar !== undefined) {
      avisar = [...new Set(datos.avisar.split(/[\s,;]+/).map((c) => c.trim().toLowerCase()).filter(Boolean))];
      const malo = avisar.find((c) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));
      if (malo) throw new ValidationError(`«${malo}» no parece un correo`, { avisarRegistros: 'Correo no válido' });
    }
    this.envioWhatsapp = whatsapp || null;
    this.envioCorreo = correo || null;
    this.avisarRegistros = avisar;
    // 👤 Firma de los correos del evento ([contacto_nombre]); sin mandar, no se toca.
    if (datos.contactoNombre !== undefined) this.contactoNombre = datos.contactoNombre.trim().slice(0, 120) || null;
  }

  /** Da link a las invitaciones que aún no tienen (las de antes de esta función). */
  asignarTokensFaltantes(generar: () => string): boolean {
    let cambio = false;
    for (const i of [...this.invitaciones, ...this.invitadosExternos]) {
      if (!i.token) {
        i.token = generar();
        cambio = true;
      }
    }
    return cambio;
  }

  /** Marca que el invitado abrió su link. Solo la primera vez (devuelve si hubo cambio). */
  marcarAbierta(token: string, ahora: Date): boolean {
    const r = this.buscarPorToken(token);
    if (!r || r.inv.abiertaAt) return false;
    r.inv.abiertaAt = ahora.toISOString();
    return true;
  }

  /** El invitado contesta desde su link: asiste (con cuántos, hasta sus pases) o no. */
  responderInvitacion(token: string, resp: RespuestaRsvp, ahora: Date): InvitacionEmpresa | InvitadoExterno {
    const r = this.buscarPorToken(token);
    if (!r) throw new NotFoundError('Invitación', token);
    if (!this.pideConfirmacion) throw new ValidationError('Esta invitación no pide confirmación');
    if (this.estado === 'cancelado') throw new ValidationError('El evento fue cancelado');
    const inv = r.inv;
    if (resp.asistira) {
      const personas = Math.trunc(Number(resp.personas ?? 1));
      if (!Number.isFinite(personas) || personas < 1 || personas > inv.pases) {
        throw new ValidationError(
          inv.pases === 1 ? 'Tu invitación es para 1 persona' : `Elige de 1 a ${inv.pases} personas`,
          { personas: 'Fuera de tus pases' },
        );
      }
      inv.respuesta = 'asistira';
      inv.personas = personas;
    } else {
      inv.respuesta = 'no_asistira';
      inv.personas = null;
    }
    inv.respondioNombre = resp.nombre?.trim().slice(0, 120) || null;
    inv.mensaje = resp.mensaje?.trim().slice(0, 1000) || null;
    inv.respondioAt = ahora.toISOString();
    inv.abiertaAt ??= inv.respondioAt;
    inv.contactado = true;
    return inv;
  }

  // ── Invitación dirigida a empresas ─────────────────────────────────────
  agregarEmpresaInvitada(entrada: {
    id: string;
    empresaId?: string | null;
    empresaNombre: string;
    sistemas?: string[];
    invitadoPor?: string | null;
    token?: string | null;
    pases?: number;
    paraNombre?: string | null;
    correo?: string | null;
    telefono?: string | null;
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
      token: entrada.token ?? null,
      // Sin número propio, toma «🎟 Personas por invitación» del evento.
      pases: sanearPases(entrada.pases ?? this.maxPersonasRegistro),
      paraNombre: entrada.paraNombre ?? null,
      correo: sanearCorreo(entrada.correo),
      telefono: entrada.telefono ?? null,
    });
    this.invitaciones.push(inv);
    return inv;
  }

  actualizarEmpresaInvitada(
    id: string,
    cambios: Partial<Pick<InvitacionEmpresa, 'invitadoPor' | 'contactado' | 'respuesta' | 'notas' | 'pases' | 'personas'>> & CambiosDestinatario,
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

  // ── Lista del link abierto ────────────────────────────────────────────
  /** Agrega a alguien a la lista del link abierto (necesita correo o WhatsApp). */
  agregarADifusion(entrada: { id: string; nombre?: string; correo?: string | null; telefono?: string | null }): DestinatarioLink {
    if (this.difusion.length >= MAX_DIFUSION) {
      throw new ValidationError(`La lista ya tiene ${MAX_DIFUSION} personas, que es el máximo`);
    }
    const telefono = entrada.telefono?.trim() || null;
    if (!entrada.correo?.trim() && !telefono) {
      throw new ValidationError('Pon su correo o su WhatsApp', { correo: 'Falta correo o WhatsApp' });
    }
    if (telefono && telefono.replace(/\D/g, '').length < 10) {
      throw new ValidationError(`«${telefono}» no parece un WhatsApp (faltan dígitos)`, { telefono: 'Número no válido' });
    }
    const d = sanearDestinatarioLink({
      id: entrada.id,
      nombre: entrada.nombre ?? '',
      correo: sanearCorreo(entrada.correo),
      telefono,
    });
    this.difusion.push(d);
    return d;
  }

  /** Busca a alguien de la lista del link abierto. */
  buscarEnDifusion(id: string): DestinatarioLink {
    const d = this.difusion.find((x) => x.id === id);
    if (!d) throw new NotFoundError('Persona de la lista', id);
    return d;
  }

  quitarDeDifusion(id: string): void {
    const i = this.difusion.findIndex((x) => x.id === id);
    if (i < 0) throw new NotFoundError('Persona de la lista', id);
    this.difusion.splice(i, 1);
  }

  /** Borra toda la lista del link abierto (los registrados no se tocan). */
  vaciarDifusion(): void {
    this.difusion = [];
  }

  /** ✉️ Se le mandó el link abierto por correo. */
  marcarDifusionCorreo(id: string, ahora: Date): void {
    this.buscarEnDifusion(id).enviadaAt = ahora.toISOString();
  }

  /** 💬 Se abrió su WhatsApp con el link abierto. */
  marcarDifusionWsp(id: string, ahora: Date): void {
    this.buscarEnDifusion(id).enviadaWspAt = ahora.toISOString();
  }

  // ── Invitados externos ────────────────────────────────────────────────
  agregarInvitadoExterno(entrada: {
    id: string;
    nombre?: string;
    fuente?: string | null;
    token?: string | null;
    pases?: number;
    correo?: string | null;
    telefono?: string | null;
  }): InvitadoExterno {
    const ext = sanearInvitadoExterno({
      id: entrada.id,
      nombre: entrada.nombre ?? '',
      fuente: entrada.fuente ?? 'Redes sociales',
      contactado: false,
      respuesta: 'pendiente',
      notas: null,
      token: entrada.token ?? null,
      // Sin número propio, toma «🎟 Personas por invitación» del evento.
      pases: sanearPases(entrada.pases ?? this.maxPersonasRegistro),
      correo: sanearCorreo(entrada.correo),
      telefono: entrada.telefono ?? null,
    });
    this.invitadosExternos.push(ext);
    return ext;
  }

  actualizarInvitadoExterno(
    id: string,
    cambios: Partial<Pick<InvitadoExterno, 'nombre' | 'fuente' | 'contactado' | 'respuesta' | 'notas' | 'pases' | 'personas'>> & CambiosDestinatario,
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
  destino: DatosRsvp & { contactado: boolean; respuesta: RespuestaInvitacion; notas: string | null; invitadoPor?: string | null },
  cambios: {
    contactado?: boolean;
    respuesta?: RespuestaInvitacion;
    notas?: string | null;
    invitadoPor?: string | null;
    pases?: number;
    personas?: number | null;
  } & CambiosDestinatario,
): void {
  if (cambios.pases !== undefined) destino.pases = sanearPases(cambios.pases);
  if (cambios.paraNombre !== undefined) destino.paraNombre = textoONull(cambios.paraNombre);
  if (cambios.telefono !== undefined) destino.telefono = textoONull(cambios.telefono);
  if (cambios.correo !== undefined) destino.correo = sanearCorreo(cambios.correo);
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
  if (cambios.personas !== undefined) {
    destino.personas = cambios.personas && cambios.personas > 0 ? Math.trunc(cambios.personas) : null;
  }
  // Coherencia: si no asiste no lleva personas; si asiste, nunca más que sus pases.
  if (destino.respuesta !== 'asistira') destino.personas = null;
  else if (destino.personas !== null) destino.personas = Math.min(destino.personas, destino.pases);
}

/** Pases válidos: entero de 1 a {@link MAX_PASES}; cualquier otra cosa cuenta como 1. */
function sanearPases(v: unknown): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_PASES) : 1;
}

const textoONull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Correo del invitado: minúsculas y con forma de correo; si no la tiene, error claro. */
function sanearCorreo(v: unknown): string | null {
  const c = textoONull(v)?.toLowerCase() ?? null;
  if (c && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) {
    throw new ValidationError(`«${c}» no parece un correo`, { correo: 'Correo no válido' });
  }
  return c;
}

/** Normaliza los campos de RSVP leídos de la BD o del formulario. */
function sanearRsvp(d: Partial<DatosRsvp>): DatosRsvp {
  const personas = Math.trunc(Number(d.personas));
  return {
    token: textoONull(d.token),
    pases: sanearPases(d.pases ?? 1),
    personas: Number.isFinite(personas) && personas > 0 ? personas : null,
    respondioNombre: textoONull(d.respondioNombre),
    mensaje: textoONull(d.mensaje),
    respondioAt: textoONull(d.respondioAt),
    abiertaAt: textoONull(d.abiertaAt),
    paraNombre: textoONull(d.paraNombre),
    // Al leer de la BD no se valida (un correo raro no debe tumbar el evento entero).
    correo: textoONull(d.correo)?.toLowerCase() ?? null,
    telefono: textoONull(d.telefono),
    enviadaAt: textoONull(d.enviadaAt),
    enviadaWspAt: textoONull(d.enviadaWspAt),
  };
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
    ...sanearRsvp(d),
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
    ...sanearRsvp(d),
  };
}

/** Normaliza a alguien de la lista del link abierto leído de la BD o del formulario. */
function sanearDestinatarioLink(d: Partial<DestinatarioLink> & { id?: string }): DestinatarioLink {
  return {
    id: String(d.id ?? ''),
    nombre: String(d.nombre ?? '').trim(),
    correo: textoONull(d.correo)?.toLowerCase() ?? null,
    telefono: textoONull(d.telefono),
    enviadaAt: textoONull(d.enviadaAt),
    enviadaWspAt: textoONull(d.enviadaWspAt),
  };
}
