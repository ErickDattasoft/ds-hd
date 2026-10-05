import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import { CARPETAS_KB, type CarpetaKB } from '../../core/entities/ArticuloKB.js';
import type { ConfiguracionKB } from '../../core/entities/ConfiguracionKB.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Una fila del panel «👥 Acceso»: un usuario del equipo y si ve la KB. */
export interface FilaAccesoKB {
  uid: string;
  nombre: string;
  email: string;
  roles: readonly string[];
  marcado: boolean;
}

/**
 * Panel «👥 Acceso» de la base de conocimiento (como el del CRM viejo): el propietario marca,
 * persona por persona, quién la puede ver — sin importar si es administrador. También guarda
 * la ruta de Windows de cada carpeta como recordatorio para indexar.
 */
export class AccesoKBService {
  constructor(
    private readonly config: IConfiguracionRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly bitacora: BitacoraService,
  ) {}

  private exigirPropietario(actor: SessionUser): void {
    if (!actor.permisos.includes('kb:publicar')) {
      throw new ForbiddenError('Solo el propietario de la base de conocimiento decide quién la ve');
    }
  }

  async obtener(actor: SessionUser): Promise<{ filas: FilaAccesoKB[]; rutas: ConfiguracionKB['rutas'] }> {
    this.exigirPropietario(actor);
    const [config, usuarios] = await Promise.all([this.config.obtenerKB(), this.usuarios.list({ activo: true })]);
    const marcados = new Set(config.acceso);
    const filas = usuarios
      .filter((u) => u.esStaff && u.uid !== actor.uid)
      .map((u) => ({ uid: u.uid, nombre: u.nombre, email: u.email.value, roles: u.roles, marcado: marcados.has(u.uid) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return { filas, rutas: config.rutas };
  }

  /** Reemplaza la lista completa de quién tiene acceso. */
  async guardarAcceso(actor: SessionUser, uids: string[]): Promise<void> {
    this.exigirPropietario(actor);
    const config = await this.config.obtenerKB();
    const staff = new Map((await this.usuarios.list({})).filter((u) => u.esStaff).map((u) => [u.uid, u.nombre]));
    const acceso = [...new Set(uids)].filter((uid) => staff.has(uid) && uid !== actor.uid);
    const antes = new Set(config.acceso);
    const despues = new Set(acceso);
    const dados = acceso.filter((u) => !antes.has(u)).map((u) => staff.get(u));
    const quitados = config.acceso.filter((u) => !despues.has(u)).map((u) => staff.get(u) ?? u);
    await this.config.guardarKB({ ...config, acceso });
    if (dados.length || quitados.length) {
      await this.bitacora.registrar({
        actor,
        accion: 'actualizar',
        modulo: 'kb',
        entidadTipo: 'ConfiguracionKB',
        entidadId: 'acceso',
        resumen: [
          dados.length ? `Acceso dado a ${dados.join(', ')}` : '',
          quitados.length ? `Acceso quitado a ${quitados.join(', ')}` : '',
        ].filter(Boolean).join('; '),
      });
    }
  }

  /** Ruta de Windows de cada carpeta (solo recordatorio; el navegador no puede abrirla sola). */
  async guardarRutas(actor: SessionUser, rutas: Partial<Record<CarpetaKB, string>>): Promise<void> {
    this.exigirPropietario(actor);
    const config = await this.config.obtenerKB();
    const nuevas = { ...config.rutas };
    for (const c of CARPETAS_KB) if (typeof rutas[c] === 'string') nuevas[c] = rutas[c]!.trim().slice(0, 300);
    await this.config.guardarKB({ ...config, rutas: nuevas });
  }

  async rutas(): Promise<ConfiguracionKB['rutas']> {
    return (await this.config.obtenerKB()).rutas;
  }
}
