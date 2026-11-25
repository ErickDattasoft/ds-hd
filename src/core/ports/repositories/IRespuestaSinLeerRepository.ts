import type { RespuestaSinLeer } from '../../entities/RespuestaSinLeer.js';

/** Persistencia del buzón de respuestas de clientes sin leer (`respuestas_sin_leer/{ticketId}`). */
export interface IRespuestaSinLeerRepository {
  /** Upsert por `ticketId`: la respuesta más reciente reemplaza a la anterior. */
  guardar(r: RespuestaSinLeer): Promise<void>;
  /** Todas, sin orden garantizado. */
  listar(): Promise<RespuestaSinLeer[]>;
  /** `true` si había una y se borró. */
  quitar(ticketId: string): Promise<boolean>;
  /** Anota que esta persona ya la leyó (solo escribe si había aviso y no lo tenía). `true` si escribió. */
  marcarLeidaPor(ticketId: string, persona: { uid: string; nombre: string }): Promise<boolean>;
}
