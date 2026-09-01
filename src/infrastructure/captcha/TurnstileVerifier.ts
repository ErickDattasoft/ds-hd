import type { ICaptchaVerifier } from '../../core/ports/services/ICaptchaVerifier.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';

/** Verificador de Cloudflare Turnstile (server-side). */
export class TurnstileVerifier implements ICaptchaVerifier {
  constructor(
    private readonly secret: string,
    private readonly logger: ILogger,
  ) {}

  async verificar(token: string | undefined, ip?: string): Promise<boolean> {
    if (!token) return false;
    try {
      const body = new URLSearchParams({ secret: this.secret, response: token });
      if (ip) body.set('remoteip', ip);
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(6000),
      });
      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    } catch (err) {
      this.logger.warn('Turnstile no respondió', { err: err instanceof Error ? err.message : err });
      return false;
    }
  }
}

/** Sin captcha configurado: acepta todo (dev/tests). */
export class NullCaptchaVerifier implements ICaptchaVerifier {
  async verificar(): Promise<boolean> {
    return true;
  }
}
