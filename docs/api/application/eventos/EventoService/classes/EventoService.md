[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/eventos/EventoService](../README.md) / EventoService

# Class: EventoService

Defined in: application/eventos/EventoService.ts:41

Eventos/webinars: gestión (staff), registro público, lista negra.

## Constructors

### Constructor

> **new EventoService**(`eventos`, `inscripciones`, `listaNegra`, `captcha`, `email`, `ids`, `clock`, `logger`, `bitacora`, `baseUrl`): `EventoService`

Defined in: application/eventos/EventoService.ts:42

#### Parameters

##### eventos

[`IEventoRepository`](../../../../core/ports/repositories/IEventoRepository/interfaces/IEventoRepository.md)

##### inscripciones

[`IInscripcionRepository`](../../../../core/ports/repositories/IEventoRepository/interfaces/IInscripcionRepository.md)

##### listaNegra

[`IListaNegraRepository`](../../../../core/ports/repositories/IEventoRepository/interfaces/IListaNegraRepository.md)

##### captcha

[`ICaptchaVerifier`](../../../../core/ports/services/ICaptchaVerifier/interfaces/ICaptchaVerifier.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

##### baseUrl

`string`

#### Returns

`EventoService`

## Methods

### listar()

> **listar**(`soloPublicados?`): `Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)[]\>

Defined in: application/eventos/EventoService.ts:56

#### Parameters

##### soloPublicados?

`boolean` = `false`

#### Returns

`Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)[]\>

***

### obtener()

> **obtener**(`id`): `Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)\>

Defined in: application/eventos/EventoService.ts:60

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)\>

***

### detalleConInscritos()

> **detalleConInscritos**(`id`): `Promise`\<\{ `evento`: [`Evento`](../../../../core/entities/Evento/classes/Evento.md); `inscritos`: [`Inscripcion`](../../../../core/entities/Inscripcion/interfaces/Inscripcion.md)[]; \}\>

Defined in: application/eventos/EventoService.ts:66

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `evento`: [`Evento`](../../../../core/entities/Evento/classes/Evento.md); `inscritos`: [`Inscripcion`](../../../../core/entities/Inscripcion/interfaces/Inscripcion.md)[]; \}\>

***

### guardar()

> **guardar**(`actor`, `datos`, `id?`): `Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)\>

Defined in: application/eventos/EventoService.ts:72

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### datos

[`DatosEvento`](../interfaces/DatosEvento.md)

##### id?

`string`

#### Returns

`Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)\>

***

### marcarInscripcion()

> **marcarInscripcion**(`actor`, `eventoId`, `inscripcionId`, `estado`): `Promise`\<`void`\>

Defined in: application/eventos/EventoService.ts:103

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### inscripcionId

`string`

##### estado

[`EstadoInscripcion`](../../../../core/entities/Inscripcion/type-aliases/EstadoInscripcion.md)

#### Returns

`Promise`\<`void`\>

***

### reenviarConfirmacion()

> **reenviarConfirmacion**(`actor`, `eventoId`, `inscripcionId`): `Promise`\<`void`\>

Defined in: application/eventos/EventoService.ts:117

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### inscripcionId

`string`

#### Returns

`Promise`\<`void`\>

***

### listaNegraTodos()

> **listaNegraTodos**(): `Promise`\<[`EntradaListaNegra`](../../../../core/entities/Inscripcion/interfaces/EntradaListaNegra.md)[]\>

Defined in: application/eventos/EventoService.ts:129

#### Returns

`Promise`\<[`EntradaListaNegra`](../../../../core/entities/Inscripcion/interfaces/EntradaListaNegra.md)[]\>

***

### agregarListaNegra()

> **agregarListaNegra**(`actor`, `email`, `motivo?`): `Promise`\<`void`\>

Defined in: application/eventos/EventoService.ts:133

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### email

`string`

##### motivo?

`string`

#### Returns

`Promise`\<`void`\>

***

### quitarListaNegra()

> **quitarListaNegra**(`actor`, `email`): `Promise`\<`void`\>

Defined in: application/eventos/EventoService.ts:147

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### email

`string`

#### Returns

`Promise`\<`void`\>

***

### registrarPublico()

> **registrarPublico**(`input`): `Promise`\<[`Inscripcion`](../../../../core/entities/Inscripcion/interfaces/Inscripcion.md)\>

Defined in: application/eventos/EventoService.ts:153

#### Parameters

##### input

[`RegistroPublicoInput`](../interfaces/RegistroPublicoInput.md)

#### Returns

`Promise`\<[`Inscripcion`](../../../../core/entities/Inscripcion/interfaces/Inscripcion.md)\>

***

### procesarWebhookBrevo()

> **procesarWebhookBrevo**(`payload`): `Promise`\<\{ `actualizada`: `boolean`; \}\>

Defined in: application/eventos/EventoService.ts:197

#### Parameters

##### payload

###### event?

`string`

###### email?

`string`

###### tag?

`string`

###### tags?

`string`[]

#### Returns

`Promise`\<\{ `actualizada`: `boolean`; \}\>

***

### enviarRecordatorios()

> **enviarRecordatorios**(): `Promise`\<\{ `eventos`: `number`; `correos`: `number`; \}\>

Defined in: application/eventos/EventoService.ts:225

#### Returns

`Promise`\<\{ `eventos`: `number`; `correos`: `number`; \}\>
