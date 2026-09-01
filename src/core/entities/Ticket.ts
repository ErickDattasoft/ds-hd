import { ConflictError, ValidationError } from '../errors/DomainError.js';
import { parsePrioridad, SLA_HORAS_POR_DEFECTO, type Prioridad } from './value-objects/Prioridad.js';
import {
  esEstadoEspera,
  esEstadoFinal,
  esEstadoPausaSla,
  esEstadoResuelto,
  esEstadoCerrado,
  slugEstado,
  validarTransicion,
} from './value-objects/EstadoTicket.js';

export type CanalTicket = 'interno' | 'publico' | 'portal' | 'correo';

export interface CambioEstado {
  estado: string;
  at: Date;
}

export interface SlaState {
  /** Horas objetivo de resolución (según prioridad al crear; no se recalcula sola). */
  horasResolucion: number;
  /** Momento desde el que el SLA está pausado (estado "pendiente"), o null. */
  pausadoDesde: Date | null;
  /** Milisegundos acumulados en pausa. */
  msPausadoTotal: number;
}

export interface FacturacionState {
  /** Si el tipo de ticket amerita facturación (p. ej. consultorías). */
  requiere: boolean;
  facturado: boolean;
  notificadaEn: Date | null;
}

export interface TicketProps {
  id: string;
  numero: number;
  asunto: string;
  descripcion: string;
  tipo: string;
  sistema?: string | null;
  estado: string;
  prioridad: Prioridad;
  grupo?: string | null;
  canal: CanalTicket;

  empresaId?: string | null;
  empresaNombre?: string | null;
  contactoId?: string | null;
  contactoNombre?: string | null;
  contactoCorreo?: string | null;

  agenteAsignadoUid?: string | null;
  agenteAsignadoNombre?: string | null;

  origenPublicoId?: string | null;
  solicitanteUid?: string | null;
  creadoPorUid?: string | null;

  sla?: Partial<SlaState>;
  facturacion?: Partial<FacturacionState>;
  tiempoTrabajadoMs?: number;

  abiertoEn?: Date;
  ultimoCambioEstadoEn?: Date;
  primeraRespuestaEn?: Date | null;
  resueltoEn?: Date | null;
  cerradoEn?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  historialEstados?: CambioEstado[];
}

/** Resultado de una mutación: describe qué pasó para la bitácora y los efectos colaterales. */
export interface ResultadoCambioEstado {
  anterior: string;
  nuevo: string;
  quedoResuelto: boolean;
  quedoCerrado: boolean;
}

/**
 * Ticket de soporte. Encapsula el ciclo de vida (transiciones de estado válidas), el cálculo
 * de tiempo trabajado y el reloj de SLA con pausa. No conoce Firestore ni HTTP.
 */
export class Ticket {
  readonly id: string;
  readonly numero: number;
  asunto: string;
  descripcion: string;
  tipo: string;
  sistema: string | null;
  estado: string;
  prioridad: Prioridad;
  grupo: string | null;
  readonly canal: CanalTicket;

  empresaId: string | null;
  empresaNombre: string | null;
  contactoId: string | null;
  contactoNombre: string | null;
  contactoCorreo: string | null;

  agenteAsignadoUid: string | null;
  agenteAsignadoNombre: string | null;

  readonly origenPublicoId: string | null;
  readonly solicitanteUid: string | null;
  readonly creadoPorUid: string | null;

  sla: SlaState;
  facturacion: FacturacionState;
  tiempoTrabajadoMs: number;

  readonly abiertoEn: Date;
  ultimoCambioEstadoEn: Date;
  primeraRespuestaEn: Date | null;
  resueltoEn: Date | null;
  cerradoEn: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
  historialEstados: CambioEstado[];

  constructor(props: TicketProps) {
    this.id = props.id;
    this.numero = props.numero;
    this.asunto = props.asunto.trim();
    this.descripcion = props.descripcion;
    this.tipo = props.tipo;
    this.sistema = props.sistema ?? null;
    this.estado = props.estado;
    this.prioridad = parsePrioridad(props.prioridad);
    this.grupo = props.grupo ?? null;
    this.canal = props.canal;

    this.empresaId = props.empresaId ?? null;
    this.empresaNombre = props.empresaNombre ?? null;
    this.contactoId = props.contactoId ?? null;
    this.contactoNombre = props.contactoNombre ?? null;
    this.contactoCorreo = props.contactoCorreo ?? null;

    this.agenteAsignadoUid = props.agenteAsignadoUid ?? null;
    this.agenteAsignadoNombre = props.agenteAsignadoNombre ?? null;

    this.origenPublicoId = props.origenPublicoId ?? null;
    this.solicitanteUid = props.solicitanteUid ?? null;
    this.creadoPorUid = props.creadoPorUid ?? null;

    const abierto = props.abiertoEn ?? new Date();
    this.abiertoEn = abierto;
    this.ultimoCambioEstadoEn = props.ultimoCambioEstadoEn ?? abierto;
    this.primeraRespuestaEn = props.primeraRespuestaEn ?? null;
    this.resueltoEn = props.resueltoEn ?? null;
    this.cerradoEn = props.cerradoEn ?? null;
    this.createdAt = props.createdAt ?? abierto;
    this.updatedAt = props.updatedAt ?? this.createdAt;
    this.historialEstados = props.historialEstados ?? [{ estado: props.estado, at: abierto }];

    this.tiempoTrabajadoMs = props.tiempoTrabajadoMs ?? 0;
    this.sla = {
      horasResolucion: props.sla?.horasResolucion ?? SLA_HORAS_POR_DEFECTO[this.prioridad],
      pausadoDesde: props.sla?.pausadoDesde ?? (esEstadoPausaSla(props.estado) ? abierto : null),
      msPausadoTotal: props.sla?.msPausadoTotal ?? 0,
    };
    this.facturacion = {
      requiere: props.facturacion?.requiere ?? false,
      facturado: props.facturacion?.facturado ?? false,
      notificadaEn: props.facturacion?.notificadaEn ?? null,
    };
  }

  // ── Fábrica ────────────────────────────────────────────────────────────────
  static crear(input: {
    id: string;
    numero: number;
    asunto: string;
    descripcion: string;
    tipo: string;
    prioridad: Prioridad;
    estadoInicial: string;
    canal: CanalTicket;
    sistema?: string | null;
    grupo?: string | null;
    empresaId?: string | null;
    empresaNombre?: string | null;
    contactoId?: string | null;
    contactoNombre?: string | null;
    contactoCorreo?: string | null;
    solicitanteUid?: string | null;
    creadoPorUid?: string | null;
    origenPublicoId?: string | null;
    requiereFacturacion?: boolean;
    horasSla?: number;
    ahora: Date;
  }): Ticket {
    if (input.asunto.trim().length < 3) {
      throw new ValidationError('El asunto es muy corto', { asunto: 'Mínimo 3 caracteres' });
    }
    if (input.descripcion.trim().length < 5) {
      throw new ValidationError('Describe el problema', { descripcion: 'Mínimo 5 caracteres' });
    }
    return new Ticket({
      ...input,
      estado: input.estadoInicial,
      abiertoEn: input.ahora,
      ultimoCambioEstadoEn: input.ahora,
      sla: { horasResolucion: input.horasSla ?? SLA_HORAS_POR_DEFECTO[input.prioridad] },
      facturacion: { requiere: input.requiereFacturacion ?? false },
      historialEstados: [{ estado: input.estadoInicial, at: input.ahora }],
    });
  }

  // ── Estado ─────────────────────────────────────────────────────────────────
  get estaAbierto(): boolean {
    return !esEstadoFinal(this.estado);
  }

  cambiarEstado(nuevo: string, catalogo: readonly string[], ahora: Date): ResultadoCambioEstado {
    validarTransicion(this.estado, nuevo, catalogo);
    const anterior = this.estado;

    this.acumularTiempoYPausa(anterior, nuevo, ahora);

    this.estado = nuevo;
    this.ultimoCambioEstadoEn = ahora;
    this.historialEstados.push({ estado: nuevo, at: ahora });
    this.updatedAt = ahora;

    if (esEstadoResuelto(nuevo)) {
      this.resueltoEn ??= ahora;
    } else {
      this.resueltoEn = null; // se reabrió
    }
    if (esEstadoCerrado(nuevo)) {
      this.cerradoEn ??= ahora;
      this.resueltoEn ??= ahora;
    } else {
      this.cerradoEn = null;
    }

    return {
      anterior,
      nuevo,
      quedoResuelto: esEstadoResuelto(nuevo),
      quedoCerrado: esEstadoCerrado(nuevo),
    };
  }

  private acumularTiempoYPausa(anterior: string, nuevo: string, ahora: Date): void {
    const transcurrido = Math.max(0, ahora.getTime() - this.ultimoCambioEstadoEn.getTime());
    if (!esEstadoEspera(anterior) && !esEstadoFinal(anterior)) {
      this.tiempoTrabajadoMs += transcurrido;
    }

    const eraPausa = esEstadoPausaSla(anterior);
    const seraPausa = esEstadoPausaSla(nuevo);
    if (!eraPausa && seraPausa) {
      this.sla.pausadoDesde = ahora;
    } else if (eraPausa && !seraPausa && this.sla.pausadoDesde) {
      this.sla.msPausadoTotal += Math.max(0, ahora.getTime() - this.sla.pausadoDesde.getTime());
      this.sla.pausadoDesde = null;
    }
  }

  // ── Asignación ─────────────────────────────────────────────────────────────
  asignar(agenteUid: string, agenteNombre: string, ahora: Date): void {
    if (this.agenteAsignadoUid === agenteUid) {
      throw new ConflictError(`El ticket ya está asignado a ${agenteNombre}`);
    }
    this.agenteAsignadoUid = agenteUid;
    this.agenteAsignadoNombre = agenteNombre;
    this.updatedAt = ahora;
  }

  desasignar(ahora: Date): void {
    this.agenteAsignadoUid = null;
    this.agenteAsignadoNombre = null;
    this.updatedAt = ahora;
  }

  registrarPrimeraRespuesta(ahora: Date): void {
    this.primeraRespuestaEn ??= ahora;
    this.updatedAt = ahora;
  }

  marcarFacturado(facturado: boolean, ahora: Date): void {
    this.facturacion.facturado = facturado;
    this.updatedAt = ahora;
  }

  // ── SLA ────────────────────────────────────────────────────────────────────
  /** Milisegundos "de reloj SLA" consumidos hasta `ahora` (descontando pausas). */
  slaConsumidoMs(ahora: Date): number {
    const fin = this.resueltoEn ?? ahora;
    const bruto = Math.max(0, fin.getTime() - this.abiertoEn.getTime());
    const pausaEnCurso =
      this.sla.pausadoDesde && !this.resueltoEn
        ? Math.max(0, ahora.getTime() - this.sla.pausadoDesde.getTime())
        : 0;
    return Math.max(0, bruto - this.sla.msPausadoTotal - pausaEnCurso);
  }

  slaObjetivoMs(): number {
    return this.sla.horasResolucion * 3_600_000;
  }

  estaVencido(ahora: Date): boolean {
    if (esEstadoResuelto(this.estado) || esEstadoCerrado(this.estado)) return false;
    return this.slaConsumidoMs(ahora) > this.slaObjetivoMs();
  }

  /** ms restantes antes de incumplir el SLA (negativo si ya venció). */
  slaRestanteMs(ahora: Date): number {
    return this.slaObjetivoMs() - this.slaConsumidoMs(ahora);
  }

  get esResuelto(): boolean {
    return esEstadoResuelto(this.estado);
  }
  get esCerrado(): boolean {
    return esEstadoCerrado(this.estado);
  }

  /** ¿El estado actual está fuera del catálogo dado? (para avisos de UI) */
  estadoFueraDeCatalogo(catalogo: readonly string[]): boolean {
    return !catalogo.some((e) => slugEstado(e) === slugEstado(this.estado));
  }
}
