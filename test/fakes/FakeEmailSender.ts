import type { CorreoSaliente, IEmailSender } from '../../src/core/ports/services/IEmailSender.js';

/** Fake de {@link IEmailSender}: guarda los correos para aseverarlos en los tests. */
export class FakeEmailSender implements IEmailSender {
  readonly enviados: CorreoSaliente[] = [];
  /** Si es `true`, `enviar` lanza — simula un rechazo de Brevo. */
  fallar = false;

  async enviar(correo: CorreoSaliente): Promise<void> {
    if (this.fallar) throw new Error('Brevo respondió 400 (simulado)');
    this.enviados.push(correo);
  }

  get ultimo(): CorreoSaliente | undefined {
    return this.enviados.at(-1);
  }
}
