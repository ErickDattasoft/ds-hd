[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/ICaptchaVerifier](../README.md) / ICaptchaVerifier

# Interface: ICaptchaVerifier

Verifica el token anti-bot de un formulario público (Cloudflare Turnstile).

## Methods

### verificar()

> **verificar**(`token`, `ip?`): `Promise`\<`boolean`\>

`true` si el token es válido. Si no hay captcha configurado, devuelve `true`.

#### Parameters

##### token

`string` \| `undefined`

##### ip?

`string`

#### Returns

`Promise`\<`boolean`\>
