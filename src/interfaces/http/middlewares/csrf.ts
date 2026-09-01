import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { CSRF_COOKIE_NAME } from '../../../config/constants.js';
import { ForbiddenError } from '../../../core/errors/DomainError.js';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protección CSRF por double-submit: una cookie no-httpOnly con un token aleatorio que el
 * formulario reenvía en el campo `_csrf` (o cabecera `x-csrf-token`). Se comparan en
 * tiempo constante. Las rutas de `exentas` (webhooks, jobs) se saltan la verificación.
 */
export function csrf(opts: { secure: boolean; exentas?: RegExp }): RequestHandler {
  return (req, res, next) => {
    let token = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
    if (!token) {
      token = randomBytes(24).toString('base64url');
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: opts.secure,
        sameSite: 'lax',
        path: '/',
      });
    }
    res.locals.csrfToken = token;
    req.csrfToken = () => token;

    if (METODOS_SEGUROS.has(req.method)) return next();
    if (opts.exentas?.test(req.path)) return next();

    const enviado =
      (req.body?._csrf as string | undefined) ??
      (req.get('x-csrf-token') as string | undefined) ??
      '';
    const a = Buffer.from(enviado);
    const b = Buffer.from(token);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return next(new ForbiddenError('Token de seguridad inválido. Recarga la página e inténtalo de nuevo.'));
    }
    next();
  };
}
