[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/AjustarTiempoService](../README.md) / AjustarTiempoService

# Class: AjustarTiempoService

Caso de uso: ajustar manualmente el tiempo trabajado de un ticket (o quitar el ajuste).

## Constructors

### Constructor

> **new AjustarTiempoService**(`tickets`, `ids`, `clock`): `AjustarTiempoService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`AjustarTiempoService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### ticketId

`string`

###### quitar

`boolean`

`true` = quitar el ajuste manual y volver al cálculo automático.

###### horas

`number`

###### minutos

`number`

#### Returns

`Promise`\<`void`\>
