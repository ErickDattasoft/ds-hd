import type { Request, Response } from 'express';
import type { LoginService } from '../../../../application/auth/LoginService.js';
import type { SolicitarAccesoService } from '../../../../application/auth/SolicitarAccesoService.js';
import type { AceptarInvitacionService } from '../../../../application/usuarios/AceptarInvitacionService.js';
import type { IInvitacionRepository } from '../../../../core/ports/repositories/IInvitacionRepository.js';
import { DomainError } from '../../../../core/errors/DomainError.js';
import { invalidarCacheUsuario } from '../../middlewares/sessionAuth.js';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_MS } from '../../../../config/constants.js';

/** Cookie del paso intermedio del login con verificación en dos pasos. */
const COOKIE_2FA = 'ds_2fa';

export interface AuthControllerOpts {
  /** Correos a los que se notifican las solicitudes de acceso. */
  notificarSolicitudesA: string[];
  cookieSecure: boolean;
}

/** Login, logout, solicitud de acceso y aceptación de invitaciones. */
export class AuthController {
  constructor(
    private readonly login: LoginService,
    private readonly solicitar: SolicitarAccesoService,
    private readonly aceptarInvitacion: AceptarInvitacionService,
    private readonly invitaciones: IInvitacionRepository,
    private readonly opts: AuthControllerOpts,
  ) {}

  mostrarLogin = (req: Request, res: Response): void => {
    if (req.user) return this.redirigirAArea(req, res);
    res.render('pages/public/login', {
      titulo: 'Iniciar sesión',
      next: typeof req.query.next === 'string' ? req.query.next : '',
      valores: {},
      errores: {},
    });
  };

  procesarLogin = async (req: Request, res: Response): Promise<void> => {
    const { email = '', password = '', next: destino = '' } = req.body ?? {};
    try {
      const r = await this.login.ejecutar({ email, password });
      if (r.pendienteDosPasos) {
        res.cookie(COOKIE_2FA, r.pendienteDosPasos, {
          httpOnly: true,
          secure: this.opts.cookieSecure,
          sameSite: 'lax',
          maxAge: 5 * 60_000,
          path: '/login',
        });
        res.redirect(`/login/verificacion${esRutaInterna(destino) ? `?next=${encodeURIComponent(destino)}` : ''}`);
        return;
      }
      this.entrar(res, r.token!, r.usuario, destino);
    } catch (err) {
      const mensaje = err instanceof DomainError ? err.message : 'No se pudo iniciar sesión';
      res.status(401).render('pages/public/login', {
        titulo: 'Iniciar sesión',
        next: destino,
        valores: { email },
        errores: { general: mensaje },
      });
    }
  };

  private entrar(res: Response, token: string, usuario: { uid: string; esCliente: boolean }, destino: string): void {
    invalidarCacheUsuario(usuario.uid);
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.opts.cookieSecure,
      sameSite: 'lax',
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
      path: '/',
    });
    res.redirect(esRutaInterna(destino) ? destino : usuario.esCliente ? '/portal' : '/app');
  }

  mostrarVerificacion = (req: Request, res: Response): void => {
    if (!req.cookies?.[COOKIE_2FA]) return res.redirect('/login');
    res.render('pages/public/login-2fa', {
      titulo: 'Verificación en dos pasos',
      next: typeof req.query.next === 'string' ? req.query.next : '',
      errores: {},
    });
  };

  procesarVerificacion = async (req: Request, res: Response): Promise<void> => {
    const { codigo = '', next: destino = '' } = req.body ?? {};
    try {
      const r = await this.login.completarDosPasos(String(req.cookies?.[COOKIE_2FA] ?? ''), String(codigo));
      res.clearCookie(COOKIE_2FA, { path: '/login' });
      this.entrar(res, r.token!, r.usuario, destino);
    } catch (err) {
      const mensaje = err instanceof DomainError ? err.message : 'No se pudo verificar';
      res.status(401).render('pages/public/login-2fa', {
        titulo: 'Verificación en dos pasos',
        next: destino,
        errores: { general: mensaje },
      });
    }
  };

  logout = (req: Request, res: Response): void => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    if (req.user) invalidarCacheUsuario(req.user.uid);
    res.redirect('/login');
  };

  mostrarSolicitud = (_req: Request, res: Response): void => {
    res.render('pages/public/solicitar-acceso', { titulo: 'Solicitar acceso', valores: {}, errores: {} });
  };

  procesarSolicitud = async (req: Request, res: Response): Promise<void> => {
    const { email = '', nombre = '', mensaje = '' } = req.body ?? {};
    try {
      await this.solicitar.ejecutar({
        email,
        nombre,
        mensaje,
        notificarA: this.opts.notificarSolicitudesA,
      });
      res.render('pages/public/solicitar-acceso', {
        titulo: 'Solicitar acceso',
        enviado: true,
        valores: {},
        errores: {},
      });
    } catch (err) {
      const errores =
        err instanceof DomainError && 'campos' in err
          ? (err.campos as Record<string, string>)
          : { general: 'No se pudo registrar la solicitud' };
      res.status(422).render('pages/public/solicitar-acceso', {
        titulo: 'Solicitar acceso',
        valores: { email, nombre, mensaje },
        errores,
      });
    }
  };

  mostrarInvitacion = async (req: Request, res: Response): Promise<void> => {
    const token = String(req.params.token ?? '');
    const inv = await this.invitaciones.findByToken(token);
    const valida = inv && !inv.usadaEn && inv.expiresAt.getTime() > Date.now();
    res.status(valida ? 200 : 410).render('pages/public/invitacion', {
      titulo: 'Establecer contraseña',
      token,
      valida,
      email: inv?.email,
      errores: {},
    });
  };

  procesarInvitacion = async (req: Request, res: Response): Promise<void> => {
    const token = String(req.params.token ?? '');
    const { password = '', passwordConfirmacion = '' } = req.body ?? {};
    try {
      await this.aceptarInvitacion.ejecutar({ token, password, passwordConfirmacion });
      res.render('pages/public/login', {
        titulo: 'Iniciar sesión',
        next: '',
        valores: {},
        errores: {},
        aviso: 'Tu contraseña quedó lista. Ya puedes iniciar sesión.',
      });
    } catch (err) {
      const errores =
        err instanceof DomainError && 'campos' in err
          ? (err.campos as Record<string, string>)
          : { general: err instanceof DomainError ? err.message : 'No se pudo completar' };
      res.status(422).render('pages/public/invitacion', {
        titulo: 'Establecer contraseña',
        token,
        valida: true,
        errores,
      });
    }
  };

  private redirigirAArea(req: Request, res: Response): void {
    res.redirect(req.user?.esCliente ? '/portal' : '/app');
  }
}

function esRutaInterna(url: unknown): url is string {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');
}
