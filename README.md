# ds-hd

Reconstrucción del **CRM DATTASOFT** con arquitectura **MVC + SOLID**, sobre
**Node.js + Express + TypeScript**, vistas server-side con **Nunjucks + htmx + Alpine**,
y **Firestore** accedido 100 % desde el servidor con `firebase-admin`.

> El sistema de referencia (`PROYECTO CRM DATTASOFT/crm-dattasoft`) NO se modifica; ds-hd es
> una reconstrucción funcional desde cero. El plan por fases vive en
> `/home/erick/.claude/plans/` y los requisitos en [`REQUERIMIENTOS.MD`](./REQUERIMIENTOS.MD)
> (revisar al inicio de cada iteración).

## Arranque rápido (desarrollo)

```bash
cp .env.example .env      # ajusta credenciales
npm install
npm run build:assets      # compila CSS/JS y copia htmx + Alpine a public/vendor
npm run dev               # http://localhost:3000  (health: /healthz)
```

Con Docker (incluye emulador de Firestore y MailHog):

```bash
docker compose -f docker/docker-compose.yml up
```

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor con recarga (`tsx watch`). |
| `npm run build` | `tsc` + bundle de assets → `dist/`. |
| `npm start` | Ejecuta el build (`dist/src/main.js`). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` / `lint:fix` | ESLint (incluye reglas de dependencia entre capas). |
| `npm test` | Vitest (unit + integración + contrato + e2e). |
| `npm run docs` | Regenera los bloques autogenerados de este README. |

## Arquitectura

Capas (de dentro hacia fuera), con la regla de dependencia apuntando siempre hacia el dominio:

```
core/           dominio puro: entities, value-objects, errors, ports (interfaces)
application/    casos de uso (1 clase = 1 caso de uso)  → depende solo de core/ports
infrastructure/ adaptadores que implementan core/ports  (Firestore, Brevo, n8n, Firebase Auth…)
interfaces/     capa de entrega HTTP: controllers, routes, middlewares, rbac, presenters, views
config/         composition root (awilix) + carga de entorno + init de Firebase
```

Detalle en [`docs/architecture/`](./docs/architecture/): `overview.md`, `layering.md`,
`solid.md`, `data-model.md`, `rbac.md`, `deploy.md`.

### Variables de entorno

<!-- GENERATED:env START -->

| Variable | Opcional | Descripción |
| --- | --- | --- |
| `NODE_ENV` | sí | Modo de ejecución de Node. |
| `PORT` | sí | Puerto HTTP del servidor. |
| `APP_BASE_URL` | sí | URL pública base de la app (para enlaces en correos e invitaciones). |
| `LOG_LEVEL` | sí | Nivel mínimo de log (pino). |
| `SESSION_COOKIE_SECRET` | sí | Secreto para firmar la cookie de sesión y el token CSRF. |
| `FIREBASE_PROJECT_ID` | no | ID del proyecto Firebase (nuevo, aislado). |
| `FIREBASE_API_KEY` | sí | API key web de Firebase; solo para el sign-in por REST (Identity Toolkit). |
| `FIREBASE_SERVICE_ACCOUNT_B64` | sí | Service account JSON del proyecto, codificado en base64 (o usar GOOGLE_APPLICATION_CREDENTIALS). |
| `FIREBASE_STORAGE_BUCKET` | sí | Bucket de Firebase Storage para adjuntos. |
| `FIRESTORE_EMULATOR_HOST` | sí | Host:puerto del emulador de Firestore (solo dev/test). |
| `BREVO_API_KEY` | sí | API key de Brevo para correo transaccional. |
| `BREVO_SENDER_NAME` | sí | Nombre del remitente de correo. |
| `BREVO_SENDER_EMAIL` | sí | Correo del remitente (verificado en Brevo). |
| `N8N_WEBHOOK_TICKETS` | sí | URL del webhook n8n para eventos de tickets. |
| `N8N_WEBHOOK_COTIZACIONES` | sí | URL del webhook n8n para eventos de cotizaciones. |
| `TURNSTILE_SITE_KEY` | sí | Site key de Cloudflare Turnstile (formularios públicos). |
| `TURNSTILE_SECRET` | sí | Secret de Cloudflare Turnstile (verificación server-side). |
| `JOBS_SECRET` | sí | Bearer que protege los endpoints /jobs/* invocados por el cron. |
| `DISABLE_FIREBASE` | sí | Si es true, no inicializa firebase-admin (útil para smoke tests sin credenciales). |

<!-- GENERATED:env END -->

## Despliegue

Docker multi-stage + Caddy (HTTPS automático) en un droplet de DigitalOcean.
CI/CD con GitHub Actions (`ci.yml`, `deploy.yml`). Ver [`docs/deploy/DROPLET.md`](./docs/deploy/DROPLET.md).

## Contribuir

Ver [`CONTRIBUTING.md`](./CONTRIBUTING.md) — flujo de ramas, cómo añadir un módulo (vertical
slice), y la obligación de revisar `REQUERIMIENTOS.MD` antes de cada fase.
