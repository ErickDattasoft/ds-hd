import { MIN_PASSWORD } from '../../../../application/usuarios/ContrasenaService.js';
import type { Request, Response } from 'express';
import type { IUsuarioRepository } from '../../../../core/ports/repositories/IUsuarioRepository.js';
import type { CrearUsuarioService } from '../../../../application/usuarios/CrearUsuarioService.js';
import type { ActualizarUsuarioService } from '../../../../application/usuarios/ActualizarUsuarioService.js';
import type { ActualizarMiFirmaService } from '../../../../application/usuarios/ActualizarMiFirmaService.js';
import type { ContrasenaService } from '../../../../application/usuarios/ContrasenaService.js';
import type { ConfiguracionTicketsService } from '../../../../application/configuracion/ConfiguracionTicketsService.js';
import { catalogoFacturacion } from './TicketController.js';
import type { InvitarClienteService } from '../../../../application/usuarios/InvitarClienteService.js';
import type { IEmpresaRepository } from '../../../../core/ports/repositories/IEmpresaRepository.js';
import { DomainError, NotFoundError, ValidationError } from '../../../../core/errors/DomainError.js';
import {
  ROLES_STAFF,
  ROL_ETIQUETA,
  ROL_GRUPOS,
  parseRoles,
} from '../../../../core/entities/value-objects/Rol.js';
import { permisosPorModulo } from '../../rbac/permissions.js';
import { revocadosConSecciones, seccionesConfigurables } from '../../rbac/secciones.js';
import {
  APARTADOS,
  NIVEL_ETIQUETA,
  aplicarCasillas,
  casillaMarcada,
  type NivelApartado,
} from '../../rbac/apartados.js';
import { permisosEfectivos } from '../../rbac/policy.js';
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
    private readonly contrasena: ContrasenaService,
    private readonly configTickets: ConfiguracionTicketsService,
  ) {}

  /** Renderiza Mi perfil (firma, encabezado, predeterminados y contraseña). */
  private async renderPerfil(
    req: Request,
    res: Response,
    extra: { guardado?: boolean; passGuardada?: boolean; erroresPass?: Record<string, string> } = {},
    status = 200,
  ): Promise<void> {
    const [usuario, config] = await Promise.all([
      this.usuarios.findByUid(req.user!.uid),
      this.configTickets.obtener(),
    ]);
    res.status(status).render('pages/backoffice/mi-perfil', {
      titulo: 'Mi perfil',
      firma: usuario?.firma ?? '',
      encabezado: usuario?.encabezado ?? '',
      pred: usuario?.predeterminadosTicket ?? {},
      contactosSoporteTexto: (usuario?.contactosSoporte ?? []).map((c) => `${c.nombre}, ${c.telefono}`).join('\n'),
      config,
      estadosFacturacion: catalogoFacturacion(),
      guardado: false,
      passGuardada: false,
      erroresPass: {},
      ...extra,
    });
  }

  miPerfilView = async (req: Request, res: Response): Promise<void> => {
    await this.renderPerfil(req, res, { passGuardada: req.query.pass === 'ok' });
  };

  miPerfilPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    await this.actualizarFirma.ejecutar({
      actor: req.user!,
      firma: String(b.firma ?? ''),
      encabezado: String(b.encabezado ?? ''),
      contactosSoporte: String(b.contactosSoporte ?? ''),
      predeterminadosTicket: {
        tipo: String(b.predTipo ?? ''),
        prioridad: String(b.predPrioridad ?? ''),
        sistema: String(b.predSistema ?? ''),
        grupo: String(b.predGrupo ?? ''),
        estadoFacturacion: String(b.predFacturacion ?? ''),
        ...(b.predAsignar === 'si' ? { asignarAlCreador: true } : b.predAsignar === 'no' ? { asignarAlCreador: false } : {}),
      },
    });
    invalidarCacheUsuario(req.user!.uid);
    await this.renderPerfil(req, res, { guardado: true });
  };

  miPasswordPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      await this.contrasena.cambiarMia({
        actor: req.user!,
        actual: String(b.actual ?? ''),
        password: String(b.password ?? ''),
        passwordConfirmacion: String(b.passwordConfirmacion ?? ''),
      });
      res.redirect('/app/mi-perfil?pass=ok#contrasena');
    } catch (err) {
      await this.renderPerfil(req, res, { erroresPass: erroresDe(err, 'No se pudo cambiar la contraseña') }, 422);
    }
  };

  restablecerPasswordPost = async (req: Request, res: Response): Promise<void> => {
    const uid = String(req.params.uid ?? '');
    const b = req.body ?? {};
    try {
      await this.contrasena.restablecer({
        actor: req.user!,
        uid,
        password: String(b.password ?? ''),
        passwordConfirmacion: String(b.passwordConfirmacion ?? ''),
      });
      invalidarCacheUsuario(uid);
      res.redirect(`/app/usuarios/${encodeURIComponent(uid)}?pass=ok#contrasena`);
    } catch (err) {
      const usuario = await this.usuarios.findByUid(uid);
      if (!usuario) throw err;
      res.status(422).render('pages/backoffice/usuarios/form', {
        titulo: `Editar ${usuario.nombre}`,
        modo: 'editar',
        usuario,
        rolesStaff: ROLES_STAFF,
        ROL_ETIQUETA,
        ROL_GRUPOS,
        permisosModulo: permisosPorModulo(),
        valores: { ...usuario, roles: [...usuario.roles], esCliente: usuario.esCliente },
        errores: {},
        erroresPass: erroresDe(err, 'No se pudo restablecer la contraseña'),
      });
    }
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

  /**
   * «🔐 Permisos por apartado»: todos los usuarios del equipo contra todos los apartados, con
   * casillas Ver / Editar (como el panel del CRM viejo). Los administradores ven todo siempre.
   */
  permisosView = async (req: Request, res: Response): Promise<void> => {
    const staff = (await this.usuarios.list({ activo: true }))
      .filter((u) => u.esStaff)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    res.render('pages/backoffice/usuarios/permisos', {
      titulo: 'Permisos por apartado',
      apartados: APARTADOS.map((a) => ({
        id: a.id,
        etiqueta: a.etiqueta,
        niveles: (Object.keys(a.niveles) as NivelApartado[]).map((n) => ({ id: n, etiqueta: NIVEL_ETIQUETA[n] })),
      })),
      filas: staff.map((u) => {
        const efectivos = permisosEfectivos(u);
        const marcadas: Record<string, boolean> = {};
        for (const a of APARTADOS) {
          for (const [n, permisos] of Object.entries(a.niveles) as [NivelApartado, readonly string[]][]) {
            marcadas[`${a.id}|${n}`] = casillaMarcada(efectivos, permisos as never);
          }
        }
        return { uid: u.uid, nombre: u.nombre, roles: u.roles.map((r) => ROL_ETIQUETA[r] ?? r).join(', '), esAdmin: u.tieneRol('admin'), marcadas };
      }),
      guardados: typeof req.query.ok === 'string' ? Number(req.query.ok) : null,
    });
  };

  permisosPost = async (req: Request, res: Response): Promise<void> => {
    const body = req.body ?? {};
    const marcadas = new Set(aArreglo(body.p) ?? []);
    const originales = new Set(aArreglo(body.o) ?? []);
    // Solo las casillas que cambiaron: lo que no se tocó no se reescribe.
    const cambiosPorUsuario = new Map<string, Map<string, Partial<Record<NivelApartado, boolean>>>>();
    for (const clave of new Set([...marcadas, ...originales])) {
      const dar = marcadas.has(clave);
      if (dar === originales.has(clave)) continue;
      const [uid, apartado, nivel] = clave.split('|') as [string, string, NivelApartado];
      if (!uid || !APARTADOS.some((a) => a.id === apartado && a.niveles[nivel])) continue;
      const delUsuario = cambiosPorUsuario.get(uid) ?? new Map();
      delUsuario.set(apartado, { ...delUsuario.get(apartado), [nivel]: dar });
      cambiosPorUsuario.set(uid, delUsuario);
    }
    let guardados = 0;
    for (const [uid, cambios] of cambiosPorUsuario) {
      const usuario = await this.usuarios.findByUid(uid);
      // Los admins tienen todo por rol: el panel no los toca.
      if (!usuario || !usuario.esStaff || usuario.tieneRol('admin')) continue;
      const overrides = aplicarCasillas(usuario, permisosEfectivos(usuario), cambios);
      await this.actualizar.ejecutar({ actor: req.user!, uid, ...overrides });
      invalidarCacheUsuario(uid);
      guardados += 1;
    }
    res.redirect(`/app/usuarios/permisos?ok=${guardados}`);
  };

  nuevo = (req: Request, res: Response): void => {
    const email = typeof req.query.email === 'string' ? req.query.email : '';
    const nombre = typeof req.query.nombre === 'string' ? req.query.nombre : '';
    res.render('pages/backoffice/usuarios/form', {
      titulo: 'Nuevo usuario',
      modo: 'crear',
      rolesStaff: ROLES_STAFF,
      ROL_ETIQUETA,
      ROL_GRUPOS,
      valores: { roles: ['soporte'], esCliente: false, email, nombre },
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
      secciones: seccionesConfigurables(usuario.roles, usuario.permisosExtra),
      empresas: await this.empresas.list({ activa: true }),
      valores: { ...usuario, roles: [...usuario.roles], esCliente: usuario.esCliente },
      errores: {},
      passGuardada: req.query.pass === 'ok',
      erroresPass: {},
    });
  };

  actualizarPost = async (req: Request, res: Response): Promise<void> => {
    const uid = String(req.params.uid ?? '');
    const body = req.body ?? {};
    const esCliente = body.esCliente === 'on' || body.esCliente === 'true';
    const roles = esCliente ? ['cliente'] : (aArreglo(body.roles) ?? []);
    const passwordNueva = String(body.passwordNueva ?? '');
    const passwordNuevaConfirmacion = String(body.passwordNuevaConfirmacion ?? '');
    try {
      // Se valida ANTES de guardar lo demás, para no dejar el cambio a medias.
      if (passwordNueva || passwordNuevaConfirmacion) {
        if (passwordNueva.length < MIN_PASSWORD) {
          throw new ValidationError('Contraseña inválida', { passwordNueva: `Mínimo ${MIN_PASSWORD} caracteres` });
        }
        if (passwordNueva !== passwordNuevaConfirmacion) {
          throw new ValidationError('Contraseña inválida', { passwordNuevaConfirmacion: 'No coincide' });
        }
      }
      await this.actualizar.ejecutar({
        actor: req.user!,
        uid,
        nombre: body.nombre,
        roles: parseRoles(roles),
        activo: body.activo === undefined ? undefined : body.activo === 'on' || body.activo === 'true',
        empresaId: body.empresaId ?? undefined,
        // Las casillas desmarcadas no llegan: el marcador indica que la sección sí se envió.
        empresasAdicionales: body.empresasAdicionalesEnviado ? (aArreglo(body.empresasAdicionales) ?? []) : undefined,
        permisosExtra: aArreglo(body.permisosExtra),
        // «👁️ Secciones visibles»: la casilla desmarcada revoca el permiso de lectura de la sección.
        permisosRevocados: body.seccionesEnviado
          ? revocadosConSecciones(
              aArreglo(body.permisosRevocados) ?? [],
              aArreglo(body.seccionConfigurable) ?? [],
              aArreglo(body.seccionVisible) ?? [],
            )
          : aArreglo(body.permisosRevocados),
        agente: {
          grupo: body.agenteGrupo || null,
          capacidadMax: Number(body.agenteCapacidad ?? 0),
          disponibleAsignacion: body.agenteDisponible === 'on' || body.agenteDisponible === 'true',
        },
      });
      if (passwordNueva) {
        await this.contrasena.restablecer({ actor: req.user!, uid, password: passwordNueva, passwordConfirmacion: passwordNuevaConfirmacion });
      }
      invalidarCacheUsuario(uid);
      res.redirect(passwordNueva ? `/app/usuarios/${encodeURIComponent(uid)}?pass=ok#contrasena` : '/app/usuarios');
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
        secciones: usuario ? seccionesConfigurables(usuario.roles, usuario.permisosExtra) : [],
        empresas: await this.empresas.list({ activa: true }),
        valores: { ...usuario, ...body, roles, esCliente, empresasAdicionales: aArreglo(body.empresasAdicionales) ?? [] },
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
        titulo: urlInvitacion ? 'Cliente invitado' : 'Empresa agregada al cliente',
        empresaAgregada: !urlInvitacion,
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

function erroresDe(err: unknown, porDefecto: string): Record<string, string> {
  if (err instanceof DomainError && 'campos' in err) return err.campos as Record<string, string>;
  return { general: err instanceof DomainError ? err.message : porDefecto };
}

function aArreglo(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}
