import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type {
  IUnionEmpresasRepository,
  ReferenciasEmpresa,
} from '../../core/ports/repositories/IUnionEmpresasRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import { Empresa } from '../../core/entities/Empresa.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Resultado de unir dos empresas. */
export interface ResultadoUnion {
  destino: Empresa;
  movidos: ReferenciasEmpresa;
}

const CAMPOS_TEXTO = [
  'rfc',
  'razonSocial',
  'direccion',
  'telefono',
  'telefonoAlternativo',
  'email',
  'emailAlternativo',
  'fechaFundacion',
  'contactoPrincipalId',
  'contactoAlternativoId',
] as const;

const masReciente = (a: Date | null, b: Date | null): Date | null => (!a ? b : !b ? a : a > b ? a : b);

/**
 * Une una empresa duplicada (origen) con la buena (destino): todo lo que colgaba del origen
 * (contactos, tickets, cotizaciones, tareas, seguimiento, cuentas del portal, avisos) pasa al
 * destino; los datos que al destino le faltan se toman del origen, y el origen queda archivado
 * (en la Papelera, de donde se puede borrar ya vacío).
 */
export class UnirEmpresasService {
  constructor(
    private readonly empresas: IEmpresaRepository,
    private readonly union: IUnionEmpresasRepository,
    private readonly clock: IClock,
    private readonly bitacora: BitacoraService,
  ) {}

  /** Cuánto cuelga de una empresa (para enseñarlo antes de unir). */
  contar(empresaId: string): Promise<ReferenciasEmpresa> {
    return this.union.contarReferencias(empresaId);
  }

  async unir(actor: SessionUser, origenId: string, destinoId: string): Promise<ResultadoUnion> {
    if (!actor.permisos.includes('empresas:eliminar') || !actor.permisos.includes('empresas:editar')) {
      throw new ForbiddenError('No puedes unir empresas');
    }
    if (!destinoId) throw new ValidationError('Elige con qué empresa se une', { destinoId: 'Requerido' });
    if (origenId === destinoId) {
      throw new ValidationError('Elige otra empresa: no se puede unir consigo misma', { destinoId: 'Es la misma' });
    }
    const [origen, destino] = await Promise.all([this.empresas.findById(origenId), this.empresas.findById(destinoId)]);
    if (!origen) throw new NotFoundError('Empresa', origenId);
    if (!destino) throw new NotFoundError('Empresa', destinoId);

    const movidos = await this.union.moverReferencias(origen.id, { id: destino.id, nombre: destino.nombre });
    const ahora = this.clock.now();
    UnirEmpresasService.completarDatos(destino, origen);
    destino.updatedAt = ahora;

    const fecha = ahora.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
    origen.notas = [`🔗 Unida con ${destino.nombre} el ${fecha}.`, origen.notas].filter(Boolean).join('\n');
    origen.contactoPrincipalId = null;
    origen.contactoAlternativoId = null;
    origen.favorita = false;
    origen.archivar(ahora);

    await Promise.all([this.empresas.save(destino), this.empresas.save(origen)]);
    const total = Object.values(movidos).reduce((s, n) => s + n, 0);
    await this.bitacora.registrar({
      actor,
      accion: 'unir',
      modulo: 'empresas',
      entidadTipo: 'Empresa',
      entidadId: destino.id,
      resumen: `Empresa ${origen.nombre} unida con ${destino.nombre} (${total} registro(s) movidos: ${movidos.contactos} contactos, ${movidos.tickets} tickets, ${movidos.cotizaciones} cotizaciones); la duplicada quedó archivada`,
    });
    return { destino, movidos };
  }

  /** Rellena en `destino` lo que le falta con lo de `origen`; lo que ya tiene el destino se respeta. */
  static completarDatos(destino: Empresa, origen: Empresa): void {
    for (const campo of CAMPOS_TEXTO) {
      if (!destino[campo] && origen[campo]) destino[campo] = origen[campo];
    }
    if (!destino.contactoAlternativoId && origen.contactoPrincipalId && origen.contactoPrincipalId !== destino.contactoPrincipalId) {
      destino.contactoAlternativoId = origen.contactoPrincipalId;
    }
    if (destino.contactoAlternativoId === destino.contactoPrincipalId) destino.contactoAlternativoId = null;

    destino.sistemasContratados = [...new Set([...destino.sistemasContratados, ...origen.sistemasContratados])];
    destino.vigencias = Empresa.sanearVigencias({ ...origen.vigencias, ...destino.vigencias }, destino.sistemasContratados);
    destino.versionesInstaladas = Empresa.sanearMapaSistemas(
      { ...origen.versionesInstaladas, ...destino.versionesInstaladas },
      destino.sistemasContratados,
    );
    const yaEstan = new Set(destino.camposExtra.map((c) => `${c.etiqueta}\u0000${c.valor}`));
    destino.camposExtra = [
      ...destino.camposExtra,
      ...origen.camposExtra.filter((c) => !yaEstan.has(`${c.etiqueta}\u0000${c.valor}`)),
    ];
    if (origen.notas && origen.notas !== destino.notas && !(destino.notas ?? '').includes(origen.notas)) {
      destino.notas = [destino.notas, `— De ${origen.nombre}: ${origen.notas}`].filter(Boolean).join('\n');
    }
    destino.favorita = destino.favorita || origen.favorita;
    destino.ultimoAvisoVersionesEn = masReciente(destino.ultimoAvisoVersionesEn, origen.ultimoAvisoVersionesEn);
    destino.ultimoAvisoLicenciasEn = masReciente(destino.ultimoAvisoLicenciasEn, origen.ultimoAvisoLicenciasEn);
  }
}
