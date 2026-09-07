import type { Empresa } from '../../entities/Empresa.js';

/** Filtros para listar empresas. */
export interface ListarEmpresasFiltro {
  activa?: boolean;
  texto?: string;
  /** Solo empresas marcadas como favoritas. */
  favorita?: boolean;
  /** Solo empresas con este sistema contratado. */
  sistema?: string;
}

/** Persistencia de empresas (`empresas/{id}`). */
export interface IEmpresaRepository {
  findById(id: string): Promise<Empresa | null>;
  list(filtro?: ListarEmpresasFiltro): Promise<Empresa[]>;
  save(empresa: Empresa): Promise<void>;
  /** Borrado permanente (solo desde la papelera). */
  eliminar(id: string): Promise<void>;
  existePorNombre(nombre: string, exceptoId?: string): Promise<boolean>;
}
