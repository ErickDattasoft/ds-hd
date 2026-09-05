export type EstadoInscripcion = 'registrado' | 'confirmado' | 'asistio' | 'no_asistio';

/** Inscripción de una persona a un evento (`eventos/{id}/inscripciones/{insId}`). */
export interface Inscripcion {
  id: string;
  eventoId: string;
  nombre: string;
  email: string;
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
  createdAt: Date;
}

/** Entrada de la lista negra de eventos (`lista_negra_eventos/{emailHash}`). */
export interface EntradaListaNegra {
  email: string;
  motivo: string | null;
  createdAt: Date;
}
