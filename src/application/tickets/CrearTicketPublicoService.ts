import type { ITicketPublicoRepository } from '../../core/ports/repositories/ITicketPublicoRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { ICaptchaVerifier } from '../../core/ports/services/ICaptchaVerifier.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { TicketPublico } from '../../core/entities/TicketPublico.js';
import { Email } from '../../core/entities/value-objects/Email.js';
import { ValidationError } from '../../core/errors/DomainError.js';

/** Datos del formulario público (sin cuenta) para levantar un ticket. */
export interface CrearTicketPublicoInput {
  nombre: string;
  empresa?: string;
  correo: string;
  telefono?: string;
  asunto: string;
  sistema?: string;
  tipo?: string;
  prioridad?: string;
  descripcion: string;
  captchaToken?: string;
  ip?: string;
}

/** Caso de uso: alguien sin cuenta levanta un ticket desde el formulario público. */
export class CrearTicketPublicoService {
  constructor(
    private readonly buzon: ITicketPublicoRepository,
    private readonly config: IConfiguracionRepository,
    private readonly captcha: ICaptchaVerifier,
    private readonly email: IEmailSender,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: CrearTicketPublicoInput): Promise<TicketPublico> {
    if (!(await this.captcha.verificar(input.captchaToken, input.ip))) {
      throw new ValidationError('No pudimos verificar que no eres un robot. Recarga e inténtalo de nuevo.');
    }

    const correo = Email.create(input.correo);
    const nombre = input.nombre.trim();
    const asunto = input.asunto.trim();
    const descripcion = input.descripcion.trim();
    if (nombre.length < 2) throw new ValidationError('Escribe tu nombre', { nombre: 'Requerido' });
    if (asunto.length < 3) throw new ValidationError('Asunto muy corto', { asunto: 'Mínimo 3 caracteres' });
    if (descripcion.length < 10) {
      throw new ValidationError('Describe el problema con más detalle', { descripcion: 'Mínimo 10 caracteres' });
    }

    const cfg = await this.config.obtenerTickets();
    const ahora = this.clock.now();
    const folio = `PUB-${ahora.getTime().toString(36).toUpperCase()}`;

    const creado = await this.buzon.create({
      folio,
      nombre,
      empresa: input.empresa?.trim() || null,
      correo: correo.value,
      telefono: input.telefono?.trim() || null,
      asunto,
      sistema: input.sistema?.trim() || null,
      tipo: input.tipo && cfg.tipos.includes(input.tipo) ? input.tipo : null,
      prioridad: cfg.prioridades.includes(input.prioridad ?? '') ? input.prioridad! : 'Media',
      descripcion,
    });

    // Notificación al staff + confirmación al cliente (best-effort).
    const staff = cfg.correosNotificacion.map((e) => Email.tryCreate(e)).filter((e) => e !== null);
    if (staff.length > 0) {
      await this.email.enviar({
        para: staff.map((e) => ({ email: e.value })),
        asunto: `Nuevo ticket del portal: ${asunto}`,
        html: `<p><strong>${nombre}</strong> (${correo.value}) — ${input.empresa ?? 'sin empresa'}</p><p>${descripcion}</p><p>Folio: ${folio}</p>`,
        tags: ['ticket-publico'],
      });
    }
    await this.email.enviar({
      para: [{ email: correo.value, nombre }],
      asunto: `Recibimos tu solicitud (${folio})`,
      html: `<p>Hola ${nombre}, recibimos tu solicitud "<strong>${asunto}</strong>". Tu folio es <strong>${folio}</strong>. Te contactaremos pronto.</p>`,
      tags: ['ticket-publico-confirmacion'],
    });

    this.logger.info('Ticket público recibido', { folio });
    return creado;
  }
}
