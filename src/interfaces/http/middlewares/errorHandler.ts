import type { ErrorRequestHandler, RequestHandler } from 'express';
import { DomainError } from '../../../core/errors/DomainError.js';
import type { ILogger } from '../../../core/ports/services/ILogger.js';

/** 404 para rutas no montadas. Se registra al final de la cadena, antes del errorHandler. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404);
  if (req.accepts('html')) {
    res.render('errors/404', { titulo: 'No encontrado', path: req.path });
  } else {
    res.json({ error: 'NO_ENCONTRADO', mensaje: `Ruta no encontrada: ${req.path}` });
  }
};

/**
 * Traduce cualquier error a una respuesta. Los {@link DomainError} llevan su propio
 * `httpStatus` y `code`; el resto es un 500 genérico (sin filtrar detalles al cliente).
 */
export function errorHandler(logger: ILogger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const isDomain = err instanceof DomainError;
    const status = isDomain ? err.httpStatus : 500;
    const code = isDomain ? err.code : 'ERROR_INTERNO';

    if (status >= 500) {
      logger.error('Error no controlado', {
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        method: req.method,
        path: req.path,
      });
    } else {
      logger.warn('Error de dominio', { code, path: req.path });
    }

    if (res.headersSent) return;

    res.status(status);
    const mensaje = isDomain ? err.message : 'Ocurrió un error inesperado. Intenta de nuevo.';
    if (req.accepts('html')) {
      const view = status === 403 ? 'errors/403' : status === 404 ? 'errors/404' : 'errors/500';
      res.render(view, { titulo: mensaje, code, mensaje });
    } else {
      res.json({ error: code, mensaje });
    }
  };
}
