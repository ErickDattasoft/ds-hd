import type { RequestHandler } from 'express';
import type { IUsuarioRepository } from '../../../core/ports/repositories/IUsuarioRepository.js';
import type { ISessionManager } from '../../../core/ports/services/ISessionManager.js';
import type { ILogger } from '../../../core/ports/services/ILogger.js';
import type { Usuario } from '../../../core/entities/Usuario.js';
import type { Container } from '../../../config/container.js';
import type { SessionUser } from '../../../application/shared/SessionUser.js';
import { SESSION_COOKIE_NAME, USER_CACHE_TTL_MS } from '../../../config/constants.js';
import { permisosEfectivos } from '../rbac/policy.js';

const cache = new Map<string, { usuario: Usuario; exp: number }>();

function aSessionUser(u: Usuario): SessionUser {
  return {
    uid: u.uid,
    nombre: u.nombre,
    email: u.email.value,
    rol: u.rol,
    empresaId: u.empresaId,
    activo: u.activo,
    esStaff: u.esStaff,
    esCliente: u.esCliente,
    permisos: permisosEfectivos(u),
    firma: u.firma,
  };
}

/** Limpia la caché de un usuario (tras editarlo). */
export function invalidarCacheUsuario(uid: string): void {
  cache.delete(uid);
}

/**
 * Lee la cookie de sesión, resuelve el usuario y lo cuelga en `req.user` / `res.locals.user`.
 * No exige sesión — de eso se encargan `requireAuth` y compañía.
 */
export function sessionAuth(container: Container, logger: ILogger): RequestHandler {
  return async (req, res, next) => {
    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (!token) return next();

    const sesiones: ISessionManager = container.resolve('sessionManager');
    const usuarios: IUsuarioRepository = container.resolve('usuarioRepo');

    try {
      const claims = await sesiones.verify(token);
      if (!claims) {
        res.clearCookie(SESSION_COOKIE_NAME);
        return next();
      }

      const ahora = Date.now();
      const hit = cache.get(claims.uid);
      let usuario = hit && hit.exp > ahora ? hit.usuario : null;
      if (!usuario) {
        usuario = await usuarios.findByUid(claims.uid);
        if (usuario) cache.set(claims.uid, { usuario, exp: ahora + USER_CACHE_TTL_MS });
      }

      if (usuario && usuario.activo) {
        req.user = aSessionUser(usuario);
        res.locals.user = req.user;
      } else {
        res.clearCookie(SESSION_COOKIE_NAME);
      }
    } catch (err) {
      logger.warn('sessionAuth: fallo al resolver la sesión', {
        err: err instanceof Error ? err.message : err,
      });
      res.clearCookie(SESSION_COOKIE_NAME);
    }
    next();
  };
}
