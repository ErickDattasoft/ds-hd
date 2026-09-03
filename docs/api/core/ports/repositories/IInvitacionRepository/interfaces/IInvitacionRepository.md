[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IInvitacionRepository](../README.md) / IInvitacionRepository

# Interface: IInvitacionRepository

Invitaciones de un solo uso para que un cliente (o staff nuevo) fije su contraseña.
Colección `invitaciones/{token}`.

## Methods

### create()

> **create**(`data`): `Promise`\<`void`\>

#### Parameters

##### data

`Omit`\<[`Invitacion`](Invitacion.md), `"usadaEn"`\>

#### Returns

`Promise`\<`void`\>

***

### findByToken()

> **findByToken**(`token`): `Promise`\<[`Invitacion`](Invitacion.md) \| `null`\>

#### Parameters

##### token

`string`

#### Returns

`Promise`\<[`Invitacion`](Invitacion.md) \| `null`\>

***

### marcarUsada()

> **marcarUsada**(`token`, `cuando`): `Promise`\<`void`\>

#### Parameters

##### token

`string`

##### cuando

`Date`

#### Returns

`Promise`\<`void`\>
