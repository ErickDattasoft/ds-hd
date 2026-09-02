import type { ISolicitudAccesoRepository } from '../../core/ports/repositories/ISolicitudAccesoRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { Email } from '../../core/entities/value-objects/Email.js';
import { ValidationError } from '../../core/errors/DomainError.js';

/** Datos del formulario público de "solicitar acceso" al back-office. */
export interface SolicitarAccesoInput {
  email: string;
  nombre: string;
  mensaje?: string;
  /** Correos a los que se notifica la solicitud (config general). */
  notificarA: string[];
}

/** Caso de uso: alguien pide acceso al back-office desde la pantalla de login. */
export class SolicitarAccesoService {
  constructor(
    private readonly solicitudes: ISolicitudAccesoRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly email: IEmailSender,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: SolicitarAccesoInput): Promise<void> {
    const email = Email.create(input.email);
    const nombre = input.nombre.trim();
    if (nombre.length < 2) {
      throw new ValidationError('Escribe tu nombre', { nombre: 'Requerido' });
    }

    // Silenciosamente no-op si ya existe usuario o ya hay solicitud (evita enumeración/spam).
    const [yaEsUsuario, yaSolicito] = await Promise.all([
      this.usuarios.findByEmail(email.value),
      this.solicitudes.findByEmail(email.value),
    ]);
    if (yaEsUsuario || yaSolicito) {
      this.logger.info('Solicitud de acceso duplicada, ignorada', { email: email.value });
      return;
    }

    await this.solicitudes.create({
      email: email.value,
      nombre,
      mensaje: input.mensaje?.trim() || null,
    });

    const destinatarios = input.notificarA.map((e) => Email.tryCreate(e)).filter((e) => e !== null);
    if (destinatarios.length > 0) {
      await this.email.enviar({
        para: destinatarios.map((e) => ({ email: e.value })),
        asunto: `Nueva solicitud de acceso: ${nombre}`,
        html: `<p><strong>${nombre}</strong> (${email.value}) solicitó acceso al sistema.</p>${
          input.mensaje ? `<p>Mensaje: ${input.mensaje}</p>` : ''
        }`,
        tags: ['solicitud-acceso'],
      });
    }
    this.logger.info('Solicitud de acceso registrada', { email: email.value });
  }
}
