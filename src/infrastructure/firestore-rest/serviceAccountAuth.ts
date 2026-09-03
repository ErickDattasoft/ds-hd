/**
 * Mint de access tokens OAuth2 para el service account de Firebase, sin `firebase-admin`
 * ni `google-auth-library` (ambos arrastran dependencias que no corren en Cloudflare
 * Workers). Firma un JWT RS256 con Web Crypto (`crypto.subtle`), disponible igual en Node 22
 * y en Workers, y lo intercambia por un token en `oauth2.googleapis.com/token`.
 *
 * El token se cachea en memoria y se refresca ~1 min antes de expirar.
 */

/** Forma del JSON del service account (`FIREBASE_SERVICE_ACCOUNT_B64` decodificado). */
export interface ServiceAccount {
  readonly client_email: string;
  readonly private_key: string;
  readonly token_uri?: string;
  readonly project_id?: string;
}

/** Scope necesario para Firestore + Identity Toolkit (Auth). */
const SCOPE = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/firebase',
  'https://www.googleapis.com/auth/identitytoolkit',
].join(' ');

const b64url = (bytes: ArrayBuffer | Uint8Array): string => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const b64urlJson = (obj: unknown): string =>
  b64url(new TextEncoder().encode(JSON.stringify(obj)));

/** PEM PKCS#8 (`-----BEGIN PRIVATE KEY-----`) → `ArrayBuffer` DER. */
function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(body);
  const der = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) der[i] = raw.charCodeAt(i);
  return der.buffer;
}

interface CachedToken {
  token: string;
  /** epoch ms en que deja de servir (ya con el margen de seguridad aplicado). */
  expiraEn: number;
}

/** Emite y cachea access tokens para un service account. Una instancia por proceso. */
export class ServiceAccountTokenSource {
  private cache: CachedToken | null = null;
  private pendiente: Promise<string> | null = null;
  private clave: Awaited<ReturnType<typeof crypto.subtle.importKey>> | null = null;

  constructor(
    private readonly sa: ServiceAccount,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** Un access token válido (del cache si aún sirve, si no lo renueva). */
  async token(): Promise<string> {
    if (this.cache && Date.now() < this.cache.expiraEn) return this.cache.token;
    this.pendiente ??= this.renovar().finally(() => {
      this.pendiente = null;
    });
    return this.pendiente;
  }

  private async importarClave(): Promise<Awaited<ReturnType<typeof crypto.subtle.importKey>>> {
    this.clave ??= await crypto.subtle.importKey(
      'pkcs8',
      pemToDer(this.sa.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    return this.clave;
  }

  private async firmarJwt(): Promise<string> {
    const ahora = Math.floor(Date.now() / 1000);
    const tokenUri = this.sa.token_uri ?? 'https://oauth2.googleapis.com/token';
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
      iss: this.sa.client_email,
      scope: SCOPE,
      aud: tokenUri,
      iat: ahora,
      exp: ahora + 3600,
    };
    const firmar = `${b64urlJson(header)}.${b64urlJson(claims)}`;
    const firma = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      await this.importarClave(),
      new TextEncoder().encode(firmar),
    );
    return `${firmar}.${b64url(firma)}`;
  }

  private async renovar(): Promise<string> {
    const jwt = await this.firmarJwt();
    const tokenUri = this.sa.token_uri ?? 'https://oauth2.googleapis.com/token';
    const res = await this.fetchImpl(tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    if (!res.ok) {
      throw new Error(`OAuth2 token: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.cache = {
      token: data.access_token,
      expiraEn: Date.now() + (data.expires_in - 60) * 1000,
    };
    return data.access_token;
  }
}

/** Decodifica `FIREBASE_SERVICE_ACCOUNT_B64` a `ServiceAccount`. */
export function parseServiceAccount(b64: string): ServiceAccount {
  const json = JSON.parse(
    typeof Buffer !== 'undefined'
      ? Buffer.from(b64, 'base64').toString('utf8')
      : new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))),
  ) as ServiceAccount;
  if (!json.client_email || !json.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 no contiene client_email/private_key');
  }
  return json;
}
