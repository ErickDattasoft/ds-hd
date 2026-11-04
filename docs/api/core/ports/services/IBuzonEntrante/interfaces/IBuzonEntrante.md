[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IBuzonEntrante](../README.md) / IBuzonEntrante

# Interface: IBuzonEntrante

Buzón de correo entrante (hoy: Zoho Mail por API OAuth). Se lee cada pocos minutos para
convertir las respuestas de los clientes en notas de su ticket. Es el buzón de una persona:
solo se lee, nunca se marca nada como leído ni se mueve.

## Methods

### listarRecientes()

> **listarRecientes**(`cfg`, `opts`): `Promise`\<[`CorreoRecibido`](CorreoRecibido.md)[]\>

Correos que llegaron después de `desde` con número de ticket en el asunto, del más viejo al
más nuevo (con su contenido y sus imágenes). Con `soloConAdjuntos`, solo los que traen
archivos: los demás ya llegan al instante por CloudMailin.

#### Parameters

##### cfg

[`ConfiguracionCorreoEntrante`](../../../../entities/ConfiguracionCorreoEntrante/interfaces/ConfiguracionCorreoEntrante.md)

##### opts

###### desde

`Date`

###### soloConAdjuntos

`boolean`

###### limite

`number`

#### Returns

`Promise`\<[`CorreoRecibido`](CorreoRecibido.md)[]\>

***

### canjearCodigo()

> **canjearCodigo**(`cfg`, `codigo`): `Promise`\<`string`\>

Cambia el código de un solo uso de la consola de Zoho por un refresh token (no expira).

#### Parameters

##### cfg

[`ConfiguracionCorreoEntrante`](../../../../entities/ConfiguracionCorreoEntrante/interfaces/ConfiguracionCorreoEntrante.md)

##### codigo

`string`

#### Returns

`Promise`\<`string`\>

***

### verificar()

> **verificar**(`cfg`): `Promise`\<\{ `accountId`: `string`; `correo`: `string`; \}\>

Comprueba credenciales y devuelve el `accountId` y la dirección del buzón.

#### Parameters

##### cfg

[`ConfiguracionCorreoEntrante`](../../../../entities/ConfiguracionCorreoEntrante/interfaces/ConfiguracionCorreoEntrante.md)

#### Returns

`Promise`\<\{ `accountId`: `string`; `correo`: `string`; \}\>
