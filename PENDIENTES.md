# Pendientes

## Envío de correos — EN PAUSA

El envío real de correo (Brevo) está **sin conectar a propósito**. El CRM DATTASOFT en uso
está fallando en el envío; hay cambios en el dominio de dattasoft y van a hacer correcciones.

**Se retoma cuando avisen que el dominio de dattasoft quedó arreglado.** Entonces:

1. Verificar remitente/dominio en Brevo y poner `BREVO_API_KEY` real en el `.env` de producción.
2. (Dev) opcionalmente añadir un `MailhogEmailSender` SMTP para ver los correos en MailHog.
3. Probar de punta a punta: invitaciones (staff y cliente), ticket resuelto/cerrado, nota
   pública, ticket público (confirmación + aviso staff), solicitud de acceso, y confirmación
   + recordatorio de eventos.
4. Conectar el webhook `/webhooks/brevo` para actualizar `correoEstado` de las inscripciones.

Hoy en dev/tests se usa `LoggingEmailSender` (registra el correo en el log) — nada se envía.

## Otros pendientes menores

- Retrofit de `BitacoraService` a los casos de uso de tickets (hoy usan su subcolección `eventos`).
- Migración: reasignar `usuarios/{uid}` al uid real de Firebase Auth tras `auth:import` (hoy usa el correo como placeholder).
- Kanban con arrastrar-y-soltar (htmx) — llega en la fase de rediseño visual.
