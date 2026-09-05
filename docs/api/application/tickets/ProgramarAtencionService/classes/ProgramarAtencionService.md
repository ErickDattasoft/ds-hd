[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/ProgramarAtencionService](../README.md) / ProgramarAtencionService

# Class: ProgramarAtencionService

Caso de uso: programar, reprogramar o cancelar la atención de un ticket ("📅 Agenda").

## Constructors

### Constructor

> **new ProgramarAtencionService**(`tickets`, `ids`, `clock`, `webhooks`): `ProgramarAtencionService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### webhooks

[`IWebhookPublisher`](../../../../core/ports/services/IWebhookPublisher/interfaces/IWebhookPublisher.md)

#### Returns

`ProgramarAtencionService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

[`ProgramarAtencionInput`](../../dto/interfaces/ProgramarAtencionInput.md)

#### Returns

`Promise`\<`void`\>
