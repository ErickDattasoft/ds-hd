[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ISolicitudAccesoRepository](../README.md) / ISolicitudAccesoRepository

# Interface: ISolicitudAccesoRepository

Solicitudes de acceso al back-office ("Solicitar acceso" desde el login).

## Methods

### create()

> **create**(`data`): `Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md)\>

#### Parameters

##### data

`Omit`\<[`SolicitudAcceso`](SolicitudAcceso.md), `"id"` \| `"estado"` \| `"createdAt"`\>

#### Returns

`Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md)\>

***

### findByEmail()

> **findByEmail**(`email`): `Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md) \| `null`\>

#### Parameters

##### email

`string`

#### Returns

`Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md) \| `null`\>

***

### listPendientes()

> **listPendientes**(): `Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md)[]\>

#### Returns

`Promise`\<[`SolicitudAcceso`](SolicitudAcceso.md)[]\>

***

### updateEstado()

> **updateEstado**(`id`, `estado`): `Promise`\<`void`\>

#### Parameters

##### id

`string`

##### estado

`"pendiente"` \| `"aprobada"` \| `"rechazada"`

#### Returns

`Promise`\<`void`\>
