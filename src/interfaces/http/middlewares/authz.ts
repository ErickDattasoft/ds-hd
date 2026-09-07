import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../../core/errors/DomainError.js';
import type { Permiso } from '../rbac/permissions.js';

/** Exige sesión. Redirige al login si es una navegación HTML; 401 si es API/htmx. */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.user) return next();
  if (req.accepts('html') && req.method === 'GET') {
    const destino = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?next=${destino}`);
  }
  next(new UnauthorizedError());
};

/** Exige un permiso del catálogo (sin chequeo por recurso; eso va en el controller). */
export function requirePermission(permiso: Permiso): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!req.user.permisos.includes(permiso)) {
      return next(new ForbiddenError());
    }
    next();
  };
}

/** Área back-office: cualquier rol de staff. */
export const requireStaff: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new UnauthorizedError());
  if (!req.user.esStaff) return next(new ForbiddenError('Área exclusiva del personal'));
  next();
};

/** Área portal: solo clientes. */
export const requireCliente: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new UnauthorizedError());
  if (!req.user.esCliente) return next(new ForbiddenError('Área exclusiva de clientes'));
  next();
};
