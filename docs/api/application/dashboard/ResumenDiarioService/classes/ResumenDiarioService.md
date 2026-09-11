[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/dashboard/ResumenDiarioService](../README.md) / ResumenDiarioService

# Class: ResumenDiarioService

Resumen diario de operación por correo — reusa las mismas métricas que ve un admin en el
dashboard (`ObtenerMetricasService`), pero empaquetadas para enviarse solas, ya sea a
demanda ("Enviar resumen ahora") o una vez al día vía el job de cron.

## Constructors

### Constructor

> **new ResumenDiarioService**(`metricas`, `repo`, `email`, `bitacora`, `clock`, `logger`): `ResumenDiarioService`

#### Parameters

##### metricas

[`ObtenerMetricasService`](../../ObtenerMetricasService/classes/ObtenerMetricasService.md)

##### repo

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ResumenDiarioService`

## Methods

### obtenerConfig()

> **obtenerConfig**(): `Promise`\<[`ConfiguracionResumen`](../../../../core/entities/ConfiguracionResumen/interfaces/ConfiguracionResumen.md)\>

#### Returns

`Promise`\<[`ConfiguracionResumen`](../../../../core/entities/ConfiguracionResumen/interfaces/ConfiguracionResumen.md)\>

***

### actualizarConfig()

> **actualizarConfig**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### habilitado

`boolean`

###### destinatarios

`string`

###### horaEnvio

`unknown`

#### Returns

`Promise`\<`void`\>

***

### enviarAhora()

> **enviarAhora**(`actor`): `Promise`\<\{ `enviadoA`: `string`[]; \}\>

Botón "Enviar resumen ahora" desde Configuración.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<\{ `enviadoA`: `string`[]; \}\>

***

### enviarSiCorresponde()

> **enviarSiCorresponde**(): `Promise`\<\{ `enviado`: `boolean`; `motivo?`: `string`; `enviadoA?`: `string`[]; \}\>

Job de cron (corre cada hora): envía una sola vez al día, a la hora configurada.

#### Returns

`Promise`\<\{ `enviado`: `boolean`; `motivo?`: `string`; `enviadoA?`: `string`[]; \}\>
