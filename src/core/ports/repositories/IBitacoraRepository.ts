import type { EntradaBitacora } from '../../entities/EntradaBitacora.js';

/** Filtros para consultar la bitácora de auditoría. */
export interface FiltroBitacora {
  modulo?: string;
  actorUid?: string;
  entidadId?: string;
  limite?: number;
}

/** Registro de auditoría global (`bitacora/{id}`), solo escritura vía append. */
export interface IBitacoraRepository {
  registrar(entrada: EntradaBitacora): Promise<void>;
  listar(filtro?: FiltroBitacora): Promise<EntradaBitacora[]>;
}
