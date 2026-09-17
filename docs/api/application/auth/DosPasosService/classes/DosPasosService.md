[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/auth/DosPasosService](../README.md) / DosPasosService

# Class: DosPasosService

Verificación en dos pasos (TOTP con app autenticadora: Google Authenticator, Microsoft, Authy…).

## Constructors

### Constructor

> **new DosPasosService**(`usuarios`, `clock`, `logger`, `secreto`, `emisor`): `DosPasosService`

#### Parameters

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

##### secreto

`string`

##### emisor

`string`

#### Returns

`DosPasosService`

## Methods

### iniciar()

> **iniciar**(`actor`): `Promise`\<\{ `secreto`: `string`; `qrDataUrl`: `string`; \}\>

Genera (o reutiliza) un secreto pendiente de confirmar y devuelve el QR para escanearlo.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<\{ `secreto`: `string`; `qrDataUrl`: `string`; \}\>

***

### activar()

> **activar**(`actor`, `codigo`): `Promise`\<`void`\>

Confirma con un código de la app y deja activa la verificación.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### codigo

`string`

#### Returns

`Promise`\<`void`\>

***

### desactivar()

> **desactivar**(`actor`, `codigo`): `Promise`\<`void`\>

El propio usuario la apaga (pide un código vigente).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### codigo

`string`

#### Returns

`Promise`\<`void`\>

***

### resetear()

> **resetear**(`actor`, `uid`): `Promise`\<`void`\>

Un administrador la quita a otro usuario (p. ej. perdió el teléfono).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### uid

`string`

#### Returns

`Promise`\<`void`\>

***

### verificarCodigo()

> **verificarCodigo**(`uid`, `codigo`): `Promise`\<`boolean`\>

¿El código es válido para ese usuario?

#### Parameters

##### uid

`string`

##### codigo

`string`

#### Returns

`Promise`\<`boolean`\>

***

### firmarPendiente()

> **firmarPendiente**(`uid`): `string`

#### Parameters

##### uid

`string`

#### Returns

`string`

***

### leerPendiente()

> **leerPendiente**(`token`): `string` \| `null`

uid del login pendiente, o `null` si el token es inválido o ya expiró.

#### Parameters

##### token

`string`

#### Returns

`string` \| `null`
