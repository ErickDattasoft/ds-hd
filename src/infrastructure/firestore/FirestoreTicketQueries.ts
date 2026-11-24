import type { Firestore, Query } from 'firebase-admin/firestore';
import type {
  CargaAgente,
  ColumnaKanban,
  FiltroTickets,
  ITicketQueries,
} from '../../core/ports/repositories/ITicketQueries.js';
import { coincideTexto, DISTRIBUIDOR_POR_DEFECTO, ticketDisponibleParaEquipo, ticketEsDeAgente, ticketSinNadieAsignado, type Ticket } from '../../core/entities/Ticket.js';
import { esEstadoFinal, slugEstado } from '../../core/entities/value-objects/EstadoTicket.js';
import { TicketMapper } from './mappers/TicketMapper.js';
import { cumpleIgualdades, type CacheColecciones } from './CacheColecciones.js';

const COL = 'tickets';


/** Implementación Firestore del lado consulta de tickets. */
export class FirestoreTicketQueries implements ITicketQueries {
  /** `cache`: copia en memoria con sello de cambios (sin ella, cada consulta lee de Firestore). */
  constructor(
    private readonly db: Firestore,
    private readonly cache?: CacheColecciones,
  ) {}

  /** Las igualdades que van al servidor (o se aplican sobre la copia en memoria, con el mismo criterio). */
  private igualdades(filtro: FiltroTickets): [string, unknown][] {
    const out: [string, unknown][] = [];
    if (filtro.estado) out.push(['estado', filtro.estado]);
    if (filtro.prioridad) out.push(['prioridad', filtro.prioridad]);
    if (filtro.grupo) out.push(['grupo', filtro.grupo]);
    if (filtro.agenteAsignadoUid) out.push(['agenteAsignadoUid', filtro.agenteAsignadoUid]);
    if (filtro.sinAsignar) out.push(['agenteAsignadoUid', null]);
    if (filtro.empresaId) out.push(['empresaId', filtro.empresaId]);
    if (filtro.solicitanteUid) out.push(['solicitanteUid', filtro.solicitanteUid]);
    if (filtro.canal) out.push(['canal', filtro.canal]);
    if (filtro.soloAbiertos) out.push(['abierto', true]);
    if (filtro.conPlatica) out.push(['conPlatica', true]);
    // Otro distribuidor sí va al servidor (sus tickets ya nacen con el campo); DATTASOFT no,
    // porque los tickets de antes del campo no lo traen y se perderían (ver `postFiltro`).
    if (filtro.distribuidor && filtro.distribuidor !== DISTRIBUIDOR_POR_DEFECTO) {
      out.push(['distribuidor', filtro.distribuidor]);
    }
    return out;
  }

  private aplicar(filtro: FiltroTickets): Query {
    let q: Query = this.db.collection(COL);
    for (const [campo, valor] of this.igualdades(filtro)) q = q.where(campo, '==', valor);
    return q;
  }

  /** Los tickets que cumplen las igualdades: de la copia en memoria si la hay, si no de Firestore. */
  private async traer(filtro: FiltroTickets): Promise<Ticket[]> {
    if (this.cache) {
      const igualdades = this.igualdades(filtro);
      return (await this.cache.todos('tickets'))
        .filter((d) => cumpleIgualdades(d.data, igualdades))
        .map((d) => TicketMapper.toDomain(d.id, d.data));
    }
    const snap = await this.aplicar(filtro).get();
    return snap.docs.map((d) => TicketMapper.toDomain(d.id, d.data()));
  }

  private postFiltro(tickets: Ticket[], filtro: FiltroTickets): Ticket[] {
    let out = tickets;
    // El campo es nuevo: los tickets creados antes no lo tienen en Firestore. Filtrar en
    // memoria (en vez de un `where` de Firestore) evita que esos documentos desaparezcan de
    // golpe de todas las vistas por no matchear una igualdad contra un campo ausente.
    if (filtro.archivado !== undefined) {
      out = out.filter((x) => x.archivado === filtro.archivado);
    }
    if (filtro.texto) out = out.filter((x) => coincideTexto(x, filtro.texto!));
    if (filtro.distribuidor) out = out.filter((x) => x.distribuidor === filtro.distribuidor);
    // Agente por uid o por nombre ("Agente" / "Canalizado a"): los migrados del viejo no traen uid.
    if (filtro.deAgente) out = out.filter((x) => ticketEsDeAgente(x, filtro.deAgente!));
    if (filtro.alcanceAgente) {
      const a = filtro.alcanceAgente;
      out = out.filter((x) => ticketEsDeAgente(x, a) || ticketDisponibleParaEquipo(x, a.admins));
    }
    // El `where` de uid nulo deja pasar los migrados que traen el agente solo por nombre.
    if (filtro.sinAsignar) out = out.filter(ticketSinNadieAsignado);
    // Tipo y facturación en memoria: evita pedir índices compuestos para cada combinación.
    if (filtro.tipo) out = out.filter((x) => x.tipo === filtro.tipo);
    if (filtro.facturacion) out = out.filter((x) => x.facturacion.estado === filtro.facturacion);
    if (filtro.soloProgramados) {
      // Campo nuevo — filtrar en memoria por el mismo motivo que `archivado`.
      return out
        .filter((x) => x.fechaHoraProgramada !== null)
        .sort((a, b) => a.fechaHoraProgramada!.getTime() - b.fechaHoraProgramada!.getTime());
    }
    // Orden por defecto: folio descendente (el más nuevo arriba), como el CRM viejo.
    return out.sort((a, b) => b.numero - a.numero);
  }

  async listar(filtro: FiltroTickets): Promise<Ticket[]> {
    const tickets = await this.traer(filtro);
    const filtrados = this.postFiltro(tickets, filtro);
    return filtro.limite ? filtrados.slice(0, filtro.limite) : filtrados;
  }

  async contar(filtro: FiltroTickets): Promise<number> {
    // Con la copia en memoria contar no cuesta lecturas (fuera del sello).
    if (this.cache) return (await this.listar({ ...filtro, limite: undefined })).length;
    // Con soloAbiertos ya es una query indexable; texto/archivado se filtran en memoria.
    const enMemoria =
      filtro.texto || filtro.tipo || filtro.facturacion || filtro.soloProgramados ||
      filtro.deAgente || filtro.alcanceAgente || filtro.sinAsignar ||
      filtro.distribuidor === DISTRIBUIDOR_POR_DEFECTO;
    if (!enMemoria && filtro.archivado === undefined) {
      const agg = await this.aplicar(filtro).count().get();
      return agg.data().count;
    }
    // "Sin la papelera" también se resuelve con conteos del servidor: todos menos los
    // archivados (los documentos viejos no traen el campo, así que no se filtra por `false`).
    if (!enMemoria && filtro.archivado === true) {
      const agg = await this.aplicar({ ...filtro, archivado: undefined }).where('archivado', '==', true).count().get();
      return agg.data().count;
    }
    if (!enMemoria && filtro.archivado === false) {
      const base = this.aplicar({ ...filtro, archivado: undefined });
      const [todos, enPapelera] = await Promise.all([
        base.count().get(),
        base.where('archivado', '==', true).count().get(),
      ]);
      return todos.data().count - enPapelera.data().count;
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
        const tickets = await this.traer({ agenteAsignadoUid: a.uid, soloAbiertos: true });
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
