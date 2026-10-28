[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/RespuestaSinLeer](../README.md) / RespuestaSinLeer

# Interface: RespuestaSinLeer

Respuesta de un cliente que nadie del equipo ha visto todavía (`respuestas_sin_leer/{ticketId}`).
Es el «🔔 buzón» del CRM: una por ticket (la última respuesta pisa a la anterior) y se borra en
cuanto alguien del equipo abre el ticket.

Guarda una copia de los campos de asignación del ticket para filtrar por alcance de agente sin
tener que leer cada ticket en cada página.

## Properties

### ticketId

> **ticketId**: `string`

***

### numero

> **numero**: `number`

***

### asunto

> **asunto**: `string`

***

### empresaNombre

> **empresaNombre**: `string` \| `null`

***

### autorNombre

> **autorNombre**: `string`

Quién respondió (nombre o correo).

***

### extracto

> **extracto**: `string`

Inicio del mensaje, para el listado.

***

### at

> **at**: `Date`

***

### agenteAsignadoUid

> **agenteAsignadoUid**: `string` \| `null`

***

### agenteAsignadoNombre

> **agenteAsignadoNombre**: `string` \| `null`

***

### canalizadoA

> **canalizadoA**: `string` \| `null`
