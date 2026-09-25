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

Desde el detalle de un evento ves la lista de inscritos. Los datos los captura el propio
interesado en el formulario público, así que la tabla es **editable**: corrige nombre,
empresa, correo y teléfono en la misma fila y dale **Guardar**. Si cambias el correo, el
semáforo de entrega se reinicia (el del correo anterior ya no dice nada del nuevo) y no se
permite dejar dos inscritos del mismo evento con el mismo correo.

Cada fila trae además:

| Columna | Qué significa |
| --- | --- |
| 📧 | Semáforo de entrega del correo: 🟢 entregado · 🟡 aún sin confirmar (Brevo tarda unos minutos) · 🔴 rebotó, probablemente un correo falso |
| 🚩 | Dominio de correo temporal/desechable conocido — probablemente no es un prospecto real |
| 🚫 | Marcado como problemático. Pasa el mouse encima para ver el motivo y quién lo marcó; si está apagado, haz clic para marcar a esa persona |
| 🔁 Antes | Ya asistió **de verdad** a otro evento. Útil para no reinvitar a quien ya fue si un webinar se repite |
| ✅ Asistió | Asistencia real confirmada, distinta de lo que declaró al registrarse. Es la que alimenta el 🔁 de los eventos siguientes |
| 💬 (Contactado) | Ya se le mandó el mensaje por WhatsApp. Se marca solo al usar el botón 💬 |

Y estas acciones:

- **💬 WhatsApp** — abre WhatsApp con la plantilla del evento ya resuelta para esa persona, y
  la marca como contactada.
- **💬 WhatsApp a pendientes** — hace lo mismo en tanda, para todos los que tengan teléfono y
  no estén marcados como contactados. Se abre una pestaña por persona, espaciadas para que el
  navegador no las bloquee: **todavía hay que darle Enviar en cada una**.
- **✉️** — reenvía el correo de confirmación a un inscrito puntual.
- **🚫** — manda a la lista negra. Pide un motivo (opcional) y guarda también su teléfono y
  quién lo marcó, para que quede señalado si se vuelve a registrar en cualquier evento futuro.
- **🗑️** — elimina ese registro. No se puede deshacer.
- **📥 Exportar Excel** — baja la lista completa con todas las columnas de arriba.
- **Estado** — marca la inscripción (registrado / confirmado / asistió / no asistió).

La **lista negra** es global a todos los eventos: quien esté ahí, por correo o por teléfono,
no puede volver a registrarse en ninguno. Se puede agregar a mano o quitar si fue un error.

## Compartir el link de registro

En el detalle del evento, **🔗 Link Registro** copia al portapapeles la URL pública para
pegarla en redes, WhatsApp o un correo. *Ver página pública* abre esa misma página en otra
pestaña para revisarla antes de compartirla.

El registro público pide nombre y **al menos un dato de contacto: correo o teléfono**. Quien
se registre solo con teléfono no recibe confirmación ni recordatorio por correo — aparece en
Inscritos con el 💬 para contactarlo por WhatsApp. El duplicado se detecta por correo **o**
por teléfono. El formulario exige la verificación anti-bots de Cloudflare: sin ella no se
guarda ningún registro.

## Recordatorios automáticos

Un job programado (`/jobs/recordatorios-eventos`, protegido por `JOBS_SECRET`) envía
recordatorios a los inscritos antes del evento; no requiere acción manual del staff salvo
reenviar un correo puntual que se haya perdido.
