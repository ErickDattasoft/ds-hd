[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/cerradoFacturado](../README.md) / avisarSiQuedoCerradoYFacturado

# Function: avisarSiQuedoCerradoYFacturado()

> **avisarSiQuedoCerradoYFacturado**(`input`): `Promise`\<`void`\>

Correo interno + webhook `ticket.cerrado_facturado`: se dispara la primera vez que la
combinación (estado=Cerrado) Y (facturación completada) se cumple, sin importar cuál de
los dos cambió primero — paridad con el CRM viejo. Se llama tanto desde
`ActualizarEstadoTicketService` (cuando cambia el estado) como desde
`MarcarFacturacionService` (cuando cambia la facturación); cada uno calcula
`cumpliaAntes`/`cumpleAhora` con su propio "antes"/"después" del campo que está cambiando.

## Parameters

### input

#### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

#### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

#### webhooks

[`IWebhookPublisher`](../../../../core/ports/services/IWebhookPublisher/interfaces/IWebhookPublisher.md)

#### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

#### correosNotificacion

`string`[]

#### ticket

[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)

#### cumpliaAntes

`boolean`

#### cumpleAhora

`boolean`

#### ahora

`Date`

## Returns

`Promise`\<`void`\>
