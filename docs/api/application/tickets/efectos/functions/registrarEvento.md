[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/efectos](../README.md) / registrarEvento

# Function: registrarEvento()

> **registrarEvento**(`tickets`, `ids`, `ticketId`, `data`): `Promise`\<`void`\>

Defined in: application/tickets/efectos.ts:7

Añade una entrada al registro de actividad del ticket. Helper compartido por los casos de uso.

## Parameters

### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

### ticketId

`string`

### data

#### tipo

`"correo"` \| `"creacion"` \| `"cambio_estado"` \| `"asignacion"` \| `"nota"` \| `"sla_incumplido"` \| `"facturacion"`

#### resumen

`string`

#### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md) \| `null`

#### at

`Date`

## Returns

`Promise`\<`void`\>
