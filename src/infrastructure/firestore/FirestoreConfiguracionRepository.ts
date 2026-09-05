import type { Firestore } from 'firebase-admin/firestore';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import {
  CONFIG_TICKETS_POR_DEFECTO,
  type ConfiguracionTickets,
} from '../../core/entities/ConfiguracionTickets.js';
import {
  CONFIG_CALCULADORA_POR_DEFECTO,
  type ConfiguracionCalculadora,
} from '../../core/entities/CalculadoraCompac.js';
import {
  CONFIG_AVISOS_POR_DEFECTO,
  type ConfiguracionAvisos,
  type ContactoSoporte,
} from '../../core/entities/ConfiguracionAvisos.js';
import {
  CONFIG_INTEGRACIONES_POR_DEFECTO,
  sanearReglas,
  type ConfiguracionIntegraciones,
} from '../../core/entities/ConfiguracionIntegraciones.js';

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

  async obtenerCalculadora(): Promise<ConfiguracionCalculadora> {
    const snap = await this.db.collection(COL).doc('calculadora').get();
    if (!snap.exists) return { ...CONFIG_CALCULADORA_POR_DEFECTO };
    const d = snap.data()!;
    return {
      sistemas: Array.isArray(d.sistemas) && d.sistemas.length ? d.sistemas : CONFIG_CALCULADORA_POR_DEFECTO.sistemas,
      sql: d.sql ?? CONFIG_CALCULADORA_POR_DEFECTO.sql,
      ivaTasa: typeof d.ivaTasa === 'number' ? d.ivaTasa : CONFIG_CALCULADORA_POR_DEFECTO.ivaTasa,
      moneda: String(d.moneda ?? CONFIG_CALCULADORA_POR_DEFECTO.moneda),
    };
  }

  async guardarCalculadora(config: ConfiguracionCalculadora): Promise<void> {
    await this.db.collection(COL).doc('calculadora').set(config, { merge: true });
  }

  async obtenerAvisos(): Promise<ConfiguracionAvisos> {
    const snap = await this.db.collection(COL).doc('avisos').get();
    if (!snap.exists) return { ...CONFIG_AVISOS_POR_DEFECTO };
    const d = snap.data()!;
    return {
      plantillaVersiones: String(d.plantillaVersiones ?? CONFIG_AVISOS_POR_DEFECTO.plantillaVersiones),
      plantillaLicencias: String(d.plantillaLicencias ?? CONFIG_AVISOS_POR_DEFECTO.plantillaLicencias),
      contactosSoporteVersiones: contactos(d.contactosSoporteVersiones),
      contactosSoporteLicencias: contactos(d.contactosSoporteLicencias),
    };
  }

  async guardarAvisos(config: ConfiguracionAvisos): Promise<void> {
    await this.db.collection(COL).doc('avisos').set(config, { merge: true });
  }

  async obtenerIntegraciones(): Promise<ConfiguracionIntegraciones> {
    const snap = await this.db.collection(COL).doc('integraciones').get();
    if (!snap.exists) return { ...CONFIG_INTEGRACIONES_POR_DEFECTO };
    const d = snap.data()!;
    return {
      n8nWebhookTickets: String(d.n8nWebhookTickets ?? ''),
      n8nWebhookCotizaciones: String(d.n8nWebhookCotizaciones ?? ''),
      whatsappHabilitado: Boolean(d.whatsappHabilitado),
      whatsappTelefono: String(d.whatsappTelefono ?? ''),
      whatsappApiKey: String(d.whatsappApiKey ?? ''),
      reglas: sanearReglas(d.reglas),
    };
  }

  async guardarIntegraciones(config: ConfiguracionIntegraciones): Promise<void> {
    await this.db.collection(COL).doc('integraciones').set(config, { merge: true });
  }
}

function contactos(v: unknown): ContactoSoporte[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => ({ nombre: String((x as Record<string, unknown>)?.nombre ?? ''), telefono: String((x as Record<string, unknown>)?.telefono ?? '') }))
    .filter((c) => c.nombre || c.telefono);
}

function arr(v: unknown, fallback: readonly string[]): string[] {
  return Array.isArray(v) && v.length ? v.map(String) : [...fallback];
}
