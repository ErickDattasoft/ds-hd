/**
 * Ticket entrante creado desde el formulario público (sin cuenta). Va a un buzón aparte
 * (`tickets_publicos`) que el staff revisa y acepta (crea un ticket real) o rechaza.
 */
export interface TicketPublico {
  id: string;
  folio: string;
  nombre: string;
  empresa: string | null;
  correo: string;
  telefono: string | null;
  asunto: string;
  sistema: string | null;
  tipo: string | null;
  prioridad: string;
  descripcion: string;
  estado: 'pendiente' | 'aceptado' | 'rechazado';
  ticketNumero: number | null;
  createdAt: Date;
}
