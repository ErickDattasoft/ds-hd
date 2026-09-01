# Pendientes

## Envío de correos — RESUELTO en código, falta la API key de producción

El dominio de dattasoft ya se corrigió. La integración de correo quedó lista:

- **Dev**: `SmtpEmailSender` (nodemailer) → MailHog (`SMTP_HOST=mailhog` en docker-compose).
  Los correos se ven en http://localhost:8025.
- **Producción**: define **`BREVO_API_KEY`** en el `.env` (y verifica el remitente
  `BREVO_SENDER_EMAIL` en Brevo). Alternativa: `SMTP_HOST` propio.
- Prioridad de selección: `SMTP_HOST` > `BREVO_API_KEY` > log (no envía).
- Webhook `/webhooks/brevo?key=<JOBS_SECRET>` ya actualiza `correoEstado` de las
  inscripciones a eventos (tag `insc_<id>`). Configúralo en el panel de Brevo apuntando a
  `https://<dominio>/webhooks/brevo?key=<JOBS_SECRET>`.

**Único paso manual restante:** poner la `BREVO_API_KEY` real en producción y dar de alta
el webhook en Brevo.

## Otros pendientes menores

- Retrofit de `BitacoraService` a los casos de uso de tickets (hoy usan su subcolección `eventos`).
- Migración: reasignar `usuarios/{uid}` al uid real de Firebase Auth tras `auth:import`.
- `IInscripcionRepository.findGlobal` hace un scan de collection-group; si el volumen de
  inscripciones crece mucho, indexar por un campo `inscripcionId` plano.
