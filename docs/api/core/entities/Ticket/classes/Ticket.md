[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / Ticket

# Class: Ticket

Defined in: core/entities/Ticket.ts:91

Ticket de soporte. Encapsula el ciclo de vida (transiciones de estado válidas), el cálculo
de tiempo trabajado y el reloj de SLA con pausa. No conoce Firestore ni HTTP.

## Constructors

### Constructor

> **new Ticket**(`props`): `Ticket`

Defined in: core/entities/Ticket.ts:129

#### Parameters

##### props

[`TicketProps`](../interfaces/TicketProps.md)

#### Returns

`Ticket`

## Properties

### id

> `readonly` **id**: `string`

Defined in: core/entities/Ticket.ts:92

***

### numero

> `readonly` **numero**: `number`

Defined in: core/entities/Ticket.ts:93

***

### asunto

> **asunto**: `string`

Defined in: core/entities/Ticket.ts:94

***

### descripcion

> **descripcion**: `string`

Defined in: core/entities/Ticket.ts:95

***

### tipo

> **tipo**: `string`

Defined in: core/entities/Ticket.ts:96

***

### sistema

> **sistema**: `string` \| `null`

Defined in: core/entities/Ticket.ts:97

***

### estado

> **estado**: `string`

Defined in: core/entities/Ticket.ts:98

***

### prioridad

> **prioridad**: `"Baja"` \| `"Media"` \| `"Alta"` \| `"Urgente"`

Defined in: core/entities/Ticket.ts:99

***

### grupo

> **grupo**: `string` \| `null`

Defined in: core/entities/Ticket.ts:100

***

### canal

> `readonly` **canal**: [`CanalTicket`](../type-aliases/CanalTicket.md)

Defined in: core/entities/Ticket.ts:101

***

### empresaId

> **empresaId**: `string` \| `null`

Defined in: core/entities/Ticket.ts:103

***

### empresaNombre

> **empresaNombre**: `string` \| `null`

Defined in: core/entities/Ticket.ts:104

***

### contactoId

> **contactoId**: `string` \| `null`

Defined in: core/entities/Ticket.ts:105

***

### contactoNombre

> **contactoNombre**: `string` \| `null`

Defined in: core/entities/Ticket.ts:106

***

### contactoCorreo

> **contactoCorreo**: `string` \| `null`

Defined in: core/entities/Ticket.ts:107

***

### agenteAsignadoUid

> **agenteAsignadoUid**: `string` \| `null`

Defined in: core/entities/Ticket.ts:109

***

### agenteAsignadoNombre

> **agenteAsignadoNombre**: `string` \| `null`

Defined in: core/entities/Ticket.ts:110

***

### origenPublicoId

> `readonly` **origenPublicoId**: `string` \| `null`

Defined in: core/entities/Ticket.ts:112

***

### solicitanteUid

> `readonly` **solicitanteUid**: `string` \| `null`

Defined in: core/entities/Ticket.ts:113

***

### creadoPorUid

> `readonly` **creadoPorUid**: `string` \| `null`

Defined in: core/entities/Ticket.ts:114

***

### sla

> **sla**: [`SlaState`](../interfaces/SlaState.md)

Defined in: core/entities/Ticket.ts:116

***

### facturacion

> **facturacion**: [`FacturacionState`](../interfaces/FacturacionState.md)

Defined in: core/entities/Ticket.ts:117

***

### tiempoTrabajadoMs

> **tiempoTrabajadoMs**: `number`

Defined in: core/entities/Ticket.ts:118

***

### abiertoEn

> `readonly` **abiertoEn**: `Date`

Defined in: core/entities/Ticket.ts:120

***

### ultimoCambioEstadoEn

> **ultimoCambioEstadoEn**: `Date`

Defined in: core/entities/Ticket.ts:121

***

### primeraRespuestaEn

> **primeraRespuestaEn**: `Date` \| `null`

Defined in: core/entities/Ticket.ts:122

***

### resueltoEn

> **resueltoEn**: `Date` \| `null`

Defined in: core/entities/Ticket.ts:123

***

### cerradoEn

> **cerradoEn**: `Date` \| `null`

Defined in: core/entities/Ticket.ts:124

***

### createdAt

> `readonly` **createdAt**: `Date`

Defined in: core/entities/Ticket.ts:125

***

### updatedAt

> **updatedAt**: `Date`

Defined in: core/entities/Ticket.ts:126

***

### historialEstados

> **historialEstados**: [`CambioEstado`](../interfaces/CambioEstado.md)[]

Defined in: core/entities/Ticket.ts:127

## Accessors

### estaAbierto

#### Get Signature

> **get** **estaAbierto**(): `boolean`

Defined in: core/entities/Ticket.ts:219

##### Returns

`boolean`

***

### esResuelto

#### Get Signature

> **get** **esResuelto**(): `boolean`

Defined in: core/entities/Ticket.ts:322

##### Returns

`boolean`

***

### esCerrado

#### Get Signature

> **get** **esCerrado**(): `boolean`

Defined in: core/entities/Ticket.ts:325

##### Returns

`boolean`

## Methods

### crear()

> `static` **crear**(`input`): `Ticket`

Defined in: core/entities/Ticket.ts:178

#### Parameters

##### input

###### id

`string`

###### numero

`number`

###### asunto

`string`

###### descripcion

`string`

###### tipo

`string`

###### prioridad

`"Baja"` \| `"Media"` \| `"Alta"` \| `"Urgente"`

###### estadoInicial

`string`

###### canal

[`CanalTicket`](../type-aliases/CanalTicket.md)

###### sistema?

`string` \| `null`

###### grupo?

`string` \| `null`

###### empresaId?

`string` \| `null`

###### empresaNombre?

`string` \| `null`

###### contactoId?

`string` \| `null`

###### contactoNombre?

`string` \| `null`

###### contactoCorreo?

`string` \| `null`

###### solicitanteUid?

`string` \| `null`

###### creadoPorUid?

`string` \| `null`

###### origenPublicoId?

`string` \| `null`

###### requiereFacturacion?

`boolean`

###### horasSla?

`number`

###### ahora

`Date`

#### Returns

`Ticket`

***

### cambiarEstado()

> **cambiarEstado**(`nuevo`, `catalogo`, `ahora`): [`ResultadoCambioEstado`](../interfaces/ResultadoCambioEstado.md)

Defined in: core/entities/Ticket.ts:223

#### Parameters

##### nuevo

`string`

##### catalogo

readonly `string`[]

##### ahora

`Date`

#### Returns

[`ResultadoCambioEstado`](../interfaces/ResultadoCambioEstado.md)

***

### asignar()

> **asignar**(`agenteUid`, `agenteNombre`, `ahora`): `void`

Defined in: core/entities/Ticket.ts:271

#### Parameters

##### agenteUid

`string`

##### agenteNombre

`string`

##### ahora

`Date`

#### Returns

`void`

***

### desasignar()

> **desasignar**(`ahora`): `void`

Defined in: core/entities/Ticket.ts:280

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### registrarPrimeraRespuesta()

> **registrarPrimeraRespuesta**(`ahora`): `void`

Defined in: core/entities/Ticket.ts:286

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### marcarFacturado()

> **marcarFacturado**(`facturado`, `ahora`): `void`

Defined in: core/entities/Ticket.ts:291

#### Parameters

##### facturado

`boolean`

##### ahora

`Date`

#### Returns

`void`

***

### slaConsumidoMs()

> **slaConsumidoMs**(`ahora`): `number`

Defined in: core/entities/Ticket.ts:298

Milisegundos "de reloj SLA" consumidos hasta `ahora` (descontando pausas).

#### Parameters

##### ahora

`Date`

#### Returns

`number`

***

### slaObjetivoMs()

> **slaObjetivoMs**(): `number`

Defined in: core/entities/Ticket.ts:308

#### Returns

`number`

***

### estaVencido()

> **estaVencido**(`ahora`): `boolean`

Defined in: core/entities/Ticket.ts:312

#### Parameters

##### ahora

`Date`

#### Returns

`boolean`

***

### slaRestanteMs()

> **slaRestanteMs**(`ahora`): `number`

Defined in: core/entities/Ticket.ts:318

ms restantes antes de incumplir el SLA (negativo si ya venció).

#### Parameters

##### ahora

`Date`

#### Returns

`number`

***

### estadoFueraDeCatalogo()

> **estadoFueraDeCatalogo**(`catalogo`): `boolean`

Defined in: core/entities/Ticket.ts:330

¿El estado actual está fuera del catálogo dado? (para avisos de UI)

#### Parameters

##### catalogo

readonly `string`[]

#### Returns

`boolean`
