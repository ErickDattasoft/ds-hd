import type { Contacto } from '../../entities/Contacto.js';

/** Filtros para listar contactos. */
export interface ListarContactosFiltro {
  empresaId?: string;
  activo?: boolean;
  esPortal?: boolean;
  texto?: string;
}

/** Persistencia de contactos (`contactos/{id}`). */
export interface IContactoRepository {
  findById(id: string): Promise<Contacto | null>;
  findByUid(uid: string): Promise<Contacto | null>;
  findByEmail(email: string): Promise<Contacto | null>;
  list(filtro?: ListarContactosFiltro): Promise<Contacto[]>;
  save(contacto: Contacto): Promise<void>;
  /** Borrado permanente (solo desde la papelera). */
  eliminar(id: string): Promise<void>;
  contarPorEmpresa(empresaId: string): Promise<number>;
}
