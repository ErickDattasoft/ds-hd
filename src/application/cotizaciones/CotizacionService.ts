import type { ICotizacionRepository, ListarCotizacionesFiltro } from '../../core/ports/repositories/ICotizacionRepository.js';
import type { IContadorRepository } from '../../core/ports/repositories/IContadorRepository.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import { Cotizacion, type ConceptoCotizacion, type EstadoCotizacion } from '../../core/entities/Cotizacion.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { CrearTicketService } from '../tickets/CrearTicketService.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { Ticket } from '../../core/entities/Ticket.js';

/** Datos para crear una cotización (folio y montos se calculan en el servicio). */
export interface DatosCotizacion {
  empresaId: string;
  contactoId?: string;
  vigenciaDias?: number;
  notas?: string;
  conceptos: ConceptoCotizacion[];
  origenCalculadora?: boolean;
  parametrosCompac?: Record<string, unknown> | null;
}

/** Gestión de cotizaciones: folio consecutivo, conceptos, ciclo de estado. */
export class CotizacionService {
  constructor(
    private readonly repo: ICotizacionRepository,
    private readonly contadores: IContadorRepository,
    private readonly empresas: IEmpresaRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly bitacora: BitacoraService,
    private readonly webhooks: IWebhookPublisher,
    private readonly contactos: IContactoRepository,
    private readonly email: IEmailSender,
    private readonly crearTicket: CrearTicketService,
    private readonly baseUrl: string,
  ) {}

  listar(filtro?: ListarCotizacionesFiltro): Promise<Cotizacion[]> {
    return this.repo.list(filtro);
  }

  async obtener(id: string): Promise<Cotizacion> {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundError('Cotización', id);
    return c;
  }

  private assertPuedeEditar(actor: SessionUser): void {
    if (!actor.permisos.includes('cotizaciones:crear') && !actor.permisos.includes('cotizaciones:editar')) {
      throw new ForbiddenError('No puedes modificar cotizaciones');
    }
  }

  async crear(actor: SessionUser, datos: DatosCotizacion): Promise<Cotizacion> {
    if (!actor.permisos.includes('cotizaciones:crear')) throw new ForbiddenError('No puedes crear cotizaciones');
    const empresa = await this.empresas.findById(datos.empresaId);
    if (!empresa) throw new ValidationError('La empresa no existe', { empresaId: 'No válida' });
    if (!datos.conceptos.length) throw new ValidationError('Agrega al menos un concepto', { conceptos: 'Requerido' });

    const ahora = this.clock.now();
    const num = await this.contadores.siguiente(`cotizaciones-${ahora.getFullYear()}`);
    const folio = `COT-${ahora.getFullYear()}-${String(num).padStart(4, '0')}`;

    const cotizacion = new Cotizacion({
      id: this.ids.newId(),
      folio,
      empresaId: datos.empresaId,
      empresaNombre: empresa.nombre,
      contactoId: datos.contactoId ?? null,
      fecha: ahora,
      vigenciaDias: datos.vigenciaDias ?? 15,
      conceptos: datos.conceptos,
      notas: datos.notas ?? null,
      origenCalculadora: datos.origenCalculadora ?? false,
      parametrosCompac: datos.parametrosCompac ?? null,
      creadoPorUid: actor.uid,
      createdAt: ahora,
    });
    await this.repo.save(cotizacion);
    await this.bitacora.registrar({
      actor,
      accion: 'crear',
      modulo: 'cotizaciones',
      entidadTipo: 'Cotizacion',
      entidadId: cotizacion.id,
      resumen: `${folio} para ${empresa.nombre} — ${this.fmt(cotizacion.total, cotizacion.moneda)}`,
    });
    await this.webhooks.publicar({
      evento: 'cotizacion.creada',
      canal: 'cotizaciones',
      payload: { id: cotizacion.id, folio, empresaId: empresa.id, empresaNombre: empresa.nombre, total: cotizacion.total },
    });
    return cotizacion;
  }

  async actualizarConceptos(
    actor: SessionUser,
    id: string,
    conceptos: ConceptoCotizacion[],
    notas?: string,
  ): Promise<Cotizacion> {
    this.assertPuedeEditar(actor);
    const cotizacion = await this.obtener(id);
    cotizacion.reemplazarConceptos(conceptos, this.clock.now());
    if (notas !== undefined) cotizacion.notas = notas.trim() || null;
    await this.repo.save(cotizacion);
    await this.bitacora.registrar({
      actor,
      accion: 'editar',
      modulo: 'cotizaciones',
      entidadTipo: 'Cotizacion',
      entidadId: id,
      resumen: `${cotizacion.folio} actualizada`,
    });
    return cotizacion;
  }

  async cambiarEstado(actor: SessionUser, id: string, estado: EstadoCotizacion): Promise<void> {
    const requiereAprobar = estado === 'aceptada' || estado === 'rechazada';
    if (requiereAprobar && !actor.permisos.includes('cotizaciones:aprobar')) {
      throw new ForbiddenError('No puedes aprobar/rechazar cotizaciones');
    }
    this.assertPuedeEditar(actor);
    const cotizacion = await this.obtener(id);
    cotizacion.cambiarEstado(estado, this.clock.now());
    await this.repo.save(cotizacion);
    await this.bitacora.registrar({
      actor,
      accion: 'cambiar_estado',
      modulo: 'cotizaciones',
      entidadTipo: 'Cotizacion',
      entidadId: id,
      resumen: `${cotizacion.folio} → ${estado}`,
    });
  }

  contarPorEstado(): Promise<Record<string, number>> {
    return this.repo.contarPorEstado();
  }

  /**
   * Envía la cotización por correo al contacto indicado (o al principal de la empresa) y,
   * si estaba en borrador, la marca como "enviada".
   */
  async enviarPorCorreo(
    actor: SessionUser,
    id: string,
    opts: { para?: string } = {},
  ): Promise<{ enviadoA: string }> {
    this.assertPuedeEditar(actor);
    const cotizacion = await this.obtener(id);

    let destino = opts.para?.trim().toLowerCase() || '';
    let nombreDestino = '';
    if (!destino) {
      const contactos = await this.contactos.list({ empresaId: cotizacion.empresaId, activo: true });
      const contacto =
        contactos.find((c) => c.email) ?? null;
      if (!contacto?.email) {
        throw new ValidationError(
          'La empresa no tiene un contacto con correo. Indica un destinatario.',
          { para: 'Requerido' },
        );
      }
      destino = contacto.email;
      nombreDestino = contacto.nombre;
    }

    await this.email.enviar({
      para: [{ email: destino, ...(nombreDestino ? { nombre: nombreDestino } : {}) }],
      asunto: `Cotización ${cotizacion.folio} — ${cotizacion.empresaNombre ?? ''}`.trim(),
      html: this.htmlCotizacion(cotizacion),
      tags: ['cotizacion'],
    });

    const ahora = this.clock.now();
    if (cotizacion.estado === 'borrador') {
      cotizacion.cambiarEstado('enviada', ahora);
      await this.repo.save(cotizacion);
    }
    await this.bitacora.registrar({
      actor,
      accion: 'enviar',
      modulo: 'cotizaciones',
      entidadTipo: 'Cotizacion',
      entidadId: id,
      resumen: `${cotizacion.folio} enviada por correo a ${destino}`,
    });
    return { enviadoA: destino };
  }

  /** Crea un ticket interno de seguimiento a partir de la cotización. */
  async crearTicketSeguimiento(actor: SessionUser, id: string): Promise<Ticket> {
    const cotizacion = await this.obtener(id);
    const lineas = cotizacion.conceptos
      .map((c) => `• ${c.cantidad} × ${c.descripcion} — ${this.fmt(c.importe, cotizacion.moneda)}`)
      .join('\n');
    const ticket = await this.crearTicket.ejecutar({
      actor,
      asunto: `Seguimiento cotización ${cotizacion.folio}`,
      descripcion:
        `Seguimiento comercial de la cotización ${cotizacion.folio} para ${cotizacion.empresaNombre ?? 'la empresa'}.\n\n` +
        `${lineas}\n\nTotal: ${this.fmt(cotizacion.total, cotizacion.moneda)}\n` +
        `Cotización: ${this.baseUrl}/app/cotizaciones/${cotizacion.id}`,
      tipo: '',
      prioridad: 'Media',
      canal: 'interno',
      empresaId: cotizacion.empresaId,
      empresaNombre: cotizacion.empresaNombre,
      asignarAlActor: true,
    });
    await this.bitacora.registrar({
      actor,
      accion: 'crear_ticket',
      modulo: 'cotizaciones',
      entidadTipo: 'Cotizacion',
      entidadId: id,
      resumen: `${cotizacion.folio} → ticket #${ticket.numero}`,
    });
    return ticket;
  }

  private htmlCotizacion(c: Cotizacion): string {
    const filas = c.conceptos
      .map(
        (x) =>
          `<tr><td>${escaparHtml(x.descripcion)}</td><td align="right">${x.cantidad}</td>` +
          `<td align="right">${this.fmt(x.precioUnitario, c.moneda)}</td>` +
          `<td align="right">${this.fmt(x.importe, c.moneda)}</td></tr>`,
      )
      .join('');
    return `
      <p>Adjuntamos la cotización <strong>${c.folio}</strong>.</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <thead><tr><th align="left">Concepto</th><th>Cant.</th><th>P. unitario</th><th>Importe</th></tr></thead>
        <tbody>${filas}</tbody>
        <tfoot>
          <tr><td colspan="3" align="right">Subtotal</td><td align="right">${this.fmt(c.subtotal, c.moneda)}</td></tr>
          <tr><td colspan="3" align="right">IVA</td><td align="right">${this.fmt(c.iva, c.moneda)}</td></tr>
          <tr><td colspan="3" align="right"><strong>Total</strong></td><td align="right"><strong>${this.fmt(c.total, c.moneda)}</strong></td></tr>
        </tfoot>
      </table>
      <p>Vigencia: ${c.vigenciaDias} días.${c.notas ? `<br>${escaparHtml(c.notas).replaceAll('\n', '<br>')}` : ''}</p>
      <p><a href="${this.baseUrl}/app/cotizaciones/${c.id}/imprimir">Ver / imprimir cotización</a></p>`;
  }

  private fmt(n: number, moneda: string): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda }).format(n);
  }
}

/** Escape mínimo para interpolar texto de usuario en el HTML del correo. */
function escaparHtml(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
}
