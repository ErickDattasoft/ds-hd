import { type DocumentData } from 'firebase-admin/firestore';
import { Timestamp } from '../../../core/entities/value-objects/Timestamp.js';
import { Usuario } from '../../../core/entities/Usuario.js';
import { parseRol } from '../../../core/entities/value-objects/Rol.js';

const fecha = (v: unknown): Date | undefined =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : undefined;

/** Traduce entre la entidad `Usuario` y el documento Firestore `usuarios/{uid}`. */
export const UsuarioMapper = {
  toDomain(uid: string, data: DocumentData): Usuario {
    return new Usuario({
      uid,
      email: String(data.email ?? ''),
      nombre: String(data.nombre ?? ''),
      rol: parseRol(data.rol),
      permisosExtra: Array.isArray(data.permisosExtra) ? data.permisosExtra.map(String) : [],
      permisosRevocados: Array.isArray(data.permisosRevocados)
        ? data.permisosRevocados.map(String)
        : [],
      activo: data.activo !== false,
      empresaId: data.empresaId ?? null,
      agente: {
        grupo: data.agente?.grupo ?? null,
        capacidadMax: Number(data.agente?.capacidadMax ?? 0),
        disponibleAsignacion: data.agente?.disponibleAsignacion !== false,
      },
      firma: data.firma ?? null,
      createdAt: fecha(data.createdAt) ?? new Date(),
      updatedAt: fecha(data.updatedAt) ?? new Date(),
      lastLoginAt: fecha(data.lastLoginAt) ?? null,
    });
  },

  toDocument(u: Usuario): DocumentData {
    return {
      email: u.email.value,
      nombre: u.nombre,
      rol: u.rol,
      permisosExtra: u.permisosExtra,
      permisosRevocados: u.permisosRevocados,
      activo: u.activo,
      empresaId: u.empresaId,
      agente: {
        grupo: u.agente.grupo,
        capacidadMax: u.agente.capacidadMax,
        disponibleAsignacion: u.agente.disponibleAsignacion,
      },
      firma: u.firma,
      createdAt: Timestamp.fromDate(u.createdAt),
      updatedAt: Timestamp.fromDate(u.updatedAt),
      lastLoginAt: u.lastLoginAt ? Timestamp.fromDate(u.lastLoginAt) : null,
      emailLower: u.email.value,
    };
  },
};
