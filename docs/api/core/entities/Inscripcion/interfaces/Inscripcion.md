[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Inscripcion](../README.md) / Inscripcion

# Interface: Inscripcion

Inscripción de una persona a un evento (`eventos/{id}/inscripciones/{insId}`).

## Properties

### id

> **id**: `string`

***

### eventoId

> **eventoId**: `string`

***

### nombre

> **nombre**: `string`

***

### email

> **email**: `string` \| `null`

Opcional: el registro público pide correo **o** teléfono, al menos uno. Sin correo no hay
confirmación ni recordatorios por mail — a esa persona se le contacta por WhatsApp.

***

### telefono

> **telefono**: `string` \| `null`

***

### empresa

> **empresa**: `string` \| `null`

***

### estado

> **estado**: [`EstadoInscripcion`](../type-aliases/EstadoInscripcion.md)

***

### origen

> **origen**: `"publico"` \| `"staff"`

***

### correoEstado

> **correoEstado**: `"pendiente"` \| `"entregado"` \| `"rebotado"` \| `null`

Estado del último correo enviado, actualizado por el webhook de Brevo.

***

### recordatoriosEnviados

> **recordatoriosEnviados**: `string`[]

***

### ip

> **ip**: `string` \| `null`

IP desde la que se registró (forense + límite por IP); `null` para altas de staff.

***

### correoSospechoso

> **correoSospechoso**: `boolean`

`true` si el dominio del correo es de un servicio desechable conocido — solo se marca 🚩.

***

### asistira

> **asistira**: `string` \| `null`

Respuesta libre del formulario público — "Sí"/"No"/"Tal vez". `null` para altas de staff.

***

### usaSistema

> **usaSistema**: `string` \| `null`

Respuesta a "¿usas [sistema]?" — solo si el evento tiene `sistema`; si no, `null`.

***

### fuente

> **fuente**: `string` \| `null`

Cómo se enteró del evento (Facebook/Instagram/LinkedIn/...), texto libre.

***

### deseaCanalWhatsapp

> **deseaCanalWhatsapp**: `boolean`

Marcó que quiere unirse al canal de WhatsApp de avisos/novedades.

***

### contactadoWsp

> **contactadoWsp**: `boolean`

Ya se le mandó el mensaje de WhatsApp — se marca solo al usar el botón 💬, o a mano.

***

### asistioReal

> **asistioReal**: `boolean`

Asistencia real confirmada, distinta de `asistira` (la intención que declaró al
registrarse) y de `estado`. Es la que alimenta el 🔁 "ya asistió antes" entre eventos.

***

### createdAt

> **createdAt**: `Date`
