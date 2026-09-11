import { describe, expect, it } from 'vitest';
import { LogoEmailSender } from '../../src/infrastructure/email/LogoEmailSender.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { InMemoryConfiguracionRepository } from '../fakes/tickets.js';

describe('LogoEmailSender', () => {
  it('agrega el logo como encabezado cuando hay uno configurado', async () => {
    const inner = new FakeEmailSender();
    const repo = new InMemoryConfiguracionRepository();
    repo.logo = { contentType: 'image/png', tamano: 100, data: 'data:image/png;base64,AAAA' };
    const sender = new LogoEmailSender(inner, repo, 'https://ds-hd.example.com');

    await sender.enviar({ para: [{ email: 'a@b.com' }], asunto: 'Hola', html: '<p>Cuerpo</p>' });

    expect(inner.ultimo?.html).toContain('https://ds-hd.example.com/logo');
    expect(inner.ultimo?.html).toContain('<p>Cuerpo</p>');
  });

  it('no agrega nada si no hay logo configurado', async () => {
    const inner = new FakeEmailSender();
    const repo = new InMemoryConfiguracionRepository();
    const sender = new LogoEmailSender(inner, repo, 'https://ds-hd.example.com');

    await sender.enviar({ para: [{ email: 'a@b.com' }], asunto: 'Hola', html: '<p>Cuerpo</p>' });

    expect(inner.ultimo?.html).toBe('<p>Cuerpo</p>');
  });
});
