import type { CorreoSaliente, IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';

/**
 * Decora cualquier {@link IEmailSender} con el remitente elegido en Configuración → Correo entrante
 * (p. ej. servicio@). Sin remitente configurado sale el del servidor (`BREVO_SENDER_EMAIL`), así
 * cambiar de buzón no exige tocar secretos de Cloudflare.
 */
export class RemitenteEmailSender implements IEmailSender {
  constructor(
    private readonly inner: IEmailSender,
    private readonly configuracion: IConfiguracionRepository,
  ) {}

  async enviar(correo: CorreoSaliente): Promise<void> {
    if (correo.de) return this.inner.enviar(correo);
    const cfg = await this.configuracion.obtenerCorreoEntrante().catch(() => null);
    if (!cfg?.remitenteEmail) return this.inner.enviar(correo);
    await this.inner.enviar({
      ...correo,
      de: { email: cfg.remitenteEmail, ...(cfg.remitenteNombre ? { nombre: cfg.remitenteNombre } : {}) },
    });
  }
}

/** Resultado de comprobar que Brevo acepta un remitente. */
export interface VerificacionRemitente {
  ok: boolean;
  detalle: string;
}

/**
 * ¿Brevo deja mandar desde `email`? Sí si es un remitente activo (verificado) o si su dominio está
 * autenticado. Sin esto, guardar un remitente no verificado tiraría TODO el correo del CRM.
 */
export async function verificarRemitenteBrevo(apiKey: string, email: string): Promise<VerificacionRemitente> {
  const headers = { 'api-key': apiKey, accept: 'application/json' };
  const dominio = email.split('@')[1] ?? '';
  try {
    const r = await fetch('https://api.brevo.com/v3/senders', { headers, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return { ok: false, detalle: `Brevo respondió ${r.status} al consultar los remitentes` };
    const { senders = [] } = (await r.json()) as { senders?: { email?: string; active?: boolean }[] };
    const s = senders.find((x) => (x.email ?? '').toLowerCase() === email);
    if (s?.active) return { ok: true, detalle: `${email} está verificado en Brevo` };

    const d = await fetch('https://api.brevo.com/v3/senders/domains', { headers, signal: AbortSignal.timeout(10_000) });
    if (d.ok) {
      const { domains = [] } = (await d.json()) as { domains?: { domain_name?: string; authenticated?: boolean }[] };
      if (domains.some((x) => (x.domain_name ?? '').toLowerCase() === dominio && x.authenticated)) {
        return { ok: true, detalle: `el dominio ${dominio} está autenticado en Brevo` };
      }
    }
    return {
      ok: false,
      detalle: s
        ? `${email} está dado de alta en Brevo pero falta verificarlo (revisa el correo de verificación en ese buzón)`
        : `${email} no está dado de alta como remitente en Brevo (Senders → Add a sender)`,
    };
  } catch (err) {
    return { ok: false, detalle: `No se pudo consultar Brevo: ${err instanceof Error ? err.message : String(err)}` };
  }
}
