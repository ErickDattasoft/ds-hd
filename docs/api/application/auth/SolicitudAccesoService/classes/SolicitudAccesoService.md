[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/auth/SolicitudAccesoService](../README.md) / SolicitudAccesoService

# Class: SolicitudAccesoService

Gestión (staff) de las solicitudes de acceso pendientes — aprobar/rechazar.

## Constructors

### Constructor

> **new SolicitudAccesoService**(`repo`, `bitacora`): `SolicitudAccesoService`

#### Parameters

##### repo

[`ISolicitudAccesoRepository`](../../../../core/ports/repositories/ISolicitudAccesoRepository/interfaces/ISolicitudAccesoRepository.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

#### Returns

`SolicitudAccesoService`

## Methods

### listarPendientes()

> **listarPendientes**(`actor`): `Promise`\<[`SolicitudAcceso`](../../../../core/ports/repositories/ISolicitudAccesoRepository/interfaces/SolicitudAcceso.md)[]\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<[`SolicitudAcceso`](../../../../core/ports/repositories/ISolicitudAccesoRepository/interfaces/SolicitudAcceso.md)[]\>

***

### aprobar()

> **aprobar**(`actor`, `id`): `Promise`\<[`SolicitudAcceso`](../../../../core/ports/repositories/ISolicitudAccesoRepository/interfaces/SolicitudAcceso.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

#### Returns

`Promise`\<[`SolicitudAcceso`](../../../../core/ports/repositories/ISolicitudAccesoRepository/interfaces/SolicitudAcceso.md)\>

***

### rechazar()

> **rechazar**(`actor`, `id`): `Promise`\<[`SolicitudAcceso`](../../../../core/ports/repositories/ISolicitudAccesoRepository/interfaces/SolicitudAcceso.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

#### Returns

`Promise`\<[`SolicitudAcceso`](../../../../core/ports/repositories/ISolicitudAccesoRepository/interfaces/SolicitudAcceso.md)\>
