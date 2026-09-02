[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/ISessionManager](../README.md) / ISessionManager

# Interface: ISessionManager

Defined in: core/ports/services/ISessionManager.ts:15

Emite y verifica la credencial de sesión que va en la cookie `__session`.

Implementación de Fase 1: token propio firmado con `SESSION_COOKIE_SECRET`
(portátil, funciona con el emulador). El puerto permite cambiar luego a las
*session cookies* de Firebase Admin sin tocar la capa de aplicación ni los middlewares.

## Methods

### issue()

> **issue**(`claims`): `Promise`\<`string`\>

Defined in: core/ports/services/ISessionManager.ts:16

#### Parameters

##### claims

`Omit`\<[`SessionClaims`](SessionClaims.md), `"issuedAt"`\>

#### Returns

`Promise`\<`string`\>

***

### verify()

> **verify**(`token`): `Promise`\<[`SessionClaims`](SessionClaims.md) \| `null`\>

Defined in: core/ports/services/ISessionManager.ts:17

#### Parameters

##### token

`string`

#### Returns

`Promise`\<[`SessionClaims`](SessionClaims.md) \| `null`\>
