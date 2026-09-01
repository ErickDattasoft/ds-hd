/** Verifica el token anti-bot de un formulario público (Cloudflare Turnstile). */
export interface ICaptchaVerifier {
  /** `true` si el token es válido. Si no hay captcha configurado, devuelve `true`. */
  verificar(token: string | undefined, ip?: string): Promise<boolean>;
}
