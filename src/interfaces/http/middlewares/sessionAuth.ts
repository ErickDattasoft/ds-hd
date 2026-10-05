import type { RequestHandler } from 'express';
import type { IUsuarioRepository } from '../../../core/ports/repositories/IUsuarioRepository.js';
import type { ISessionManager } from '../../../core/ports/services/ISessionManager.js';
import type { ILogger } from '../../../core/ports/services/ILogger.js';
import type { Usuario } from '../../../core/entities/Usuario.js';
import type { Container } from '../../../config/container.js';
import type { SessionUser } from '../../../application/shared/SessionUser.js';
import {
  SESSION_COOKIE_MAX_AGE_MS,
  SESSION_COOKIE_NAME,
  SESSION_TOUCH_INTERVAL_MS,
  USER_CACHE_TTL_MS,
  KB_PROPIETARIO_EMAIL,
} from '../../../config/constants.js';
import type { IConfiguracionRepository } from '../../../core/ports/repositories/IConfiguracionRepository.js';
import { aplicarAccesoKB, permisosEfectivos } from '../rbac/policy.js';

const cache = new Map<string, { usuario: Usuario; exp: number }>();
let cacheAdmins: { admins: { uid: string; nombre: string }[]; exp: number } | null = null;

/** Admins activos, con la misma caché corta que los usuarios. */
async function adminsActivos(usuarios: IUsuarioRepository, ahora: number): Promise<{ uid: string; nombre: string }[]> {
  if (cacheAdmins && cacheAdmins.exp > ahora) return cacheAdmins.admins;
  const admins = (await usuarios.list({ rol: 'admin', activo: true })).map((u) => ({ uid: u.uid, nombre: u.nombre }));
  cacheAdmins = { admins, exp: ahora + USER_CACHE_TTL_MS };
  return admins;
}

let cacheAccesoKB: { uids: Set<string>; exp: number } | null = null;

/** Quiénes tiene marcados el propietario en «👥 Acceso» de la KB (misma caché corta). */
async function accesoKB(config: IConfiguracionRepository, ahora: number): Promise<Set<string>> {
  if (cacheAccesoKB && cacheAccesoKB.exp > ahora) return cacheAccesoKB.uids;
  const uids = new Set((await config.obtenerKB()).acceso);
  cacheAccesoKB = { uids, exp: ahora + USER_CACHE_TTL_MS };
  return uids;
}

/** Tras guardar «👥 Acceso» de la KB: que el cambio se note en la siguiente petición. */
export function invalidarCacheAccesoKB(): void {
  cacheAccesoKB = null;
}

/** ¿Es el propietario de la base de conocimiento? */
export function esPropietarioKB(email: string): boolean {
  return email.trim().toLowerCase() === KB_PROPIETARIO_EMAIL;
}

function aSessionUser(
  u: Usuario,
  permisos: string[],
  adminsDelEquipo?: { uid: string; nombre: string }[],
): SessionUser {
  return {
    uid: u.uid,
    nombre: u.nombre,
    email: u.email.value,
    roles: u.roles,
    rol: u.rolPrincipal,
    empresaId: u.empresaId,
    empresaIds: u.empresaIds,
    activo: u.activo,
    esStaff: u.esStaff,
    esCliente: u.esCliente,
    esTecnico: u.esTecnico,
    permisos,
    firma: u.firma,
    encabezado: u.encabezado,
    totpActivo: u.totpActivo,
    adminsDelEquipo,
  };
}

/** Limpia la caché de un usuario (tras editarlo). */
export function invalidarCacheUsuario(uid: string): void {
  cache.delete(uid);
  cacheAdmins = null;
}

/**
 * Lee la cookie de sesión, resuelve el usuario y lo cuelga en `req.user` / `res.locals.user`.
 * No exige sesión — de eso se encargan `requireAuth` y compañía.
 */
export function sessionAuth(
  container: Container,
  logger: ILogger,
  opts: { cookieSecure: boolean },
): RequestHandler {
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
        const base = permisosEfectivos(usuario);
        const permisos = usuario.esStaff
          ? aplicarAccesoKB(base, {
              esPropietario: esPropietarioKB(usuario.email.value),
              marcado: (await accesoKB(container.resolve('configuracionRepo'), ahora)).has(usuario.uid),
            })
          : base.filter((p) => !p.startsWith('kb:'));
        // Solo quien no ve todos los tickets necesita la lista de admins (ver alcance de tickets).
        const admins =
          usuario.esStaff && !permisos.includes('tickets:leer_todos')
            ? await adminsActivos(usuarios, ahora)
            : undefined;
        req.user = aSessionUser(usuario, permisos, admins);
        res.locals.user = req.user;

        // Cierre por inactividad: refresca `lastSeenAt` cada cierto rato (no en cada request).
        if (ahora - claims.lastSeenAt > SESSION_TOUCH_INTERVAL_MS) {
          const fresco = await sesiones.touch(claims);
          res.cookie(SESSION_COOKIE_NAME, fresco, {
            httpOnly: true,
            secure: opts.cookieSecure,
            sameSite: 'lax',
            maxAge: SESSION_COOKIE_MAX_AGE_MS,
            path: '/',
          });
        }
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
