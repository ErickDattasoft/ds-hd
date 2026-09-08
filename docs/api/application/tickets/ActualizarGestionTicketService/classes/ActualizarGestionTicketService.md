[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/ActualizarGestionTicketService](../README.md) / ActualizarGestionTicketService

# Class: ActualizarGestionTicketService

Caso de uso: actualizar "solicitado por / canalizado a / notas internas" de un ticket.

## Constructors

### Constructor

> **new ActualizarGestionTicketService**(`tickets`, `ids`, `clock`, `logger`): `ActualizarGestionTicketService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ActualizarGestionTicketService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

[`ActualizarGestionInput`](../interfaces/ActualizarGestionInput.md)

#### Returns

`Promise`\<`void`\>
