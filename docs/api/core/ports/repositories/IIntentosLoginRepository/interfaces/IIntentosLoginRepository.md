[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IIntentosLoginRepository](../README.md) / IIntentosLoginRepository

# Interface: IIntentosLoginRepository

Antiabuso de login: cuenta intentos fallidos por correo y bloquea temporalmente
(`intentos_login/{correo}`). Persistente porque en Cloudflare Workers cada request
puede caer en un isolate distinto — no sirve un contador en memoria.

## Methods

### consultar()

> **consultar**(`email`, `ahora`): `Promise`\<[`EstadoIntentosLogin`](EstadoIntentosLogin.md)\>

Lee el estado actual sin modificarlo (para el chequeo previo al login).

#### Parameters

##### email

`string`

##### ahora

`Date`

#### Returns

`Promise`\<[`EstadoIntentosLogin`](EstadoIntentosLogin.md)\>

***

### registrarFallo()

> **registrarFallo**(`email`, `ahora`): `Promise`\<[`EstadoIntentosLogin`](EstadoIntentosLogin.md)\>

Registra un intento fallido y devuelve el estado resultante.

#### Parameters

##### email

`string`

##### ahora

`Date`

#### Returns

`Promise`\<[`EstadoIntentosLogin`](EstadoIntentosLogin.md)\>

***

### limpiar()

> **limpiar**(`email`): `Promise`\<`void`\>

Borra el registro (tras un login correcto).

#### Parameters

##### email

`string`

#### Returns

`Promise`\<`void`\>
