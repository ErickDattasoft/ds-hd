import type { Contacto } from '../../entities/Contacto.js';

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
  contarPorEmpresa(empresaId: string): Promise<number>;
}
