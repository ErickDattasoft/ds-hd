import { createHmac, randomBytes } from 'node:crypto';

/** Códigos de un solo uso por tiempo (RFC 6238, SHA-1, 6 dígitos, 30 s) — los de Google Authenticator. */

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PASO_S = 30;

/** Codifica bytes en Base32 (sin relleno), el formato que usan las apps autenticadoras. */
export function base32(bytes: Uint8Array): string {
  let bits = 0;
  let valor = 0;
  let out = '';
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALFABETO[(valor << (5 - bits)) & 31];
  return out;
}

/** Decodifica Base32 (ignora espacios, guiones y relleno). */
export function desdeBase32(texto: string): Buffer {
  const limpio = texto.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let valor = 0;
  const out: number[] = [];
  for (const c of limpio) {
    const i = ALFABETO.indexOf(c);
    if (i < 0) throw new Error('Base32 inválido');
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Secreto nuevo (160 bits) en Base32. */
export function generarSecretoTotp(): string {
  return base32(randomBytes(20));
}

/** Código de 6 dígitos para un paso de tiempo. */
export function codigoTotp(secreto: string, pasoTiempo: number): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(pasoTiempo));
  const hmac = createHmac('sha1', desdeBase32(secreto)).update(contador).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const num = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(num).padStart(6, '0');
}

/** ¿El código es válido ahora? Acepta ±1 paso (30 s) por desfase de reloj. */
export function verificarTotp(secreto: string, codigo: string, ahora: Date): boolean {
  const limpio = codigo.replace(/\s/g, '');
  if (!/^\d{6}$/.test(limpio)) return false;
  const paso = Math.floor(ahora.getTime() / 1000 / PASO_S);
  return [-1, 0, 1].some((d) => codigoTotp(secreto, paso + d) === limpio);
}

/** URI `otpauth://` que se codifica en el QR. */
export function uriTotp(secreto: string, cuenta: string, emisor: string): string {
  const etiqueta = encodeURIComponent(`${emisor}:${cuenta}`);
  return `otpauth://totp/${etiqueta}?secret=${secreto}&issuer=${encodeURIComponent(emisor)}&algorithm=SHA1&digits=6&period=${PASO_S}`;
}
