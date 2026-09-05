import type { FiltroTickets, ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { ColumnaExcel, IExcelIO } from '../../core/ports/services/IExcelIO.js';
import { ETIQUETAS_FACTURACION } from '../../core/entities/value-objects/EstadoFacturacion.js';

const COLUMNAS: ColumnaExcel[] = [
  { header: 'Número', key: 'numero' },
  { header: 'Asunto', key: 'asunto', width: 34 },
  { header: 'Empresa', key: 'empresa', width: 26 },
  { header: 'Contacto', key: 'contacto', width: 22 },
  { header: 'Tipo', key: 'tipo' },
  { header: 'Sistema', key: 'sistema' },
  { header: 'Estado', key: 'estado' },
  { header: 'Prioridad', key: 'prioridad' },
  { header: 'Canal', key: 'canal' },
  { header: 'Agente asignado', key: 'agente', width: 22 },
  { header: 'Facturación', key: 'facturado', width: 16 },
  { header: 'Creado', key: 'creado', width: 14 },
];

/** Export de Tickets a Excel (`.xlsx`) — solo lectura, no hay import (paridad con el CRM viejo). */
export class TicketExcelService {
  constructor(
    private readonly queries: ITicketQueries,
    private readonly excel: IExcelIO,
  ) {}

  async exportar(filtro: FiltroTickets): Promise<Buffer> {
    const tickets = await this.queries.listar(filtro);
    const filas = tickets.map((t) => ({
      numero: String(t.numero),
      asunto: t.asunto,
      empresa: t.empresaNombre ?? '',
      contacto: t.contactoNombre ?? '',
      tipo: t.tipo,
      sistema: t.sistema ?? '',
      estado: t.estado,
      prioridad: t.prioridad,
      canal: t.canal,
      agente: t.agenteAsignadoNombre ?? '',
      facturado: ETIQUETAS_FACTURACION[t.facturacion.estado],
      creado: t.createdAt.toISOString().slice(0, 10),
    }));
    return this.excel.escribir('Tickets', COLUMNAS, filas);
  }
}
