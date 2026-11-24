import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type {
  IUnionEmpresasRepository,
  ReferenciasEmpresa,
} from '../../core/ports/repositories/IUnionEmpresasRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import { completarContacto, contactosRepetidos } from './contactosRepetidos.js';
import { Empresa } from '../../core/entities/Empresa.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Resultado de unir dos empresas. */
export interface ResultadoUnion {
  destino: Empresa;
  movidos: ReferenciasEmpresa;
  /** Contactos repetidos (la misma persona en las dos empresas) que se juntaron en uno. */
  contactosJuntados: number;
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
    private readonly contactos: IContactoRepository,
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

    // La misma persona solía estar dada de alta en las dos: se junta en un solo contacto.
    const contactosJuntados = await this.juntarRepetidos(destino);
    await Promise.all([this.empresas.save(destino), this.empresas.save(origen)]);
    const total = Object.values(movidos).reduce((s, n) => s + n, 0);
    await this.bitacora.registrar({
      actor,
      accion: 'unir',
      modulo: 'empresas',
      entidadTipo: 'Empresa',
      entidadId: destino.id,
      resumen: `Empresa ${origen.nombre} unida con ${destino.nombre} (${total} registro(s) movidos: ${movidos.contactos} contactos, ${movidos.tickets} tickets, ${movidos.cotizaciones} cotizaciones); la duplicada quedó archivada${contactosJuntados ? `; ${contactosJuntados} contacto(s) repetido(s) juntado(s)` : ''}`,
    });
    return { destino, movidos, contactosJuntados };
  }

  /** Contactos de la empresa que son la misma persona (para enseñar el aviso en su ficha). */
  async repetidosDe(empresaId: string): Promise<ReturnType<typeof contactosRepetidos>> {
    const empresa = await this.empresas.findById(empresaId);
    if (!empresa) throw new NotFoundError('Empresa', empresaId);
    return contactosRepetidos(await this.contactos.list({ empresaId }), empresa);
  }

  /** «🔗 Juntar contactos repetidos» de la ficha de la empresa. Devuelve cuántos se juntaron. */
  async juntarContactosRepetidos(actor: SessionUser, empresaId: string): Promise<number> {
    if (!actor.permisos.includes('contactos:editar') && !actor.permisos.includes('empresas:editar')) {
      throw new ForbiddenError('No puedes juntar contactos');
    }
    const empresa = await this.empresas.findById(empresaId);
    if (!empresa) throw new NotFoundError('Empresa', empresaId);
    const n = await this.juntarRepetidos(empresa);
    if (n) {
      empresa.updatedAt = this.clock.now();
      await this.empresas.save(empresa);
      await this.bitacora.registrar({
        actor,
        accion: 'juntar_contactos',
        modulo: 'contactos',
        entidadTipo: 'Empresa',
        entidadId: empresa.id,
        resumen: `${empresa.nombre}: ${n} contacto(s) repetido(s) juntado(s) en uno`,
      });
    }
    return n;
  }

  /**
   * Junta en uno los contactos repetidos de la empresa: pasa sus tickets/cotizaciones/tareas al
   * que se queda, le copia lo que le falte y archiva los demás. No guarda la empresa (lo hace
   * quien llama), pero sí le corrige principal/alternativo.
   */
  private async juntarRepetidos(empresa: Empresa): Promise<number> {
    const grupos = contactosRepetidos(await this.contactos.list({ empresaId: empresa.id }), empresa);
    const ahora = this.clock.now();
    let n = 0;
    for (const { queda, sobran } of grupos) {
      for (const sobra of sobran) {
        await this.union.moverReferenciasContacto(sobra.id, queda.id);
        completarContacto(queda, sobra, ahora);
        sobra.notas = [`🔗 Juntado con ${queda.nombre} (contacto repetido).`, sobra.notas].filter(Boolean).join('\n');
        sobra.archivar(ahora);
        if (empresa.contactoPrincipalId === sobra.id) empresa.contactoPrincipalId = queda.id;
        if (empresa.contactoAlternativoId === sobra.id) empresa.contactoAlternativoId = queda.id;
        n++;
      }
      await this.contactos.guardarVarios([queda, ...sobran]);
    }
    if (empresa.contactoAlternativoId === empresa.contactoPrincipalId) empresa.contactoAlternativoId = null;
    return n;
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
