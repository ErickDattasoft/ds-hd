[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/ConfiguracionTicketsService](../README.md) / ConfiguracionTicketsService

# Class: ConfiguracionTicketsService

Defined in: application/configuracion/ConfiguracionTicketsService.ts:15

Casos de uso: leer y actualizar los catálogos del módulo de tickets.

## Constructors

### Constructor

> **new ConfiguracionTicketsService**(`repo`, `logger`): `ConfiguracionTicketsService`

Defined in: application/configuracion/ConfiguracionTicketsService.ts:16

#### Parameters

##### repo

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ConfiguracionTicketsService`

## Methods

### obtener()

> **obtener**(): `Promise`\<[`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)\>

Defined in: application/configuracion/ConfiguracionTicketsService.ts:21

#### Returns

`Promise`\<[`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)\>

***

### actualizar()

> **actualizar**(`input`): `Promise`\<`void`\>

Defined in: application/configuracion/ConfiguracionTicketsService.ts:25

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### tipos

`string`

###### sistemas

`string`

###### grupos

`string`

###### estados

`string`

###### prioridades

`string`

###### tiposFacturables

`string`

###### estadoInicial

`string`

###### correosNotificacion

`string`

###### slaHoras

`Record`\<`string`, `string` \| `number`\>

#### Returns

`Promise`\<`void`\>
