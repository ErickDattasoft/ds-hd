import { textoOHtmlASeguro } from '../../core/entities/value-objects/descripcionHtml.js';
import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { NotaTicket } from '../../core/entities/NotaTicket.js';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import {
  MAX_ADJUNTO_BYTES,
  normalizarTipoAdjunto,
  sanearNombreArchivo,
} from '../../core/entities/AdjuntoTicket.js';
import { Email } from '../../core/entities/value-objects/Email.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import { publicarNotaInterna, registrarEvento } from './efectos.js';
import { historialActividadHtml } from './historialCorreo.js';
import { destinatariosTicket } from './notificacionTicket.js';
import type { RegistrarNotaInput } from './dto.js';
import { ticketVisiblePara } from './alcance.js';

/** Caso de uso: agregar una nota (pública o interna) a un ticket. */
export class RegistrarNotaService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly email: IEmailSender,
    private readonly logger: ILogger,
    private readonly webhooks?: IWebhookPublisher,
    private readonly adjuntos?: IAdjuntoTicketRepository,
    /** URL pública del CRM: las imágenes del correo apuntan a `/adjunto/<id>`. */
    private readonly baseUrl = '',
  ) {}

  /** Máximo de capturas por respuesta. */
  static readonly MAX_IMAGENES = 5;

  async ejecutar(input: RegistrarNotaInput): Promise<NotaTicket> {
    const cuerpo = input.cuerpo.trim();
    if (cuerpo.length < 1) throw new ValidationError('La nota está vacía', { cuerpo: 'Requerida' });

    if (input.tipo === 'interna' && !input.actor.permisos.includes('tickets:ver_notas_internas')) {
      throw new ForbiddenError('No puedes escribir notas internas');
    }
    if (!input.actor.permisos.includes('tickets:editar') && !input.actor.esCliente) {
      throw new ForbiddenError('No puedes escribir en tickets');
    }

    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    if (
      input.actor.esStaff &&
      !ticketVisiblePara(ticket, input.actor)
    ) {
      throw new ForbiddenError('Solo puedes escribir en tickets asignados a ti');
    }

    const ahora = this.clock.now();
    const adjuntoIds = await this.guardarImagenes(ticket.id, input, ahora);
    const nota: NotaTicket = {
      id: this.ids.newId(),
      tipo: input.tipo,
      cuerpo,
      autorUid: input.actor.uid,
      autorNombre: input.actor.nombre,
      createdAt: ahora,
      ...(adjuntoIds.length ? { adjuntoIds } : {}),
    };
    await this.tickets.agregarNota(ticket.id, nota);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: `${input.tipo === 'publica' && input.actor.esStaff ? 'Respuesta' : `Nota ${input.tipo}`} de ${input.actor.nombre}${
        adjuntoIds.length ? ` (${adjuntoIds.length} imagen(es))` : ''
      }`,
      actor: input.actor,
      at: ahora,
    });

    if (nota.tipo === 'interna') await publicarNotaInterna(this.webhooks, ticket, cuerpo, input.actor.nombre);

    if (input.actor.esStaff) {
      ticket.registrarPrimeraRespuesta(ahora);
      await this.tickets.save(ticket);
    }

    if (nota.tipo === 'publica' && input.actor.esStaff) {
      const cfg = await this.config.obtenerTickets();
      const agente = ticket.agenteAsignadoUid
        ? await this.usuarios.findByUid(ticket.agenteAsignadoUid)
        : null;
      const dest = destinatariosTicket(
        ticket,
        cfg.correosNotificacion,
        agente?.email.value ?? input.actor.email,
      );
      if (dest.para.length > 0) {
        const firma = input.actor.firma ? `<hr />${textoOHtmlASeguro(input.actor.firma)}` : '';
        const historial = historialActividadHtml(await this.tickets.listarEventos(ticket.id), 'cliente');
        const avisoSinContacto = dest.sinContacto
          ? `<p style="background:#fef3c7;color:#92400e;padding:8px 12px;border-radius:6px">⚠️ El contacto del ticket no tiene correo — esta nota solo llegó al equipo.</p>`
          : '';
        // "Con copia" de esta respuesta, sin repetir a quien ya va en Para/CC.
        const yaVan = new Set([...dest.para, ...dest.cc].map((d) => d.email.toLowerCase()));
        const ccExtra = (input.cc ?? [])
          .map((c) => Email.tryCreate(c.trim()))
          .filter((c): c is Email => c !== null && !yaVan.has(c.value))
          .map((c) => ({ email: c.value }));
        const cc = [...dest.cc, ...ccExtra];
        const base = this.baseUrl.replace(/\/+$/, '');
        const imagenesHtml = adjuntoIds
          .map((id, i) => `<p><a href="${base}/adjunto/${id}"><img src="${base}/adjunto/${id}" alt="Imagen ${i + 1}" style="max-width:100%;height:auto"></a></p>`)
          .join('');
        await this.email.enviar({
          para: dest.para,
          ...(cc.length ? { cc } : {}),
          ...(dest.cco.length ? { cco: dest.cco } : {}),
          ...(dest.responderA ? { responderA: dest.responderA } : {}),
          // "[Ticket #N]" en el asunto: si el cliente contesta, su respuesta regresa a este ticket.
          asunto: `[Ticket #${ticket.numero}] ${ticket.asunto}`,
          html: `${avisoSinContacto}<div>${textoOHtmlASeguro(cuerpo)}</div>${imagenesHtml}${firma}<hr /><p class="muted">Ticket #${ticket.numero} — ${ticket.asunto}</p>${historial}`,
          tags: ['ticket-nota', `ticket-${ticket.numero}`],
        });
      }
    }

    this.logger.info('Nota registrada', { numero: ticket.numero, tipo: input.tipo, por: input.actor.uid });
    return nota;
  }

  /** Guarda las capturas como adjuntos del ticket y devuelve sus ids (valida tipo y tamaño). */
  private async guardarImagenes(ticketId: string, input: RegistrarNotaInput, ahora: Date): Promise<string[]> {
    if (!this.adjuntos || !input.imagenes?.length) return [];
    const ids: string[] = [];
    for (const img of input.imagenes.slice(0, RegistrarNotaService.MAX_IMAGENES)) {
      const contentType = normalizarTipoAdjunto(img.nombre, img.contentType);
      const base64 = img.base64.replace(/\s/g, '');
      const tamano = Math.floor((base64.length * 3) / 4);
      if (!contentType.startsWith('image/') || contentType === 'image/svg+xml') {
        throw new ValidationError('Solo se pueden adjuntar imágenes a una respuesta', { imagenes: 'Tipo no permitido' });
      }
      if (!tamano || tamano > MAX_ADJUNTO_BYTES) {
        throw new ValidationError(`Cada imagen debe pesar menos de ${Math.round(MAX_ADJUNTO_BYTES / 1024)} KB`, { imagenes: 'Muy grande' });
      }
      const id = this.ids.newId();
      await this.adjuntos.crear({
        id,
        ticketId,
        nombre: sanearNombreArchivo(img.nombre),
        contentType,
        tamano,
        data: `data:${contentType};base64,${base64}`,
        subidoPorUid: input.actor.uid,
        subidoPorNombre: input.actor.nombre,
        createdAt: ahora,
      });
      ids.push(id);
    }
    return ids;
  }
}
