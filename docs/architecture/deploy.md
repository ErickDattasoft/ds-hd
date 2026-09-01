# Despliegue

- **Imagen**: `docker/Dockerfile` multi-stage (`deps` → `build` → `runtime` con `USER node`).
- **Local**: `docker compose -f docker/docker-compose.yml up` (app + emulador Firestore + MailHog).
- **Producción**: `docker/docker-compose.prod.yml` — `app` (imagen del registry) + `caddy`
  (reverse proxy con HTTPS automático). Droplet stateless; la base es Firestore.
- **CI/CD**: `.github/workflows/ci.yml` (PR) y `deploy.yml` (push a `main` / tag `v*`):
  build → push a GHCR → SSH al droplet → `docker compose pull && up -d`.
- **Secretos**: `.env` en el droplet + `secrets/firebase-sa.json` (o `FIREBASE_SERVICE_ACCOUNT_B64`).

Guía paso a paso: [`../deploy/DROPLET.md`](../deploy/DROPLET.md).
