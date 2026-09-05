import type { Firestore, Query } from 'firebase-admin/firestore';
import type {
  CargaAgente,
  ColumnaKanban,
  FiltroTickets,
  ITicketQueries,
} from '../../core/ports/repositories/ITicketQueries.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { esEstadoFinal, slugEstado } from '../../core/entities/value-objects/EstadoTicket.js';
import { TicketMapper } from './mappers/TicketMapper.js';

const COL = 'tickets';

/** Implementación Firestore del lado consulta de tickets. */
export class FirestoreTicketQueries implements ITicketQueries {
  constructor(private readonly db: Firestore) {}

  private aplicar(filtro: FiltroTickets): Query {
    let q: Query = this.db.collection(COL);
    if (filtro.estado) q = q.where('estado', '==', filtro.estado);
    if (filtro.prioridad) q = q.where('prioridad', '==', filtro.prioridad);
    if (filtro.grupo) q = q.where('grupo', '==', filtro.grupo);
    if (filtro.agenteAsignadoUid) q = q.where('agenteAsignadoUid', '==', filtro.agenteAsignadoUid);
    if (filtro.sinAsignar) q = q.where('agenteAsignadoUid', '==', null);
    if (filtro.empresaId) q = q.where('empresaId', '==', filtro.empresaId);
    if (filtro.solicitanteUid) q = q.where('solicitanteUid', '==', filtro.solicitanteUid);
    if (filtro.canal) q = q.where('canal', '==', filtro.canal);
    if (filtro.soloAbiertos) q = q.where('abierto', '==', true);
    return q;
  }

  private postFiltro(tickets: Ticket[], filtro: FiltroTickets): Ticket[] {
    let out = tickets;
    // El campo es nuevo: los tickets creados antes no lo tienen en Firestore. Filtrar en
    // memoria (en vez de un `where` de Firestore) evita que esos documentos desaparezcan de
    // golpe de todas las vistas por no matchear una igualdad contra un campo ausente.
    if (filtro.archivado !== undefined) {
      out = out.filter((x) => x.archivado === filtro.archivado);
    }
    if (filtro.texto) {
      const t = filtro.texto.toLowerCase();
      out = out.filter(
        (x) =>
          x.asunto.toLowerCase().includes(t) ||
          String(x.numero).includes(t) ||
          (x.empresaNombre ?? '').toLowerCase().includes(t),
      );
    }
    if (filtro.soloProgramados) {
      // Campo nuevo — filtrar en memoria por el mismo motivo que `archivado`.
      return out
        .filter((x) => x.fechaHoraProgramada !== null)
        .sort((a, b) => a.fechaHoraProgramada!.getTime() - b.fechaHoraProgramada!.getTime());
    }
    return out.sort((a, b) => b.abiertoEn.getTime() - a.abiertoEn.getTime());
  }

  async listar(filtro: FiltroTickets): Promise<Ticket[]> {
    const snap = await this.aplicar(filtro).get();
    const tickets = snap.docs.map((d) => TicketMapper.toDomain(d.id, d.data()));
    const filtrados = this.postFiltro(tickets, filtro);
    return filtro.limite ? filtrados.slice(0, filtro.limite) : filtrados;
  }

  async contar(filtro: FiltroTickets): Promise<number> {
    // Con soloAbiertos ya es una query indexable; texto/archivado se filtran en memoria.
    if (!filtro.texto && filtro.archivado === undefined && !filtro.soloProgramados) {
      const agg = await this.aplicar(filtro).count().get();
      return agg.data().count;
    }
    return (await this.listar(filtro)).length;
  }

  async tablero(filtro: FiltroTickets, estados: readonly string[]): Promise<ColumnaKanban[]> {
    const tickets = await this.listar({ ...filtro, soloAbiertos: filtro.soloAbiertos ?? true });
    const columnas = estados
      .filter((e) => !esEstadoFinal(e))
      .map((estado) => ({
        estado,
        tickets: tickets.filter((t) => slugEstado(t.estado) === slugEstado(estado)),
      }));
    // Tickets en estados fuera de las columnas activas van a una columna "Otros".
    const enColumnas = new Set(columnas.flatMap((c) => c.tickets.map((t) => t.id)));
    const otros = tickets.filter((t) => !enColumnas.has(t.id));
    if (otros.length) columnas.push({ estado: 'Otros', tickets: otros });
    return columnas;
  }

  async cargaPorAgente(
    agentes: { uid: string; nombre: string; grupo: string | null; capacidadMax: number; disponibleAsignacion: boolean }[],
    ahora: Date,
  ): Promise<CargaAgente[]> {
    return Promise.all(
      agentes.map(async (a) => {
        const snap = await this.db
          .collection(COL)
          .where('agenteAsignadoUid', '==', a.uid)
          .where('abierto', '==', true)
          .get();
        const tickets = snap.docs.map((d) => TicketMapper.toDomain(d.id, d.data()));
        return {
          agenteUid: a.uid,
          agenteNombre: a.nombre,
          grupo: a.grupo,
          capacidadMax: a.capacidadMax,
          disponibleAsignacion: a.disponibleAsignacion,
          abiertos: tickets.length,
          vencidos: tickets.filter((t) => t.estaVencido(ahora)).length,
        };
      }),
    );
  }
}
