---
titulo: Eventos y webinars (gestión)
audiencia: [staff]
rol_minimo: lectura (gestionar: supervisor)
orden: 110
---

`/app/eventos` administra los webinars/eventos que se publican en `/eventos` para registro
público (ver [Eventos — registro público](eventos-publico.md) para el lado del visitante).

![Eventos](../screenshots/eventos-staff-lista.png)

## Crear y publicar un evento

*Eventos → Nuevo*: título, descripción, fecha/hora, cupo y el link del webinar. Mientras el
evento existe, cualquiera puede registrarse en `/eventos/<id>` (protegido con Turnstile
anti-bot) hasta llenar el cupo.

## Gestionar inscritos

Desde el detalle de un evento ves la lista de inscritos, con su estado de correo (si el
recordatorio llegó, vía el webhook de Brevo). Ahí puedes:

- **Marcar** una inscripción (p. ej. como asistió / no asistió).
- **Reenviar** el correo de confirmación o recordatorio a un inscrito puntual.
- **Lista negra**: agregar un correo para que no pueda volver a registrarse a ningún evento
  (útil contra abuso del formulario público), o quitarlo si fue un error.

## Recordatorios automáticos

Un job programado (`/jobs/recordatorios-eventos`, protegido por `JOBS_SECRET`) envía
recordatorios a los inscritos antes del evento; no requiere acción manual del staff salvo
reenviar un correo puntual que se haya perdido.
