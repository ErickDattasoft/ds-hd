import { ValidationError } from '../errors/DomainError.js';

/** Estado de la licencia de un sistema respecto de su fecha de vigencia. */
export type EstadoVigencia = 'sin_dato' | 'vigente' | 'por_vencer' | 'vencida';

/** Días antes del vencimiento en que una licencia pasa a marcarse "por vencer". */
export const DIAS_AVISO_VIGENCIA = 30;

const RE_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Días de calendario entre `desde` y una fecha ISO `YYYY-MM-DD` (negativo si ya pasó). */
function diasHasta(desde: Date, fechaISO: string): number {
  const [a, m, d] = fechaISO.split('-').map(Number) as [number, number, number];
  const inicio = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const fin = Date.UTC(a, m - 1, d);
  return Math.round((fin - inicio) / 86_400_000);
}

/** Licencia de un sistema con su estado calculado. */
export interface LicenciaSistema {
  sistema: string;
  fecha: string;
  dias: number;
  estado: EstadoVigencia;
}

/** Props para construir una {@link Empresa}. */
export interface EmpresaProps {
  id: string;
  nombre: string;
  rfc?: string | null;
  razonSocial?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  sistemasContratados?: string[];
  /** Vigencia de licencia por sistema, formato ISO `YYYY-MM-DD`. */
  vigencias?: Record<string, string>;
  /** Versión instalada por sistema (texto libre, p. ej. `16.3.1 SP2`). */
  versionesInstaladas?: Record<string, string>;
  contactoPrincipalId?: string | null;
  notas?: string | null;
  activa?: boolean;
  creadoPorUid?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Empresa/cliente del CRM. */
export class Empresa {
  readonly id: string;
  nombre: string;
  rfc: string | null;
  razonSocial: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  sistemasContratados: string[];
  vigencias: Record<string, string>;
  versionesInstaladas: Record<string, string>;
  contactoPrincipalId: string | null;
  notas: string | null;
  activa: boolean;
  readonly creadoPorUid: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: EmpresaProps) {
    if (props.nombre.trim().length < 2) {
      throw new ValidationError('El nombre de la empresa es obligatorio', { nombre: 'Requerido' });
    }
    this.id = props.id;
    this.nombre = props.nombre.trim();
    this.rfc = props.rfc?.trim().toUpperCase() || null;
    this.razonSocial = props.razonSocial?.trim() || null;
    this.direccion = props.direccion?.trim() || null;
    this.telefono = props.telefono?.trim() || null;
    this.email = props.email?.trim().toLowerCase() || null;
    this.sistemasContratados = [...new Set((props.sistemasContratados ?? []).map((s) => s.trim()).filter(Boolean))];
    this.vigencias = Empresa.sanearVigencias(props.vigencias, this.sistemasContratados);
    this.versionesInstaladas = Empresa.sanearMapaSistemas(props.versionesInstaladas, this.sistemasContratados);
    this.contactoPrincipalId = props.contactoPrincipalId ?? null;
    this.notas = props.notas?.trim() || null;
    this.activa = props.activa ?? true;
    this.creadoPorUid = props.creadoPorUid ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  archivar(ahora: Date): void {
    this.activa = false;
    this.updatedAt = ahora;
  }
  restaurar(ahora: Date): void {
    this.activa = true;
    this.updatedAt = ahora;
  }

  /** Deja solo entradas de un mapa {sistema → valor} cuyo sistema sigue contratado. */
  static sanearMapaSistemas(
    mapa: Record<string, string> | undefined,
    sistemasContratados: string[],
    validar: (valor: string) => boolean = (v) => v.trim().length > 0,
  ): Record<string, string> {
    const limpio: Record<string, string> = {};
    for (const [sistema, valor] of Object.entries(mapa ?? {})) {
      const s = sistema.trim();
      const v = String(valor ?? '').trim();
      if (s && sistemasContratados.includes(s) && validar(v)) {
        limpio[s] = v;
      }
    }
    return limpio;
  }

  /** Deja solo vigencias con fecha ISO válida y cuyo sistema sigue contratado. */
  static sanearVigencias(
    vigencias: Record<string, string> | undefined,
    sistemasContratados: string[],
  ): Record<string, string> {
    return Empresa.sanearMapaSistemas(vigencias, sistemasContratados, (v) => RE_FECHA_ISO.test(v));
  }

  /** Estado de la licencia de un sistema contratado a la fecha `hoy`. */
  estadoVigencia(sistema: string, hoy: Date): EstadoVigencia {
    const fecha = this.vigencias[sistema.trim()];
    if (!fecha) return 'sin_dato';
    const dias = diasHasta(hoy, fecha);
    if (dias < 0) return 'vencida';
    if (dias <= DIAS_AVISO_VIGENCIA) return 'por_vencer';
    return 'vigente';
  }

  /** Sistemas contratados con licencia vencida o por vencer, ordenados por urgencia. */
  licenciasEnRiesgo(hoy: Date): LicenciaSistema[] {
    return this.sistemasContratados
      .map((sistema) => ({ sistema, fecha: this.vigencias[sistema] }))
      .filter((x): x is { sistema: string; fecha: string } => Boolean(x.fecha))
      .map((x) => ({ ...x, dias: diasHasta(hoy, x.fecha), estado: this.estadoVigencia(x.sistema, hoy) }))
      .filter((x) => x.estado === 'vencida' || x.estado === 'por_vencer')
      .sort((a, b) => a.dias - b.dias);
  }
}
