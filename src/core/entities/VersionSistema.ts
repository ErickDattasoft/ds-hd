import { ValidationError } from '../errors/DomainError.js';

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
    this.updatedAt = props.updatedAt ?? new Date();
    this.actualizadoPorUid = props.actualizadoPorUid ?? null;
  }
}
