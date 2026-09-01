import helmet from 'helmet';
import type { RequestHandler } from 'express';
import type { AppConfig } from '../../../config/env.js';

/**
 * Cabeceras de seguridad. CSP permite htmx/Alpine servidos desde el propio origen
 * (`/vendor/*`) más estilos inline mínimos de las vistas.
 */
export function securityHeaders(config: AppConfig): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://challenges.cloudflare.com'],
        frameSrc: ['https://challenges.cloudflare.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: config.isProduction,
  });
}
