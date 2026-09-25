export type EstadoInscripcion = 'registrado' | 'confirmado' | 'asistio' | 'no_asistio';

/** Inscripción de una persona a un evento (`eventos/{id}/inscripciones/{insId}`). */
export interface Inscripcion {
  id: string;
  eventoId: string;
  nombre: string;
  /**
   * Opcional: el registro público pide correo **o** teléfono, al menos uno. Sin correo no hay
   * confirmación ni recordatorios por mail — a esa persona se le contacta por WhatsApp.
   */
  email: string | null;
  telefono: string | null;
  empresa: string | null;
  estado: EstadoInscripcion;
  origen: 'publico' | 'staff';
  /** Estado del último correo enviado, actualizado por el webhook de Brevo. */
  correoEstado: 'pendiente' | 'entregado' | 'rebotado' | null;
  recordatoriosEnviados: string[];
  /** IP desde la que se registró (forense + límite por IP); `null` para altas de staff. */
  ip: string | null;
  /** `true` si el dominio del correo es de un servicio desechable conocido — solo se marca 🚩. */
  correoSospechoso: boolean;
  /** Respuesta libre del formulario público — "Sí"/"No"/"Tal vez". `null` para altas de staff. */
  asistira: string | null;
  /** Respuesta a "¿usas [sistema]?" — solo si el evento tiene `sistema`; si no, `null`. */
  usaSistema: string | null;
  /** Cómo se enteró del evento (Facebook/Instagram/LinkedIn/...), texto libre. */
  fuente: string | null;
  /** Marcó que quiere unirse al canal de WhatsApp de avisos/novedades. */
  deseaCanalWhatsapp: boolean;
  /** Ya se le mandó el mensaje de WhatsApp — se marca solo al usar el botón 💬, o a mano. */
  contactadoWsp: boolean;
  /**
   * Asistencia real confirmada, distinta de `asistira` (la intención que declaró al
   * registrarse) y de `estado`. Es la que alimenta el 🔁 "ya asistió antes" entre eventos.
   */
  asistioReal: boolean;
  createdAt: Date;
}

/** Entrada de la lista negra de eventos (`lista_negra_eventos/{emailHash}`). */
export interface EntradaListaNegra {
  email: string;
  /** Teléfono, si se marcó desde una inscripción que lo tenía — también cruza por aquí. */
  telefono: string | null;
  motivo: string | null;
  /** Nombre de quien lo marcó, para el tooltip del 🚫. */
  marcadoPor: string | null;
  createdAt: Date;
}
