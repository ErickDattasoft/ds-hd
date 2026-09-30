[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/LimpiezaAdjuntosService](../README.md) / LimpiezaAdjuntosService

# Class: LimpiezaAdjuntosService

Mantenimiento de adjuntos (paridad con «🗄️ Archivar y eliminar adjuntos no permanentes» del
CRM viejo): los adjuntos de tickets **cerrados** hace más de N días que no están marcados
📌 permanentes se descargan en un ZIP y después se eliminan de Firestore para liberar la cuota.
Nunca toca imágenes pegadas en la descripción de un ticket (la descripción las necesita).

## Constructors

### Constructor

> **new LimpiezaAdjuntosService**(`adjuntos`, `ticketQueries`, `tickets`, `ids`, `clock`, `logger`): `LimpiezaAdjuntosService`

#### Parameters

##### adjuntos

[`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

##### ticketQueries

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`LimpiezaAdjuntosService`

## Methods

### buscar()

> **buscar**(`actor`, `dias`): `Promise`\<[`ResultadoLimpieza`](../interfaces/ResultadoLimpieza.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### dias

`number`

#### Returns

`Promise`\<[`ResultadoLimpieza`](../interfaces/ResultadoLimpieza.md)\>

***

### zip()

> **zip**(`actor`, `dias`, `ids`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

ZIP con los adjuntos indicados — solo los que siguen siendo candidatos.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### dias

`number`

##### ids

readonly `string`[]

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

***

### eliminar()

> **eliminar**(`actor`, `dias`, `ids`): `Promise`\<`number`\>

Elimina los adjuntos indicados que sigan siendo candidatos y lo anota en cada ticket.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### dias

`number`

##### ids

readonly `string`[]

#### Returns

`Promise`\<`number`\>
