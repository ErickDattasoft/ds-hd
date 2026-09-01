import type { CorreoSaliente, IEmailSender } from '../../src/core/ports/services/IEmailSender.js';

/** Fake de {@link IEmailSender}: guarda los correos para aseverarlos en los tests. */
export class FakeEmailSender implements IEmailSender {
  readonly enviados: CorreoSaliente[] = [];

  async enviar(correo: CorreoSaliente): Promise<void> {
    this.enviados.push(correo);
  }

  get ultimo(): CorreoSaliente | undefined {
    return this.enviados.at(-1);
  }
}
