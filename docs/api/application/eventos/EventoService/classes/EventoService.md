[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/eventos/EventoService](../README.md) / EventoService

# Class: EventoService

Eventos/webinars: gestión (staff), registro público, lista negra.

## Constructors

### Constructor

> **new EventoService**(`eventos`, `inscripciones`, `listaNegra`, `empresas`, `captcha`, `email`, `excel`, `ids`, `clock`, `logger`, `bitacora`, `baseUrl`, `exigirCaptcha?`): `EventoService`

#### Parameters

##### eventos

[`IEventoRepository`](../../../../core/ports/repositories/IEventoRepository/interfaces/IEventoRepository.md)

##### inscripciones

[`IInscripcionRepository`](../../../../core/ports/repositories/IEventoRepository/interfaces/IInscripcionRepository.md)

##### listaNegra

[`IListaNegraRepository`](../../../../core/ports/repositories/IEventoRepository/interfaces/IListaNegraRepository.md)

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### captcha

[`ICaptchaVerifier`](../../../../core/ports/services/ICaptchaVerifier/interfaces/ICaptchaVerifier.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### excel

[`IExcelIO`](../../../../core/ports/services/IExcelIO/interfaces/IExcelIO.md)

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

##### exigirCaptcha?

`boolean` = `false`

En producción, sin Turnstile configurado el registro público se rechaza.

#### Returns

`EventoService`

## Methods

### listar()

> **listar**(`soloPublicados?`): `Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)[]\>

#### Parameters

##### soloPublicados?

`boolean` = `false`

#### Returns

`Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)[]\>

***

### obtener()

> **obtener**(`id`): `Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)\>

***

### detalleConInscritos()

> **detalleConInscritos**(`id`): `Promise`\<\{ `evento`: [`Evento`](../../../../core/entities/Evento/classes/Evento.md); `inscritos`: [`Inscripcion`](../../../../core/entities/Inscripcion/interfaces/Inscripcion.md)[]; \}\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `evento`: [`Evento`](../../../../core/entities/Evento/classes/Evento.md); `inscritos`: [`Inscripcion`](../../../../core/entities/Inscripcion/interfaces/Inscripcion.md)[]; \}\>

***

### guardar()

> **guardar**(`actor`, `datos`, `id?`): `Promise`\<[`Evento`](../../../../core/entities/Evento/classes/Evento.md)\>

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

### eliminar()

> **eliminar**(`actor`, `id`): `Promise`\<`void`\>

Borra el evento y todas sus inscripciones. Permanente.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### marcarInscripcion()

> **marcarInscripcion**(`actor`, `eventoId`, `inscripcionId`, `estado`): `Promise`\<`void`\>

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

### actualizarInscripcion()

> **actualizarInscripcion**(`actor`, `eventoId`, `inscripcionId`, `cambios`): `Promise`\<`void`\>

Corrige a mano los datos de un inscrito (el registro público los captura el propio
interesado y a veces vienen con erratas), y las dos marcas de seguimiento del staff:
`contactadoWsp` y `asistioReal`. Solo se tocan los campos presentes en `cambios`.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### inscripcionId

`string`

##### cambios

[`CambiosInscripcion`](../interfaces/CambiosInscripcion.md)

#### Returns

`Promise`\<`void`\>

***

### marcarContactadoWsp()

> **marcarContactadoWsp**(`actor`, `eventoId`, `inscripcionId`): `Promise`\<`void`\>

Marca como ya contactado por WhatsApp — lo usa el botón 💬 al abrir wa.me.

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

### eliminarInscripcion()

> **eliminarInscripcion**(`actor`, `eventoId`, `inscripcionId`): `Promise`\<`void`\>

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

### marcarInscritoEnListaNegra()

> **marcarInscritoEnListaNegra**(`actor`, `eventoId`, `inscripcionId`, `motivo?`): `Promise`\<`void`\>

Manda a la lista negra a partir de una inscripción — así queda registrado también su
teléfono, no solo el correo, y el 🚫 lo cruza si vuelve a registrarse en otro evento.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### inscripcionId

`string`

##### motivo?

`string`

#### Returns

`Promise`\<`void`\>

***

### historialAsistencias()

> **historialAsistencias**(`eventoIdActual`): `Promise`\<`Record`\<`string`, `string`\>\>

Por cada persona, si ya asistió de verdad (`asistioReal`) a OTRO evento: el título de ese
evento. Indexado por correo y por teléfono, porque puede volver con uno u otro distinto.
Sirve para no reinvitar a quien ya fue cuando un webinar se repite.

#### Parameters

##### eventoIdActual

`string`

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

***

### exportarInscritosExcel()

> **exportarInscritosExcel**(`actor`, `eventoId`): `Promise`\<\{ `buffer`: `Buffer`; `nombre`: `string`; \}\>

Inscritos del evento en `.xlsx` — mismas columnas que exportaba el CRM anterior.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

#### Returns

`Promise`\<\{ `buffer`: `Buffer`; `nombre`: `string`; \}\>

***

### empresasParaInvitar()

> **empresasParaInvitar**(): `Promise`\<`object`[]\>

Nombres de empresas activas de la cartera, para el autocompletado del panel.

#### Returns

`Promise`\<`object`[]\>

***

### historialEmpresas()

> **historialEmpresas**(`eventoId`): `Promise`\<`Record`\<`string`, \{ `eventos`: `number`; `asistio`: `number`; \}\>\>

Historial cruzado: por cada empresa invitada al evento dado, en cuántos OTROS eventos
participó y a cuántos asistió (respuesta `asistira`). Sirve para no reinvitar de más.

#### Parameters

##### eventoId

`string`

#### Returns

`Promise`\<`Record`\<`string`, \{ `eventos`: `number`; `asistio`: `number`; \}\>\>

***

### agregarEmpresaInvitada()

> **agregarEmpresaInvitada**(`actor`, `eventoId`, `datos`): `Promise`\<[`InvitacionEmpresa`](../../../../core/entities/Evento/interfaces/InvitacionEmpresa.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### datos

###### empresaNombre

`string`

###### invitadoPor?

`string`

#### Returns

`Promise`\<[`InvitacionEmpresa`](../../../../core/entities/Evento/interfaces/InvitacionEmpresa.md)\>

***

### actualizarEmpresaInvitada()

> **actualizarEmpresaInvitada**(`actor`, `eventoId`, `invId`, `cambios`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### invId

`string`

##### cambios

`Partial`\<`Pick`\<[`InvitacionEmpresa`](../../../../core/entities/Evento/interfaces/InvitacionEmpresa.md), `"invitadoPor"` \| `"contactado"` \| `"respuesta"` \| `"notas"`\>\>

#### Returns

`Promise`\<`void`\>

***

### quitarEmpresaInvitada()

> **quitarEmpresaInvitada**(`actor`, `eventoId`, `invId`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### invId

`string`

#### Returns

`Promise`\<`void`\>

***

### agregarInvitadoExterno()

> **agregarInvitadoExterno**(`actor`, `eventoId`, `datos`): `Promise`\<[`InvitadoExterno`](../../../../core/entities/Evento/interfaces/InvitadoExterno.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### datos

###### nombre?

`string`

###### fuente?

`string`

#### Returns

`Promise`\<[`InvitadoExterno`](../../../../core/entities/Evento/interfaces/InvitadoExterno.md)\>

***

### actualizarInvitadoExterno()

> **actualizarInvitadoExterno**(`actor`, `eventoId`, `extId`, `cambios`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### extId

`string`

##### cambios

`Partial`\<`Pick`\<[`InvitadoExterno`](../../../../core/entities/Evento/interfaces/InvitadoExterno.md), `"nombre"` \| `"fuente"` \| `"contactado"` \| `"respuesta"` \| `"notas"`\>\>

#### Returns

`Promise`\<`void`\>

***

### quitarInvitadoExterno()

> **quitarInvitadoExterno**(`actor`, `eventoId`, `extId`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### extId

`string`

#### Returns

`Promise`\<`void`\>

***

### actualizarFlayer()

> **actualizarFlayer**(`actor`, `eventoId`, `input`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

##### input

###### contentType

`string`

###### base64

`string`

#### Returns

`Promise`\<`void`\>

***

### eliminarFlayer()

> **eliminarFlayer**(`actor`, `eventoId`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### eventoId

`string`

#### Returns

`Promise`\<`void`\>

***

### listaNegraTodos()

> **listaNegraTodos**(): `Promise`\<[`EntradaListaNegra`](../../../../core/entities/Inscripcion/interfaces/EntradaListaNegra.md)[]\>

#### Returns

`Promise`\<[`EntradaListaNegra`](../../../../core/entities/Inscripcion/interfaces/EntradaListaNegra.md)[]\>

***

### agregarListaNegra()

> **agregarListaNegra**(`actor`, `email`, `motivo?`, `telefono?`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### email

`string`

##### motivo?

`string`

##### telefono?

`string`

#### Returns

`Promise`\<`void`\>

***

### quitarListaNegra()

> **quitarListaNegra**(`actor`, `email`): `Promise`\<`void`\>

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

#### Parameters

##### input

[`RegistroPublicoInput`](../interfaces/RegistroPublicoInput.md)

#### Returns

`Promise`\<[`Inscripcion`](../../../../core/entities/Inscripcion/interfaces/Inscripcion.md)\>

***

### reenviarLinkPublico()

> **reenviarLinkPublico**(`eventoId`, `email`): `Promise`\<`void`\>

Reenvía la confirmación si el correo ya está registrado en el evento — respuesta genérica
 a propósito (no revela si el correo existe o no, para no facilitar enumeración).

#### Parameters

##### eventoId

`string`

##### email

`string`

#### Returns

`Promise`\<`void`\>

***

### procesarWebhookBrevo()

> **procesarWebhookBrevo**(`payload`): `Promise`\<\{ `actualizada`: `boolean`; \}\>

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

#### Returns

`Promise`\<\{ `eventos`: `number`; `correos`: `number`; \}\>

***

### enviarSeguimiento()

> **enviarSeguimiento**(): `Promise`\<\{ `eventos`: `number`; `correos`: `number`; \}\>

Mensaje de seguimiento por correo tras el evento — opcional a propósito (vacío = no se
manda, evento por evento), horas configurables después de `fechaHora` (default 24h). Mismo
patrón que [enviarRecordatorios](#enviarrecordatorios) (marca `recordatoriosEnviados` para no repetir).

#### Returns

`Promise`\<\{ `eventos`: `number`; `correos`: `number`; \}\>
