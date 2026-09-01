import type { SessionUser } from '../../application/shared/SessionUser.js';

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado (lo pone el middleware `sessionAuth`). */
      user?: SessionUser;
      /** Token CSRF válido para renderizar en formularios. */
      csrfToken?: () => string;
    }
    interface Locals {
      user?: SessionUser;
      csrfToken?: string;
      nav?: unknown;
      flash?: { tipo: string; mensaje: string }[];
    }
  }
}

export {};
