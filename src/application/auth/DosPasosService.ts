import { createHmac, timingSafeEqual } from 'node:crypto';
import qrcode from 'qrcode-generator';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { generarSecretoTotp, uriTotp, verificarTotp } from './totp.js';

/** Minutos que dura el paso intermedio del login (contraseña correcta, falta el código). */
const PENDIENTE_MS = 5 * 60_000;

/** Verificación en dos pasos (TOTP con app autenticadora: Google Authenticator, Microsoft, Authy…). */
export class DosPasosService {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly clock: IClock,
    private readonly logger: ILogger,
    private readonly secreto: string,
    private readonly emisor: string,
  ) {}

  private async usuario(uid: string) {
    const u = await this.usuarios.findByUid(uid);
    if (!u) throw new NotFoundError('Usuario', uid);
    return u;
  }

  /** Genera (o reutiliza) un secreto pendiente de confirmar y devuelve el QR para escanearlo. */
  async iniciar(actor: SessionUser): Promise<{ secreto: string; qrDataUrl: string }> {
    const u = await this.usuario(actor.uid);
    if (u.totpActivo) throw new ValidationError('La verificación en dos pasos ya está activa');
    if (!u.totpSecreto) {
      u.totpSecreto = generarSecretoTotp();
      u.updatedAt = this.clock.now();
      await this.usuarios.save(u);
    }
    const qr = qrcode(0, 'M');
    qr.addData(uriTotp(u.totpSecreto, u.email.value, this.emisor));
    qr.make();
    return { secreto: u.totpSecreto, qrDataUrl: qr.createDataURL(5, 2) };
  }

  /** Confirma con un código de la app y deja activa la verificación. */
  async activar(actor: SessionUser, codigo: string): Promise<void> {
    const u = await this.usuario(actor.uid);
    if (!u.totpSecreto || !verificarTotp(u.totpSecreto, codigo, this.clock.now())) {
      throw new ValidationError('Código incorrecto', { codigo: 'El código no coincide; revisa la hora de tu teléfono' });
    }
    u.totpActivo = true;
    u.updatedAt = this.clock.now();
    await this.usuarios.save(u);
    this.logger.info('Verificación en dos pasos activada', { uid: u.uid });
  }

  /** El propio usuario la apaga (pide un código vigente). */
  async desactivar(actor: SessionUser, codigo: string): Promise<void> {
    const u = await this.usuario(actor.uid);
    if (u.totpActivo && (!u.totpSecreto || !verificarTotp(u.totpSecreto, codigo, this.clock.now()))) {
      throw new ValidationError('Código incorrecto', { codigo: 'Escribe un código vigente de tu app' });
    }
    await this.limpiar(u.uid);
  }

  /** Un administrador la quita a otro usuario (p. ej. perdió el teléfono). */
  async resetear(actor: SessionUser, uid: string): Promise<void> {
    if (!actor.permisos.includes('usuarios:gestionar')) throw new ForbiddenError('No puedes hacer esto');
    await this.limpiar(uid);
    this.logger.info('Verificación en dos pasos quitada por admin', { uid, por: actor.uid });
  }

  private async limpiar(uid: string): Promise<void> {
    const u = await this.usuario(uid);
    u.totpSecreto = null;
    u.totpActivo = false;
    u.updatedAt = this.clock.now();
    await this.usuarios.save(u);
  }

  /** ¿El código es válido para ese usuario? */
  async verificarCodigo(uid: string, codigo: string): Promise<boolean> {
    const u = await this.usuario(uid);
    return Boolean(u.totpActivo && u.totpSecreto && verificarTotp(u.totpSecreto, codigo, this.clock.now()));
  }

  // ── Token del paso intermedio del login (cookie corta, firmada) ─────────────
  private firma(datos: string): string {
    return createHmac('sha256', this.secreto).update(`2fa:${datos}`).digest('base64url');
  }

  firmarPendiente(uid: string): string {
    const datos = `${Buffer.from(uid).toString('base64url')}.${this.clock.now().getTime() + PENDIENTE_MS}`;
    return `${datos}.${this.firma(datos)}`;
  }

  /** uid del login pendiente, o `null` si el token es inválido o ya expiró. */
  leerPendiente(token: string): string | null {
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    const datos = `${partes[0]}.${partes[1]}`;
    const esperada = Buffer.from(this.firma(datos));
    const recibida = Buffer.from(partes[2]!);
    if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
    if (Number(partes[1]) < this.clock.now().getTime()) return null;
    return Buffer.from(partes[0]!, 'base64url').toString();
  }
}
