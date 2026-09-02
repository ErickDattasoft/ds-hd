# Despliegue en un droplet de DigitalOcean

## 0. Publicar el repositorio

El proyecto vive solo en local todavía (`git remote -v` vacío). `deploy.yml` construye la
imagen y la sube a GHCR en cada push a `main`, así que hace falta un remoto antes de poder
desplegar nada:

```bash
gh repo create OWNER/ds-hd --private --source=. --push
# o: git remote add origin git@github.com:OWNER/ds-hd.git && git push -u origin main
```

Con el repo en GitHub, agrega estos secrets (Settings → Secrets and variables → Actions),
necesarios para `deploy.yml`: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`
(la ruta del proyecto en el droplet, p. ej. `/opt/ds-hd`). El login a GHCR dentro del workflow
usa el `GITHUB_TOKEN` automático — no requiere un secret aparte.

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

## 3. Autenticación al registry (solo la primera vez, manual)

El paquete en GHCR es privado por defecto, así que el `docker pull` manual desde el droplet
necesita su propio login (distinto del `GITHUB_TOKEN` automático que usa `deploy.yml` dentro
de Actions). Genera un PAT clásico con scope `read:packages` en GitHub → Settings →
Developer settings → Personal access tokens:

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

Automáticos vía `.github/workflows/deploy.yml` al hacer push a `main`, usando los secrets
del paso 0.

## 6. Migración de datos (una sola vez)

Detalle completo del flujo (export → dry-run → migración real → verificación → Auth →
Storage) en [`scripts/migrate/README.md`](../../scripts/migrate/README.md).

```bash
docker compose -f docker/docker-compose.prod.yml run --rm app node dist/scripts/migrate/run-all.js --dry-run
```
