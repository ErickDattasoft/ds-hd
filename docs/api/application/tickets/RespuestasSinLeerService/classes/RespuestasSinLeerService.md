[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/RespuestasSinLeerService](../README.md) / RespuestasSinLeerService

# Class: RespuestasSinLeerService

Buzón «🔔 Respuestas» del back-office: avisa dentro del CRM (no solo por correo) que un cliente
contestó en un ticket. Se marca al llegar la respuesta y se limpia al abrir el ticket.

Nunca rompe el flujo que lo llama: si Firestore falla, la respuesta ya quedó guardada como nota
y el aviso por correo sigue saliendo.

## Constructors

### Constructor

> **new RespuestasSinLeerService**(`repo`, `logger`): `RespuestasSinLeerService`

#### Parameters

##### repo

[`IRespuestaSinLeerRepository`](../../../../core/ports/repositories/IRespuestaSinLeerRepository/interfaces/IRespuestaSinLeerRepository.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`RespuestasSinLeerService`

## Methods

### registrar()

> **registrar**(`ticket`, `autorNombre`, `cuerpo`, `at`): `Promise`\<`void`\>

#### Parameters

##### ticket

[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)

##### autorNombre

`string`

##### cuerpo

`string`

##### at

`Date`

#### Returns

`Promise`\<`void`\>

***

### marcarLeida()

> **marcarLeida**(`ticketId`): `Promise`\<`void`\>

#### Parameters

##### ticketId

`string`

#### Returns

`Promise`\<`void`\>

***

### listarPara()

> **listarPara**(`actor`): `Promise`\<[`RespuestaSinLeer`](../../../../core/entities/RespuestaSinLeer/interfaces/RespuestaSinLeer.md)[]\>

Las que el actor puede abrir (mismo alcance que la lista de tickets), la más reciente primero.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<[`RespuestaSinLeer`](../../../../core/entities/RespuestaSinLeer/interfaces/RespuestaSinLeer.md)[]\>

***

### marcarTodasLeidas()

> **marcarTodasLeidas**(`actor`): `Promise`\<`number`\>

Marca como leídas todas las que el actor ve.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<`number`\>
