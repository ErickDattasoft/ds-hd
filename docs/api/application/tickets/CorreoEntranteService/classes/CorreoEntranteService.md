[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/CorreoEntranteService](../README.md) / CorreoEntranteService

# Class: CorreoEntranteService

Convierte las respuestas que llegan al buzón de soporte en notas del ticket correspondiente.

Reglas: el asunto debe traer el número de ticket (los correos del CRM ya lo llevan) y, si está
activado `soloContactoDelTicket`, el remitente debe ser el contacto del ticket o alguno de sus
CC — así un tercero no puede escribir en un ticket ajeno solo con adivinar el número.

## Constructors

### Constructor

> **new CorreoEntranteService**(`tickets`, `config`, `buzon`, `ids`, `clock`, `logger`, `deps?`): `CorreoEntranteService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### buzon

[`IBuzonEntrante`](../../../../core/ports/services/IBuzonEntrante/interfaces/IBuzonEntrante.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

##### deps?

[`DepsCorreoEntrante`](../interfaces/DepsCorreoEntrante.md) = `{}`

#### Returns

`CorreoEntranteService`

## Methods

### webhookActivo()

> **webhookActivo**(`cfg`): `boolean`

¿El webhook de CloudMailin está habilitado (hay secreto del servidor o clave generada)?

#### Parameters

##### cfg

[`ConfiguracionCorreoEntrante`](../../../../core/entities/ConfiguracionCorreoEntrante/interfaces/ConfiguracionCorreoEntrante.md)

#### Returns

`boolean`

***

### claveWebhookValida()

> **claveWebhookValida**(`key`): `Promise`\<`boolean`\>

¿`key` abre el webhook? Vale el secreto del servidor o la clave generada en Configuración.

#### Parameters

##### key

`unknown`

#### Returns

`Promise`\<`boolean`\>

***

### recibirWebhook()

> **recibirWebhook**(`correo`): `Promise`\<[`ResultadoWebhookCorreo`](../type-aliases/ResultadoWebhookCorreo.md)\>

Un correo que llegó por webhook (CloudMailin). Con número de ticket → nota en ese ticket;
sin número → solicitud en el buzón de tickets públicos, para convertirla o descartarla a mano
(nunca se crea un ticket solo). No depende de "habilitado": el webhook ya es la decisión.

#### Parameters

##### correo

[`CorreoRecibido`](../../../../core/ports/services/IBuzonEntrante/interfaces/CorreoRecibido.md)

#### Returns

`Promise`\<[`ResultadoWebhookCorreo`](../type-aliases/ResultadoWebhookCorreo.md)\>

***

### revisar()

> **revisar**(`opts?`): `Promise`\<[`ResultadoCorreoEntrante`](../interfaces/ResultadoCorreoEntrante.md)\>

Revisa el buzón. `forzado` = lo pidió una persona desde Configuración (ignora "habilitado").

#### Parameters

##### opts?

###### forzado?

`boolean`

#### Returns

`Promise`\<[`ResultadoCorreoEntrante`](../interfaces/ResultadoCorreoEntrante.md)\>

***

### configuracion()

> **configuracion**(`actor`): `Promise`\<[`ConfiguracionCorreoEntrante`](../../../../core/entities/ConfiguracionCorreoEntrante/interfaces/ConfiguracionCorreoEntrante.md)\>

Config actual (para la pantalla de Configuración).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<[`ConfiguracionCorreoEntrante`](../../../../core/entities/ConfiguracionCorreoEntrante/interfaces/ConfiguracionCorreoEntrante.md)\>

***

### guardar()

> **guardar**(`actor`, `datos`): `Promise`\<`void`\>

Guarda la config; los secretos vacíos conservan el valor anterior.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### datos

`Omit`\<[`ConfiguracionCorreoEntrante`](../../../../core/entities/ConfiguracionCorreoEntrante/interfaces/ConfiguracionCorreoEntrante.md), `"ultimaRevision"` \| `"ultimoResultado"` \| `"remitenteEmail"` \| `"remitenteNombre"` \| `"webhookKey"`\>

#### Returns

`Promise`\<`void`\>

***

### guardarRemitente()

> **guardarRemitente**(`actor`, `datos`): `Promise`\<`string`\>

Cambia el remitente de todo el correo del CRM. Antes de guardarlo pregunta al proveedor si lo
acepta: un remitente sin verificar en Brevo haría que NINGÚN correo saliera. Vacío = volver al
del servidor. Devuelve el detalle de la comprobación para mostrarlo.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### datos

###### email

`string`

###### nombre

`string`

#### Returns

`Promise`\<`string`\>

***

### generarClaveWebhook()

> **generarClaveWebhook**(`actor`): `Promise`\<`string`\>

Genera (o rota) la clave `?key=` del webhook de CloudMailin. La anterior deja de servir.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<`string`\>

***

### revisarManual()

> **revisarManual**(`actor`): `Promise`\<[`ResultadoCorreoEntrante`](../interfaces/ResultadoCorreoEntrante.md)\>

Revisión pedida a mano desde Configuración (aunque esté deshabilitado el automático).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<[`ResultadoCorreoEntrante`](../interfaces/ResultadoCorreoEntrante.md)\>

***

### verificar()

> **verificar**(`actor`): `Promise`\<\{ `accountId`: `string`; `correo`: `string`; \}\>

Prueba las credenciales y guarda el `accountId` que devuelve Zoho.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<\{ `accountId`: `string`; `correo`: `string`; \}\>
