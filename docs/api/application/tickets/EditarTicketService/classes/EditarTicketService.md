[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/EditarTicketService](../README.md) / EditarTicketService

# Class: EditarTicketService

Caso de uso: editar un ticket ya creado (asunto, descripción, tipo, empresa, contacto…), como
el botón "Editar" del CRM viejo. Estado, agente, facturación y agenda van por sus propios
servicios, que el controlador invoca solo si cambiaron.

## Constructors

### Constructor

> **new EditarTicketService**(`tickets`, `config`, `adjuntos`, `ids`, `clock`): `EditarTicketService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### adjuntos

[`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`EditarTicketService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

#### Parameters

##### input

[`EditarTicketInput`](../interfaces/EditarTicketInput.md)

#### Returns

`Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>
