import type { Request, Response } from 'express';
import type { IUsuarioRepository } from '../../../../core/ports/repositories/IUsuarioRepository.js';
import type { CrearUsuarioService } from '../../../../application/usuarios/CrearUsuarioService.js';
import type { ActualizarUsuarioService } from '../../../../application/usuarios/ActualizarUsuarioService.js';
import type { ActualizarMiFirmaService } from '../../../../application/usuarios/ActualizarMiFirmaService.js';
import type { InvitarClienteService } from '../../../../application/usuarios/InvitarClienteService.js';
import type { IEmpresaRepository } from '../../../../core/ports/repositories/IEmpresaRepository.js';
import { DomainError, NotFoundError } from '../../../../core/errors/DomainError.js';
import {
  ROLES_STAFF,
  ROL_ETIQUETA,
  ROL_GRUPOS,
  parseRoles,
} from '../../../../core/entities/value-objects/Rol.js';
import { permisosPorModulo } from '../../rbac/permissions.js';
import { invalidarCacheUsuario } from '../../middlewares/sessionAuth.js';

/** Gestión de usuarios y perfiles (requiere `usuarios:gestionar`). */
export class UsuarioController {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly crear: CrearUsuarioService,
    private readonly actualizar: ActualizarUsuarioService,
    private readonly invitarCliente: InvitarClienteService,
    private readonly empresas: IEmpresaRepository,
    private readonly actualizarFirma: ActualizarMiFirmaService,
  ) {}

  miPerfilView = async (req: Request, res: Response): Promise<void> => {
    const usuario = await this.usuarios.findByUid(req.user!.uid);
    res.render('pages/backoffice/mi-perfil', { titulo: 'Mi perfil', firma: usuario?.firma ?? '', guardado: false });
  };

  miPerfilPost = async (req: Request, res: Response): Promise<void> => {
    const firma = String(req.body?.firma ?? '');
    await this.actualizarFirma.ejecutar({ actor: req.user!, firma });
    invalidarCacheUsuario(req.user!.uid);
    res.render('pages/backoffice/mi-perfil', { titulo: 'Mi perfil', firma, guardado: true });
  };

  listar = async (req: Request, res: Response): Promise<void> => {
    const texto = typeof req.query.q === 'string' ? req.query.q : '';
    const lista = await this.usuarios.list(texto ? { texto } : {});
    res.render('pages/backoffice/usuarios/list', {
      titulo: 'Usuarios',
      usuarios: lista,
      q: texto,
      ROL_ETIQUETA,
    });
  };

  nuevo = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/usuarios/form', {
      titulo: 'Nuevo usuario',
      modo: 'crear',
      rolesStaff: ROLES_STAFF,
      ROL_ETIQUETA,
      ROL_GRUPOS,
      valores: { roles: ['soporte'], esCliente: false },
      errores: {},
    });
  };

  crearPost = async (req: Request, res: Response): Promise<void> => {
    const body = req.body ?? {};
    const { email = '', nombre = '' } = body;
    const roles = aArreglo(body.roles) ?? [];
    try {
      const { urlInvitacion } = await this.crear.ejecutar({
        actor: req.user!,
        email,
        nombre,
        roles: parseRoles(roles),
      });
      res.render('pages/backoffice/usuarios/creado', {
        titulo: 'Usuario creado',
        nombre,
        email,
        urlInvitacion,
      });
    } catch (err) {
      this.renderErrorForm(res, 'crear', { email, nombre, roles, esCliente: false }, err);
    }
  };

  editar = async (req: Request, res: Response): Promise<void> => {
    const uid = String(req.params.uid ?? '');
    const usuario = await this.usuarios.findByUid(uid);
    if (!usuario) throw new NotFoundError('Usuario', uid);
    res.render('pages/backoffice/usuarios/form', {
      titulo: `Editar ${usuario.nombre}`,
      modo: 'editar',
      usuario,
      rolesStaff: ROLES_STAFF,
      ROL_ETIQUETA,
      ROL_GRUPOS,
      permisosModulo: permisosPorModulo(),
      valores: { ...usuario, roles: [...usuario.roles], esCliente: usuario.esCliente },
      errores: {},
    });
  };

  actualizarPost = async (req: Request, res: Response): Promise<void> => {
    const uid = String(req.params.uid ?? '');
    const body = req.body ?? {};
    const esCliente = body.esCliente === 'on' || body.esCliente === 'true';
    const roles = esCliente ? ['cliente'] : (aArreglo(body.roles) ?? []);
    try {
      await this.actualizar.ejecutar({
        actor: req.user!,
        uid,
        nombre: body.nombre,
        roles: parseRoles(roles),
        activo: body.activo === undefined ? undefined : body.activo === 'on' || body.activo === 'true',
        empresaId: body.empresaId ?? undefined,
        permisosExtra: aArreglo(body.permisosExtra),
        permisosRevocados: aArreglo(body.permisosRevocados),
        agente: {
          grupo: body.agenteGrupo || null,
          capacidadMax: Number(body.agenteCapacidad ?? 0),
          disponibleAsignacion: body.agenteDisponible === 'on' || body.agenteDisponible === 'true',
        },
      });
      invalidarCacheUsuario(uid);
      res.redirect('/app/usuarios');
    } catch (err) {
      const usuario = await this.usuarios.findByUid(uid);
      const errores =
        err instanceof DomainError && 'campos' in err
          ? (err.campos as Record<string, string>)
          : { general: err instanceof DomainError ? err.message : 'No se pudo guardar' };
      res.status(422).render('pages/backoffice/usuarios/form', {
        titulo: 'Editar usuario',
        modo: 'editar',
        usuario,
        rolesStaff: ROLES_STAFF,
        ROL_ETIQUETA,
        ROL_GRUPOS,
        permisosModulo: permisosPorModulo(),
        valores: { ...usuario, ...body, roles, esCliente },
        errores,
      });
    }
  };

  invitarClienteGet = async (_req: Request, res: Response): Promise<void> => {
    res.render('pages/backoffice/usuarios/invitar-cliente', {
      titulo: 'Invitar cliente al portal',
      empresas: await this.empresas.list({ activa: true }),
      valores: {},
      errores: {},
    });
  };

  invitarClientePost = async (req: Request, res: Response): Promise<void> => {
    const { email = '', nombre = '', empresaId = '' } = req.body ?? {};
    try {
      const { urlInvitacion } = await this.invitarCliente.ejecutar({
        actor: req.user!,
        email,
        nombre,
        empresaId,
      });
      res.render('pages/backoffice/usuarios/creado', {
        titulo: 'Cliente invitado',
        nombre,
        email,
        urlInvitacion,
      });
    } catch (err) {
      const errores =
        err instanceof DomainError && 'campos' in err
          ? (err.campos as Record<string, string>)
          : { general: err instanceof DomainError ? err.message : 'No se pudo invitar' };
      res.status(422).render('pages/backoffice/usuarios/invitar-cliente', {
        titulo: 'Invitar cliente al portal',
        empresas: await this.empresas.list({ activa: true }),
        valores: { email, nombre, empresaId },
        errores,
      });
    }
  };

  private renderErrorForm(
    res: Response,
    modo: 'crear' | 'editar',
    valores: Record<string, unknown>,
    err: unknown,
  ): void {
    const errores =
      err instanceof DomainError && 'campos' in err
        ? (err.campos as Record<string, string>)
        : { general: err instanceof DomainError ? err.message : 'No se pudo guardar' };
    res.status(422).render('pages/backoffice/usuarios/form', {
      titulo: modo === 'crear' ? 'Nuevo usuario' : 'Editar usuario',
      modo,
      rolesStaff: ROLES_STAFF,
      ROL_ETIQUETA,
      ROL_GRUPOS,
      permisosModulo: permisosPorModulo(),
      valores,
      errores,
    });
  }
}

function aArreglo(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}
