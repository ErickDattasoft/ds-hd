import { z } from 'zod';

/**
 * Esquema de configuración de entorno. Se valida una sola vez al arrancar (fail-fast):
 * si falta una variable requerida o tiene un formato inválido, el proceso no levanta.
 *
 * Cada `.describe(...)` se reutiliza para autogenerar la tabla de variables de entorno
 * del README (ver scripts/docs/generate-readme.ts).
 */
const booleanish = z
  .enum(['true', 'false', '1', '0', ''])
  .transform((v) => v === 'true' || v === '1');

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development')
    .describe('Modo de ejecución de Node.'),
  PORT: z.coerce.number().int().positive().default(3000).describe('Puerto HTTP del servidor.'),
  APP_BASE_URL: z
    .string()
    .url()
    .default('http://localhost:3000')
    .describe('URL pública base de la app (para enlaces en correos e invitaciones).'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info')
    .describe('Nivel mínimo de log (pino).'),

  SESSION_COOKIE_SECRET: z
    .string()
    .min(16, 'SESSION_COOKIE_SECRET debe tener al menos 16 caracteres')
    .default('dev-only-insecure-session-secret-change-me')
    .describe('Secreto para firmar la cookie de sesión y el token CSRF.'),

  FIREBASE_PROJECT_ID: z.string().min(1).describe('ID del proyecto Firebase (nuevo, aislado).'),
  FIRESTORE_DRIVER: z
    .enum(['admin', 'rest'])
    .default('admin')
    .describe(
      'Cómo se accede a Firestore/Auth: `admin` = firebase-admin SDK (Node/Docker); `rest` = cliente REST propio vía fetch (Cloudflare Workers, sin gRPC).',
    ),
  FIREBASE_API_KEY: z
    .string()
    .default('')
    .describe('API key web de Firebase; solo para el sign-in por REST (Identity Toolkit).'),
  FIREBASE_SERVICE_ACCOUNT_B64: z
    .string()
    .default('')
    .describe('Service account JSON del proyecto, codificado en base64 (o usar GOOGLE_APPLICATION_CREDENTIALS).'),
  FIREBASE_STORAGE_BUCKET: z
    .string()
    .default('')
    .describe('Bucket de Firebase Storage para adjuntos.'),
  FIRESTORE_EMULATOR_HOST: z
    .string()
    .default('')
    .describe('Host:puerto del emulador de Firestore (solo dev/test).'),
  FIREBASE_AUTH_EMULATOR_HOST: z
    .string()
    .default('')
    .describe('Host:puerto del emulador de Auth de Firebase (solo dev/test).'),

  SMTP_HOST: z.string().default('').describe('Host SMTP para correo (dev: MailHog). Si se define, tiene prioridad sobre Brevo.'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025).describe('Puerto SMTP.'),
  SMTP_SECURE: booleanish.default(false).describe('TLS implícito en SMTP (puerto 465).'),
  SMTP_USER: z.string().default('').describe('Usuario SMTP (vacío = sin auth, p. ej. MailHog).'),
  SMTP_PASS: z.string().default('').describe('Contraseña SMTP.'),
  BREVO_API_KEY: z.string().default('').describe('API key de Brevo para correo transaccional.'),
  BREVO_SENDER_NAME: z.string().default('Soporte DATTASOFT').describe('Nombre del remitente de correo.'),
  BREVO_SENDER_EMAIL: z
    .string()
    .default('soporte@dattasoft.mx')
    .describe('Correo del remitente (verificado en Brevo).'),

  N8N_WEBHOOK_TICKETS: z.string().default('').describe('URL del webhook n8n para eventos de tickets.'),
  N8N_WEBHOOK_COTIZACIONES: z
    .string()
    .default('')
    .describe('URL del webhook n8n para eventos de cotizaciones.'),

  TURNSTILE_SITE_KEY: z.string().default('').describe('Site key de Cloudflare Turnstile (formularios públicos).'),
  TURNSTILE_SECRET: z.string().default('').describe('Secret de Cloudflare Turnstile (verificación server-side).'),

  JOBS_SECRET: z
    .string()
    .default('dev-jobs-secret')
    .describe('Bearer que protege los endpoints /jobs/* invocados por el cron.'),

  DISABLE_FIREBASE: booleanish
    .default(false)
    .describe('Si es true, no inicializa firebase-admin (útil para smoke tests sin credenciales).'),
});

export type Env = z.infer<typeof envSchema>;

export type AppConfig = {
  readonly env: Env['NODE_ENV'];
  readonly isProduction: boolean;
  readonly isTest: boolean;
  readonly port: number;
  readonly baseUrl: string;
  readonly logLevel: Env['LOG_LEVEL'];
  readonly session: { readonly secret: string };
  readonly firebase: {
    readonly projectId: string;
    readonly driver: 'admin' | 'rest';
    readonly apiKey: string;
    readonly serviceAccountB64: string;
    readonly storageBucket: string;
    readonly emulatorHost: string;
    readonly authEmulatorHost: string;
    readonly disabled: boolean;
  };
  readonly smtp: {
    readonly host: string;
    readonly port: number;
    readonly secure: boolean;
    readonly user: string;
    readonly pass: string;
  };
  readonly brevo: { readonly apiKey: string; readonly senderName: string; readonly senderEmail: string };
  readonly n8n: { readonly ticketsWebhook: string; readonly cotizacionesWebhook: string };
  readonly turnstile: { readonly siteKey: string; readonly secret: string };
  readonly jobs: { readonly secret: string };
};

/** Valida `process.env` y devuelve la configuración tipada de la app. Lanza si algo es inválido. */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${detalle}`);
  }
  const e = parsed.data;
  return {
    env: e.NODE_ENV,
    isProduction: e.NODE_ENV === 'production',
    isTest: e.NODE_ENV === 'test',
    port: e.PORT,
    baseUrl: e.APP_BASE_URL,
    logLevel: e.LOG_LEVEL,
    session: { secret: e.SESSION_COOKIE_SECRET },
    firebase: {
      projectId: e.FIREBASE_PROJECT_ID,
      driver: e.FIRESTORE_DRIVER,
      apiKey: e.FIREBASE_API_KEY,
      serviceAccountB64: e.FIREBASE_SERVICE_ACCOUNT_B64,
      storageBucket: e.FIREBASE_STORAGE_BUCKET,
      emulatorHost: e.FIRESTORE_EMULATOR_HOST,
      authEmulatorHost: e.FIREBASE_AUTH_EMULATOR_HOST,
      disabled: e.DISABLE_FIREBASE,
    },
    smtp: {
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      user: e.SMTP_USER,
      pass: e.SMTP_PASS,
    },
    brevo: { apiKey: e.BREVO_API_KEY, senderName: e.BREVO_SENDER_NAME, senderEmail: e.BREVO_SENDER_EMAIL },
    n8n: { ticketsWebhook: e.N8N_WEBHOOK_TICKETS, cotizacionesWebhook: e.N8N_WEBHOOK_COTIZACIONES },
    turnstile: { siteKey: e.TURNSTILE_SITE_KEY, secret: e.TURNSTILE_SECRET },
    jobs: { secret: e.JOBS_SECRET },
  };
}
