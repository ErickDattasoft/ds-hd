[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/ISessionManager](../README.md) / ISessionManager

# Interface: ISessionManager

Emite y verifica la credencial de sesión que va en la cookie `__session`.

Implementación de Fase 1: token propio firmado con `SESSION_COOKIE_SECRET`
(portátil, funciona con el emulador). El puerto permite cambiar luego a las
*session cookies* de Firebase Admin sin tocar la capa de aplicación ni los middlewares.

## Methods

### issue()

> **issue**(`claims`): `Promise`\<`string`\>

#### Parameters

##### claims

`Omit`\<[`SessionClaims`](SessionClaims.md), `"issuedAt"` \| `"lastSeenAt"`\>

#### Returns

`Promise`\<`string`\>

***

### verify()

> **verify**(`token`): `Promise`\<[`SessionClaims`](SessionClaims.md) \| `null`\>

#### Parameters

##### token

`string`

#### Returns

`Promise`\<[`SessionClaims`](SessionClaims.md) \| `null`\>

***

### touch()

> **touch**(`claims`): `Promise`\<`string`\>

Re-emite el token conservando `issuedAt` y refrescando `lastSeenAt` a ahora.

#### Parameters

##### claims

[`SessionClaims`](SessionClaims.md)

#### Returns

`Promise`\<`string`\>
