[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ISolicitudAccesoRepository](../README.md) / ISolicitudAccesoRepository

# Interface: ISolicitudAccesoRepository

Defined in: core/ports/repositories/ISolicitudAccesoRepository.ts:12

Solicitudes de acceso al back-office ("Solicitar acceso" desde el login).

## Methods

### create()

> **create**(`data`): `Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md)\>

Defined in: core/ports/repositories/ISolicitudAccesoRepository.ts:13

#### Parameters

##### data

`Omit`\<[`SolicitudAcceso`](SolicitudAcceso.md), `"id"` \| `"estado"` \| `"createdAt"`\>

#### Returns

`Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md)\>

***

### findByEmail()

> **findByEmail**(`email`): `Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md) \| `null`\>

Defined in: core/ports/repositories/ISolicitudAccesoRepository.ts:14

#### Parameters

##### email

`string`

#### Returns

`Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md) \| `null`\>

***

### listPendientes()

> **listPendientes**(): `Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md)[]\>

Defined in: core/ports/repositories/ISolicitudAccesoRepository.ts:15

#### Returns

`Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md)[]\>

***

### updateEstado()

> **updateEstado**(`id`, `estado`): `Promise`\<`void`\>

Defined in: core/ports/repositories/ISolicitudAccesoRepository.ts:16

#### Parameters

##### id

`string`

##### estado

`"pendiente"` \| `"aprobada"` \| `"rechazada"`

#### Returns

`Promise`\<`void`\>
