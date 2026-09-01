# Pendientes

## Envío de correos — RESUELTO

Dominio `dattasoft.mx` verificado en Brevo y **API key `ds-hd-produccion` generada**
(2026-09-01). Falta únicamente **pegar la key en el `.env` del servidor cuando se
despliegue** (`BREVO_API_KEY=xkeysib-...`, con `SMTP_HOST` vacío) y, opcionalmente, dar de
alta el webhook `/webhooks/brevo?key=<JOBS_SECRET>` en el panel de Brevo.

La integración de correo en código está lista:

- **Dev**: `SmtpEmailSender` (nodemailer) → MailHog (`SMTP_HOST=mailhog` en docker-compose).
  Los correos se ven en http://localhost:8025.
- **Producción**: define **`BREVO_API_KEY`** en el `.env` (y verifica el remitente
  `BREVO_SENDER_EMAIL` en Brevo). Alternativa: `SMTP_HOST` propio.
- Prioridad de selección: `SMTP_HOST` > `BREVO_API_KEY` > log (no envía).
- Webhook `/webhooks/brevo?key=<JOBS_SECRET>` ya actualiza `correoEstado` de las
  inscripciones a eventos (tag `insc_<id>`). Configúralo en el panel de Brevo apuntando a
  `https://<dominio>/webhooks/brevo?key=<JOBS_SECRET>`.

**Único paso manual restante:** poner la `BREVO_API_KEY` real en producción y dar de alta
el webhook en Brevo. Brevo YA lo usa el CRM actual, así que se reutiliza la cuenta (solo
generar una API key nueva para ds-hd). **Guía paso a paso: `docs/deploy/CORREO-BREVO.md`.**

## Otros pendientes menores

- Retrofit de `BitacoraService` a los casos de uso de tickets (hoy usan su subcolección `eventos`).
- Migración: reasignar `usuarios/{uid}` al uid real de Firebase Auth tras `auth:import`.
- `IInscripcionRepository.findGlobal` hace un scan de collection-group; si el volumen de
  inscripciones crece mucho, indexar por un campo `inscripcionId` plano.
