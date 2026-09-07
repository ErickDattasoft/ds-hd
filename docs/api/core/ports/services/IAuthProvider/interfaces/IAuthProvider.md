[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IAuthProvider](../README.md) / IAuthProvider

# Interface: IAuthProvider

Puerto del proveedor de identidad (hoy: Firebase Auth). Cubre solo la gestión de la
identidad — verificar contraseña, crear/actualizar/inhabilitar la cuenta, custom claims,
enlaces de acción. La SESIÓN web se maneja aparte, en `ISessionManager`.

La capa de aplicación depende de esta interfaz, nunca de `firebase-admin`.

## Methods

### verifyPassword()

> **verifyPassword**(`email`, `password`): `Promise`\<[`CredencialesVerificadas`](CredencialesVerificadas.md)\>

Valida email + contraseña. Lanza `UnauthorizedError` si no coinciden.

#### Parameters

##### email

`string`

##### password

`string`

#### Returns

`Promise`\<[`CredencialesVerificadas`](CredencialesVerificadas.md)\>

***

### createAccount()

> **createAccount**(`input`): `Promise`\<\{ `uid`: `string`; \}\>

Crea la cuenta de identidad y devuelve su uid. Lanza `ConflictError` si el correo ya existe.

#### Parameters

##### input

[`CrearCuentaInput`](CrearCuentaInput.md)

#### Returns

`Promise`\<\{ `uid`: `string`; \}\>

***

### setPassword()

> **setPassword**(`uid`, `password`): `Promise`\<`void`\>

Cambia la contraseña de una cuenta existente.

#### Parameters

##### uid

`string`

##### password

`string`

#### Returns

`Promise`\<`void`\>

***

### setDisabled()

> **setDisabled**(`uid`, `disabled`): `Promise`\<`void`\>

Habilita/inhabilita la cuenta a nivel de identidad (bloquea el login).

#### Parameters

##### uid

`string`

##### disabled

`boolean`

#### Returns

`Promise`\<`void`\>

***

### setRolesClaim()

> **setRolesClaim**(`uid`, `roles`): `Promise`\<`void`\>

Fija los custom claims de rol en el token: `roles` (arreglo) y `role` (el principal, para
compatibilidad con lectores de un solo rol). No es frontera de seguridad —
`firestore.rules` es deny-all— pero lo consumen servicios que leen el token.

#### Parameters

##### uid

`string`

##### roles

`string`[]

#### Returns

`Promise`\<`void`\>

***

### revokeSessions()

> **revokeSessions**(`uid`): `Promise`\<`void`\>

Invalida los tokens/sesiones activas del usuario (tras cambiar rol o desactivarlo).

#### Parameters

##### uid

`string`

#### Returns

`Promise`\<`void`\>

***

### generatePasswordResetLink()

> **generatePasswordResetLink**(`email`): `Promise`\<`string`\>

Genera un enlace de restablecimiento de contraseña para enviarlo por correo.

#### Parameters

##### email

`string`

#### Returns

`Promise`\<`string`\>

***

### getUidByEmail()

> **getUidByEmail**(`email`): `Promise`\<`string` \| `null`\>

Busca el uid de la cuenta de identidad con ese correo. `null` si no existe.
Lo usa la migración para reasignar `usuarios/{uid}` al uid real tras `auth:import`
(antes de eso, el uid migrado es un placeholder = el correo).

#### Parameters

##### email

`string`

#### Returns

`Promise`\<`string` \| `null`\>
