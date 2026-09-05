[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/dto](../README.md) / ProgramarAtencionInput

# Interface: ProgramarAtencionInput

Datos para programar (o cancelar) la atención de un ticket.

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

***

### ticketId

> **ticketId**: `string`

***

### fecha

> **fecha**: `string`

Vacío = cancelar la programación.

***

### hora

> **hora**: `string`

***

### recordatorioWhatsapp

> **recordatorioWhatsapp**: `boolean`
