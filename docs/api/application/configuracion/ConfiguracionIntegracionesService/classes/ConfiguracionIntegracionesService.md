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

## Methods

### infoCorreo()

> **infoCorreo**(): [`InfoCorreo`](../interfaces/InfoCorreo.md)

Estado del envío de correo del servidor, para mostrarlo junto al botón de prueba.

#### Returns

[`InfoCorreo`](../interfaces/InfoCorreo.md)

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

Convierte los campos `regla_<evento>_webhook`/`regla_<evento>_whatsapp` del form en una matriz.

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
