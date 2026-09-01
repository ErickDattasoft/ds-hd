import type { Firestore } from 'firebase-admin/firestore';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import {
  CONFIG_TICKETS_POR_DEFECTO,
  type ConfiguracionTickets,
} from '../../core/entities/ConfiguracionTickets.js';

const COL = 'configuracion';

/** Documentos singleton `configuracion/{seccion}`. */
export class FirestoreConfiguracionRepository implements IConfiguracionRepository {
  constructor(private readonly db: Firestore) {}

  async obtenerTickets(): Promise<ConfiguracionTickets> {
    const snap = await this.db.collection(COL).doc('tickets').get();
    if (!snap.exists) return { ...CONFIG_TICKETS_POR_DEFECTO };
    const d = snap.data()!;
    return {
      tipos: arr(d.tipos, CONFIG_TICKETS_POR_DEFECTO.tipos),
      sistemas: arr(d.sistemas, CONFIG_TICKETS_POR_DEFECTO.sistemas),
      grupos: arr(d.grupos, CONFIG_TICKETS_POR_DEFECTO.grupos),
      estados: arr(d.estados, CONFIG_TICKETS_POR_DEFECTO.estados),
      prioridades: arr(d.prioridades, CONFIG_TICKETS_POR_DEFECTO.prioridades),
      slaHoras: (d.slaHoras as Record<string, number>) ?? { ...CONFIG_TICKETS_POR_DEFECTO.slaHoras },
      tiposFacturables: arr(d.tiposFacturables, CONFIG_TICKETS_POR_DEFECTO.tiposFacturables),
      estadoInicial: String(d.estadoInicial ?? CONFIG_TICKETS_POR_DEFECTO.estadoInicial),
      correosNotificacion: arr(d.correosNotificacion, []),
    };
  }

  async guardarTickets(config: ConfiguracionTickets): Promise<void> {
    await this.db.collection(COL).doc('tickets').set(config, { merge: true });
  }
}

function arr(v: unknown, fallback: readonly string[]): string[] {
  return Array.isArray(v) && v.length ? v.map(String) : [...fallback];
}
