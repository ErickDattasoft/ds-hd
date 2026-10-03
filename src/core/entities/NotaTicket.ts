/** Nota en la conversación de un ticket. `interna` no es visible para el cliente en el portal. */
export interface NotaTicket {
  id: string;
  tipo: 'publica' | 'interna';
  cuerpo: string;
  autorUid: string;
  autorNombre: string;
  createdAt: Date;
  /** Imágenes de la nota (ids de `tickets_adjuntos`): capturas de una respuesta por correo o del CRM. */
  adjuntoIds?: string[];
  /** Correo de quien la escribió, si llegó por correo (para distinguirla de las del CRM). */
  correoDe?: string;
}

/**
 * Entrada del registro de actividad de un ticket (append-only). Sirve de bitácora local
 * visible en el detalle.
 */
export interface EventoTicket {
  id: string;
  tipo: 'creacion' | 'cambio_estado' | 'asignacion' | 'nota' | 'sla_incumplido' | 'correo' | 'facturacion' | 'agenda' | 'encuesta';
  resumen: string;
  actorUid: string | null;
  actorNombre: string | null;
  at: Date;
}
