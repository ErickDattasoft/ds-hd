import { Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { Ticket, type CanalTicket, type CambioEstado } from '../../../core/entities/Ticket.js';
import { parsePrioridad } from '../../../core/entities/value-objects/Prioridad.js';
import type { EventoTicket, NotaTicket } from '../../../core/entities/NotaTicket.js';

const fecha = (v: unknown): Date | undefined =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : undefined;
const ts = (d: Date | null | undefined) => (d ? Timestamp.fromDate(d) : null);

/** Traduce entre `Ticket` y el documento `tickets/{id}`. */
export const TicketMapper = {
  toDomain(id: string, d: DocumentData): Ticket {
    const historial: CambioEstado[] = Array.isArray(d.historialEstados)
      ? d.historialEstados.map((h: DocumentData) => ({ estado: String(h.estado), at: fecha(h.at) ?? new Date() }))
      : [];
    return new Ticket({
      id,
      numero: Number(d.numero ?? 0),
      asunto: String(d.asunto ?? ''),
      descripcion: String(d.descripcion ?? ''),
      tipo: String(d.tipo ?? ''),
      sistema: d.sistema ?? null,
      estado: String(d.estado ?? 'Abierto'),
      prioridad: parsePrioridad(d.prioridad ?? 'Media'),
      grupo: d.grupo ?? null,
      canal: (d.canal ?? 'interno') as CanalTicket,
      empresaId: d.empresaId ?? null,
      empresaNombre: d.empresaNombre ?? null,
      contactoId: d.contactoId ?? null,
      contactoNombre: d.contactoNombre ?? null,
      contactoCorreo: d.contactoCorreo ?? null,
      agenteAsignadoUid: d.agenteAsignadoUid ?? null,
      agenteAsignadoNombre: d.agenteAsignadoNombre ?? null,
      origenPublicoId: d.origenPublicoId ?? null,
      solicitanteUid: d.solicitanteUid ?? null,
      creadoPorUid: d.creadoPorUid ?? null,
      tiempoTrabajadoMs: Number(d.tiempoTrabajadoMs ?? 0),
      sla: {
        horasResolucion: Number(d.sla?.horasResolucion ?? 24),
        pausadoDesde: fecha(d.sla?.pausadoDesde) ?? null,
        msPausadoTotal: Number(d.sla?.msPausadoTotal ?? 0),
      },
      facturacion: {
        requiere: Boolean(d.facturacion?.requiere),
        facturado: Boolean(d.facturacion?.facturado),
        notificadaEn: fecha(d.facturacion?.notificadaEn) ?? null,
      },
      abiertoEn: fecha(d.abiertoEn) ?? new Date(),
      ultimoCambioEstadoEn: fecha(d.ultimoCambioEstadoEn) ?? fecha(d.abiertoEn) ?? new Date(),
      primeraRespuestaEn: fecha(d.primeraRespuestaEn) ?? null,
      resueltoEn: fecha(d.resueltoEn) ?? null,
      cerradoEn: fecha(d.cerradoEn) ?? null,
      createdAt: fecha(d.createdAt) ?? new Date(),
      updatedAt: fecha(d.updatedAt) ?? new Date(),
      historialEstados: historial,
    });
  },

  toDocument(t: Ticket): DocumentData {
    return {
      numero: t.numero,
      asunto: t.asunto,
      descripcion: t.descripcion,
      tipo: t.tipo,
      sistema: t.sistema,
      estado: t.estado,
      estadoSlug: t.estado.toLowerCase(),
      prioridad: t.prioridad,
      grupo: t.grupo,
      canal: t.canal,
      empresaId: t.empresaId,
      empresaNombre: t.empresaNombre,
      contactoId: t.contactoId,
      contactoNombre: t.contactoNombre,
      contactoCorreo: t.contactoCorreo,
      agenteAsignadoUid: t.agenteAsignadoUid,
      agenteAsignadoNombre: t.agenteAsignadoNombre,
      origenPublicoId: t.origenPublicoId,
      solicitanteUid: t.solicitanteUid,
      creadoPorUid: t.creadoPorUid,
      tiempoTrabajadoMs: t.tiempoTrabajadoMs,
      sla: {
        horasResolucion: t.sla.horasResolucion,
        pausadoDesde: ts(t.sla.pausadoDesde),
        msPausadoTotal: t.sla.msPausadoTotal,
      },
      facturacion: {
        requiere: t.facturacion.requiere,
        facturado: t.facturacion.facturado,
        notificadaEn: ts(t.facturacion.notificadaEn),
      },
      abiertoEn: Timestamp.fromDate(t.abiertoEn),
      ultimoCambioEstadoEn: Timestamp.fromDate(t.ultimoCambioEstadoEn),
      primeraRespuestaEn: ts(t.primeraRespuestaEn),
      resueltoEn: ts(t.resueltoEn),
      cerradoEn: ts(t.cerradoEn),
      abierto: !t.esResuelto && !t.esCerrado,
      createdAt: Timestamp.fromDate(t.createdAt),
      updatedAt: Timestamp.fromDate(t.updatedAt),
      historialEstados: t.historialEstados.map((h) => ({ estado: h.estado, at: Timestamp.fromDate(h.at) })),
    };
  },

  notaToDoc(n: NotaTicket): DocumentData {
    return {
      tipo: n.tipo,
      cuerpo: n.cuerpo,
      autorUid: n.autorUid,
      autorNombre: n.autorNombre,
      createdAt: Timestamp.fromDate(n.createdAt),
    };
  },
  notaToDomain(id: string, d: DocumentData): NotaTicket {
    return {
      id,
      tipo: d.tipo === 'interna' ? 'interna' : 'publica',
      cuerpo: String(d.cuerpo ?? ''),
      autorUid: String(d.autorUid ?? ''),
      autorNombre: String(d.autorNombre ?? ''),
      createdAt: fecha(d.createdAt) ?? new Date(),
    };
  },

  eventoToDoc(e: EventoTicket): DocumentData {
    return {
      tipo: e.tipo,
      resumen: e.resumen,
      actorUid: e.actorUid,
      actorNombre: e.actorNombre,
      at: Timestamp.fromDate(e.at),
    };
  },
  eventoToDomain(id: string, d: DocumentData): EventoTicket {
    return {
      id,
      tipo: (d.tipo ?? 'nota') as EventoTicket['tipo'],
      resumen: String(d.resumen ?? ''),
      actorUid: d.actorUid ?? null,
      actorNombre: d.actorNombre ?? null,
      at: fecha(d.at) ?? new Date(),
    };
  },
};
