import type { EntradaBitacora } from '../../entities/EntradaBitacora.js';

/** Filtros para consultar la bitácora de auditoría. */
export interface FiltroBitacora {
  modulo?: string;
  actorUid?: string;
  entidadId?: string;
  /** Solo entradas con fecha `>= desde`. */
  desde?: Date;
  /** Solo entradas con fecha `<= hasta`. */
  hasta?: Date;
  limite?: number;
}

/** Registro de auditoría global (`bitacora/{id}`), solo escritura vía append. */
export interface IBitacoraRepository {
  registrar(entrada: EntradaBitacora): Promise<void>;
  listar(filtro?: FiltroBitacora): Promise<EntradaBitacora[]>;
  /**
   * Borra entradas con fecha anterior a `fecha`, empezando por las más viejas.
   * `maxBorrar` acota el trabajo por llamada; `hayMas` indica si quedaron pendientes.
   */
  purgar(fecha: Date, maxBorrar?: number): Promise<{ borradas: number; hayMas: boolean }>;
}
