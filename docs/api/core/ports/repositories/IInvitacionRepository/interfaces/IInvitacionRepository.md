[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IInvitacionRepository](../README.md) / IInvitacionRepository

# Interface: IInvitacionRepository

Defined in: core/ports/repositories/IInvitacionRepository.ts:18

Invitaciones de un solo uso para que un cliente (o staff nuevo) fije su contraseña.
Colección `invitaciones/{token}`.

## Methods

### create()

> **create**(`data`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IInvitacionRepository.ts:19

#### Parameters

##### data

`Omit`\<[`Invitacion`](Invitacion.md), `"usadaEn"`\>

#### Returns

`Promise`\<`void`\>

***

### findByToken()

> **findByToken**(`token`): `Promise`\<[`Invitacion`](Invitacion.md) \| `null`\>

Defined in: core/ports/repositories/IInvitacionRepository.ts:20

#### Parameters

##### token

`string`

#### Returns

`Promise`\<[`Invitacion`](Invitacion.md) \| `null`\>

***

### marcarUsada()

> **marcarUsada**(`token`, `cuando`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IInvitacionRepository.ts:21

#### Parameters

##### token

`string`

##### cuando

`Date`

#### Returns

`Promise`\<`void`\>
