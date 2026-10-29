import { ValidationError } from '../errors/DomainError.js';

/** Un service pack (o solución fuera de versión) de la versión registrada, con su propia descarga. */
export interface ServicePackVersion {
  numero: number;
  fecha: string | null;
  linkDescarga: string | null;
  /** De dónde salió (título en la página de CONTPAQi), si se trajo de ahí. */
  nota: string | null;
}

/** "19.1.2 Sp 1" → { base: "19.1.2", sp: 1 }; "8.9.8" → { base: "8.9.8", sp: 0 }. */
export function separarVersion(v: string): { base: string; sp: number } {
  const m = /^(.*?)\s*\bsp\s*(\d+)\s*$/i.exec(v.trim());
  return m ? { base: m[1]!.trim(), sp: Number.parseInt(m[2]!, 10) } : { base: v.trim(), sp: 0 };
}

/** Versión + el SP más alto, en el formato con el que se compara: "12.1.0 Sp 2". */
export function componerVersion(base: string, sps: number[]): string {
  const max = Math.max(0, ...sps);
  return max > 0 ? `${base.trim()} Sp ${max}` : base.trim();
}

/** SP válidos (número > 0), uno por número, de menor a mayor. */
export function sanearServicePacks(v: unknown): ServicePackVersion[] {
  if (!Array.isArray(v)) return [];
  const porNumero = new Map<number, ServicePackVersion>();
  for (const x of v as Array<Record<string, unknown>>) {
    const numero = Number(x?.numero);
    if (!Number.isInteger(numero) || numero < 1) continue;
    const texto = (y: unknown) => (typeof y === 'string' && y.trim() ? y.trim() : null);
    porNumero.set(numero, { numero, fecha: texto(x.fecha), linkDescarga: texto(x.linkDescarga), nota: texto(x.nota) });
  }
  return [...porNumero.values()].sort((a, b) => a.numero - b.numero);
}

/** Props para construir una {@link VersionSistema}. */
export interface VersionSistemaProps {
  id: string;
  sistema: string;
  versionActual: string;
  fechaLiberacion?: string | null;
  notasVersion?: string | null;
  linkDescarga?: string | null;
  /** Enlace a la carta técnica oficial del sistema. */
  linkCartaTecnica?: string | null;
  /** SP de la versión, cada uno con su descarga (fecha y links de arriba son los de la versión). */
  servicePacks?: ServicePackVersion[];
  updatedAt?: Date;
  actualizadoPorUid?: string | null;
}

/** Versión vigente de un sistema (CONTPAQi/Compac) que el equipo instala/soporta. */
export class VersionSistema {
  readonly id: string;
  sistema: string;
  versionActual: string;
  fechaLiberacion: string | null;
  notasVersion: string | null;
  linkDescarga: string | null;
  linkCartaTecnica: string | null;
  servicePacks: ServicePackVersion[];
  updatedAt: Date;
  actualizadoPorUid: string | null;

  constructor(props: VersionSistemaProps) {
    if (props.sistema.trim().length < 2) {
      throw new ValidationError('El sistema es obligatorio', { sistema: 'Requerido' });
    }
    if (props.versionActual.trim().length < 1) {
      throw new ValidationError('La versión es obligatoria', { versionActual: 'Requerida' });
    }
    this.id = props.id;
    this.sistema = props.sistema.trim();
    this.versionActual = props.versionActual.trim();
    this.fechaLiberacion = props.fechaLiberacion?.trim() || null;
    this.notasVersion = props.notasVersion?.trim() || null;
    this.linkDescarga = props.linkDescarga?.trim() || null;
    this.linkCartaTecnica = props.linkCartaTecnica?.trim() || null;
    this.servicePacks = sanearServicePacks(props.servicePacks);
    this.updatedAt = props.updatedAt ?? new Date();
    this.actualizadoPorUid = props.actualizadoPorUid ?? null;
  }
}
