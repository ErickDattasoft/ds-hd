[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/ConfiguracionIntegracionesService](../README.md) / ConfiguracionIntegracionesService

# Class: ConfiguracionIntegracionesService

Casos de uso: leer/actualizar la config de n8n + WhatsApp (CallMeBot) y probar conexión.

## Constructors

### Constructor

> **new ConfiguracionIntegracionesService**(`repo`, `gateway`, `email`, `correo`, `logger`): `ConfiguracionIntegracionesService`

#### Parameters

##### repo

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### gateway

[`IIntegracionesGateway`](../../../../core/ports/services/IIntegracionesGateway/interfaces/IIntegracionesGateway.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### correo

[`InfoCorreo`](../interfaces/InfoCorreo.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ConfiguracionIntegracionesService`

## Accessors

### remitenteServidor

#### Get Signature

> **get** **remitenteServidor**(): `string`

Remitente fijo del servidor (`BREVO_SENDER_EMAIL`), el que se usa si no se elige otro.

##### Returns

`string`

## Methods

### infoCorreo()

> **infoCorreo**(): `Promise`\<[`InfoCorreo`](../interfaces/InfoCorreo.md)\>

#### Returns

`Promise`\<[`InfoCorreo`](../interfaces/InfoCorreo.md)\>

***

### obtener()

> **obtener**(): `Promise`\<[`ConfiguracionIntegraciones`](../../../../core/entities/ConfiguracionIntegraciones/interfaces/ConfiguracionIntegraciones.md)\>

#### Returns

`Promise`\<[`ConfiguracionIntegraciones`](../../../../core/entities/ConfiguracionIntegraciones/interfaces/ConfiguracionIntegraciones.md)\>

***

### actualizar()

> **actualizar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

[`DatosIntegraciones`](../interfaces/DatosIntegraciones.md)

#### Returns

`Promise`\<`void`\>

***

### reglasDeForm()

> `static` **reglasDeForm**(`body`): [`MatrizReglas`](../../../../core/entities/ConfiguracionIntegraciones/type-aliases/MatrizReglas.md)

Convierte los campos `regla_<evento>_webhook`/`_whatsapp`/`_dest` del form en una matriz.
`_dest` son los nombres del equipo que reciben ese evento por WhatsApp (ninguno = todos).

#### Parameters

##### body

`Record`\<`string`, `unknown`\>

#### Returns

[`MatrizReglas`](../../../../core/entities/ConfiguracionIntegraciones/type-aliases/MatrizReglas.md)

***

### probarWebhook()

> **probarWebhook**(`actor`, `url`): `Promise`\<[`ResultadoPrueba`](../../../../core/ports/services/IIntegracionesGateway/interfaces/ResultadoPrueba.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### url

`string`

#### Returns

`Promise`\<[`ResultadoPrueba`](../../../../core/ports/services/IIntegracionesGateway/interfaces/ResultadoPrueba.md)\>

***

### probarWhatsApp()

> **probarWhatsApp**(`actor`, `telefono`, `apiKey`): `Promise`\<[`ResultadoPrueba`](../../../../core/ports/services/IIntegracionesGateway/interfaces/ResultadoPrueba.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### telefono

`string`

##### apiKey

`string`

#### Returns

`Promise`\<[`ResultadoPrueba`](../../../../core/ports/services/IIntegracionesGateway/interfaces/ResultadoPrueba.md)\>

***

### probarWhatsAppClientes()

> **probarWhatsAppClientes**(`actor`, `telefono`): `Promise`\<[`ResultadoPrueba`](../../../../core/ports/services/IIntegracionesGateway/interfaces/ResultadoPrueba.md)\>

Manda un WhatsApp de prueba con el proveedor de clientes guardado (Meta o Twilio).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### telefono

`string`

#### Returns

`Promise`\<[`ResultadoPrueba`](../../../../core/ports/services/IIntegracionesGateway/interfaces/ResultadoPrueba.md)\>

***

### probarCorreo()

> **probarCorreo**(`actor`, `destino`): `Promise`\<[`ResultadoPrueba`](../../../../core/ports/services/IIntegracionesGateway/interfaces/ResultadoPrueba.md)\>

Manda un correo de prueba a `destino` para verificar que el envío funciona de verdad.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### destino

`string`

#### Returns

`Promise`\<[`ResultadoPrueba`](../../../../core/ports/services/IIntegracionesGateway/interfaces/ResultadoPrueba.md)\>
