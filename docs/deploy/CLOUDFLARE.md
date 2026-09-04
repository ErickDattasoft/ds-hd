# Despliegue en Cloudflare Workers

Guía principal de despliegue de ds-hd — gratis, sin tarjeta. `docs/deploy/DROPLET.md` queda
como referencia dormida por si algún día hay presupuesto para un VPS real; no hace falta para
desplegar hoy.

## 0. Cuenta de Cloudflare

Una cuenta gratuita de Cloudflare (no requiere tarjeta) alcanza para Workers en el plan
gratuito. Si el dominio `dattasoft.mx` ya está en Cloudflare (como el CRM viejo), usa esa
misma cuenta.

## 1. Credenciales para GitHub Actions

`deploy.yml` despliega con [`cloudflare/wrangler-action`](https://github.com/cloudflare/wrangler-action)
en cada push a `main`. Necesita dos secrets del repo (Settings → Secrets and variables →
Actions):

- **`CLOUDFLARE_ACCOUNT_ID`**: Cloudflare dashboard → cualquier sitio o Workers & Pages →
  columna derecha "Account ID".
- **`CLOUDFLARE_API_TOKEN`**: dashboard → perfil → **API Tokens** → **Create Token** →
  plantilla "Edit Cloudflare Workers" (o un token custom con permiso `Account.Workers Scripts:Edit`
  y `Account.Workers Routes:Edit` si vas a usar un dominio propio). No uses el Global API Key.

Ambos también sirven para desplegar/gestionar secrets desde tu máquina local (paso 3) sin
`wrangler login` interactivo, exportando `CLOUDFLARE_API_TOKEN` como variable de entorno.

## 2. Variables no secretas (`wrangler.jsonc`)

Ya están commiteadas en [`wrangler.jsonc`](../../wrangler.jsonc) — `FIREBASE_PROJECT_ID`,
`FIRESTORE_DRIVER=rest`, `TURNSTILE_SITE_KEY`, `NODE_ENV`, `LOG_LEVEL`. Ninguna es sensible
(el project ID y el site key de Turnstile son públicos por diseño). Si cambian, edítalas ahí
y despliega de nuevo — no requieren `wrangler secret put`.

## 3. Secrets del Worker (una sola vez, vía `wrangler secret put`)

Estas SÍ son sensibles y viven solo en Cloudflare (nunca en el repo). Desde tu máquina, con
`CLOUDFLARE_API_TOKEN` exportado (o tras `npx wrangler login`):

```bash
npx wrangler secret put FIREBASE_API_KEY
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_B64   # ver nota abajo
npx wrangler secret put SESSION_COOKIE_SECRET           # genera uno nuevo: openssl rand -hex 32
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put APP_BASE_URL                    # p. ej. https://ds-hd.dattasoft.mx
npx wrangler secret put JOBS_SECRET                      # genera uno nuevo: openssl rand -hex 32
npx wrangler secret put BREVO_API_KEY
```

`FIREBASE_SERVICE_ACCOUNT_B64` es el JSON del service account del proyecto Firebase
(`ds-hd-b4939`) en base64, una sola línea:

```bash
base64 -w0 ruta/al/service-account.json | npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_B64
```

`APP_BASE_URL` va como secret (no en `wrangler.jsonc`) para no commitear el dominio final
antes de decidirlo — puedes cambiarlo con el mismo comando en cualquier momento, sin tocar
código. Antes de tener dominio propio, usa la URL `*.workers.dev` que Cloudflare asigna al
desplegar (ver paso 5).

Cada `wrangler secret put` pide el valor por stdin/prompt y no lo imprime ni lo guarda en el
repo. Los secrets persisten en Cloudflare entre despliegues — no hace falta repetir este paso
en cada `git push`, solo cuando un valor cambia.

## 4. Reglas e índices de Firestore

Sin relación con Workers — son del lado del servidor de Firestore y ya están desplegados
contra `ds-hd-b4939` (ver `firestore.rules`/`firestore.indexes.json`). Si cambian en el
futuro:

```bash
npx firebase deploy --only firestore:indexes,firestore:rules --project ds-hd-b4939
```

## 5. Primer despliegue

Local, para verificar antes de dejarlo en manos de CI:

```bash
npm run worker:deploy
```

Esto imprime la URL pública (`https://ds-hd.<tu-subdominio>.workers.dev` por defecto). Prueba
`/healthz` y un login real.

## 6. Dominio propio (opcional)

Cuando el dominio esté decidido y en Cloudflare: dashboard → Workers & Pages → `ds-hd` →
**Settings → Domains & Routes** → **Add Custom Domain** (p. ej. `ds-hd.dattasoft.mx`). El
certificado TLS lo gestiona Cloudflare automáticamente, igual que Caddy lo hacía en el
droplet. No requiere cambios en `wrangler.jsonc`. Actualiza `APP_BASE_URL` (paso 3) al nuevo
dominio después.

## 7. Despliegues siguientes

Automáticos vía [`deploy.yml`](../../.github/workflows/deploy.yml) al hacer push a `main` (o
tag `v*`, o disparo manual). El job hace `npm ci` → `npm run build:worker` → `wrangler deploy`
con los secrets de GitHub del paso 1. No hay registry de imágenes ni SSH — el bundle sale
directo al edge de Cloudflare.

## 8. Migración de datos (una sola vez)

Sin cambios respecto al plan original — el flujo de migración corre con `tsx` local/CI, no
dentro del Worker. Detalle completo en
[`scripts/migrate/README.md`](../../scripts/migrate/README.md).

## 9. Troubleshooting

- **`initFirebase no está disponible en Cloudflare Workers`**: `FIRESTORE_DRIVER` no quedó en
  `rest`. Revisa `wrangler.jsonc` → `vars`.
- **500 en cualquier ruta que toque Firestore**: falta o es inválido
  `FIREBASE_SERVICE_ACCOUNT_B64` — revisa con `npx wrangler secret list` que exista (no
  muestra el valor, solo el nombre).
- **Login falla con credenciales correctas**: revisa `FIREBASE_API_KEY` (es la API key *web*
  del proyecto, no el service account).
- **`Illegal invocation` en logs**: el `fetch` nativo de Workers exige que se llame con `this`
  = global scope. Si se reintroduce un `fetch` suelto (guardado como referencia y llamado como
  método de otro objeto, p. ej. `this.fetchImpl(...)`), falla así en workerd aunque funcione
  en Node. Ver `fetch.bind(globalThis)` en `FirestoreRestClient`/`FirebaseAuthRestProvider`/
  `serviceAccountAuth.ts` para el patrón ya corregido.
