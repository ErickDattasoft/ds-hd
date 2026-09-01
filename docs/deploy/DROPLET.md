# Despliegue en un droplet de DigitalOcean

## 1. Crear el droplet

- Ubuntu 24.04 LTS, 2 vCPU / 2–4 GB RAM.
- Añadir tu llave SSH.
- Apuntar el DNS `ds-hd.dattasoft.mx` (A/AAAA) a la IP del droplet.

## 2. Preparar el servidor

```bash
ssh root@IP
apt update && apt -y upgrade
curl -fsSL https://get.docker.com | sh
mkdir -p /opt/ds-hd/secrets && cd /opt/ds-hd
```

Coloca en `/opt/ds-hd`:

- `.env` (a partir de `.env.example`, con credenciales reales).
- `secrets/firebase-sa.json` (service account del proyecto Firebase nuevo) — o define
  `FIREBASE_SERVICE_ACCOUNT_B64` en `.env`.
- El contenido de `docker/` del repo (o clona el repo completo).

Ajusta el dominio y el correo en `docker/Caddyfile`.

## 3. Autenticación al registry

```bash
echo $GHCR_TOKEN | docker login ghcr.io -u TU_USUARIO --password-stdin
```

## 4. Primer arranque

```bash
export IMAGE=ghcr.io/OWNER/ds-hd:latest
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d
docker compose -f docker/docker-compose.prod.yml logs -f app
```

Caddy obtiene el certificado TLS automáticamente. Verifica `https://ds-hd.dattasoft.mx/healthz`.

## 5. Despliegues siguientes

Automáticos vía `.github/workflows/deploy.yml` al hacer push a `main`. Requiere estos
secrets en el repo: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`.

## 6. Migración de datos (una sola vez, Fase 4)

```bash
docker compose -f docker/docker-compose.prod.yml run --rm app node dist/scripts/migrate/run-all.js --dry-run
```
