import type { Empresa } from '../../entities/Empresa.js';

/** Filtros para listar empresas. */
export interface ListarEmpresasFiltro {
  activa?: boolean;
  texto?: string;
}

/** Persistencia de empresas (`empresas/{id}`). */
export interface IEmpresaRepository {
  findById(id: string): Promise<Empresa | null>;
  list(filtro?: ListarEmpresasFiltro): Promise<Empresa[]>;
  save(empresa: Empresa): Promise<void>;
  existePorNombre(nombre: string, exceptoId?: string): Promise<boolean>;
}
