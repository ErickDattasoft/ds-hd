[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IBuzonEntrante](../README.md) / IBuzonEntrante

# Interface: IBuzonEntrante

Buzón de correo entrante (hoy: Zoho Mail por API OAuth). Se lee cada hora desde el cron para
convertir las respuestas de los clientes en notas de su ticket.

## Methods

### listarNoLeidos()

> **listarNoLeidos**(`cfg`, `limite`): `Promise`\<[`CorreoRecibido`](CorreoRecibido.md)[]\>

Correos sin leer de la carpeta configurada, del más viejo al más nuevo.

#### Parameters

##### cfg

[`ConfiguracionCorreoEntrante`](../../../../entities/ConfiguracionCorreoEntrante/interfaces/ConfiguracionCorreoEntrante.md)

##### limite

`number`

#### Returns

`Promise`\<[`CorreoRecibido`](CorreoRecibido.md)[]\>

***

### marcarLeido()

> **marcarLeido**(`cfg`, `correo`): `Promise`\<`void`\>

Marca uno como leído para no volver a procesarlo.

#### Parameters

##### cfg

[`ConfiguracionCorreoEntrante`](../../../../entities/ConfiguracionCorreoEntrante/interfaces/ConfiguracionCorreoEntrante.md)

##### correo

[`CorreoRecibido`](CorreoRecibido.md)

#### Returns

`Promise`\<`void`\>

***

### verificar()

> **verificar**(`cfg`): `Promise`\<\{ `accountId`: `string`; `correo`: `string`; \}\>

Comprueba credenciales y devuelve el `accountId` y la dirección del buzón.

#### Parameters

##### cfg

[`ConfiguracionCorreoEntrante`](../../../../entities/ConfiguracionCorreoEntrante/interfaces/ConfiguracionCorreoEntrante.md)

#### Returns

`Promise`\<\{ `accountId`: `string`; `correo`: `string`; \}\>
