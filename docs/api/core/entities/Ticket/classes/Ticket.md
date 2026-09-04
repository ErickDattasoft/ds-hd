[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / Ticket

# Class: Ticket

Ticket de soporte. Encapsula el ciclo de vida (transiciones de estado válidas), el cálculo
de tiempo trabajado y el reloj de SLA con pausa. No conoce Firestore ni HTTP.

## Constructors

### Constructor

> **new Ticket**(`props`): `Ticket`

#### Parameters

##### props

[`TicketProps`](../interfaces/TicketProps.md)

#### Returns

`Ticket`

## Properties

### id

> `readonly` **id**: `string`

***

### numero

> `readonly` **numero**: `number`

***

### asunto

> **asunto**: `string`

***

### descripcion

> **descripcion**: `string`

***

### tipo

> **tipo**: `string`

***

### sistema

> **sistema**: `string` \| `null`

***

### estado

> **estado**: `string`

***

### prioridad

> **prioridad**: `"Baja"` \| `"Media"` \| `"Alta"` \| `"Urgente"`

***

### grupo

> **grupo**: `string` \| `null`

***

### canal

> `readonly` **canal**: [`CanalTicket`](../type-aliases/CanalTicket.md)

***

### empresaId

> **empresaId**: `string` \| `null`

***

### empresaNombre

> **empresaNombre**: `string` \| `null`

***

### contactoId

> **contactoId**: `string` \| `null`

***

### contactoNombre

> **contactoNombre**: `string` \| `null`

***

### contactoCorreo

> **contactoCorreo**: `string` \| `null`

***

### agenteAsignadoUid

> **agenteAsignadoUid**: `string` \| `null`

***

### agenteAsignadoNombre

> **agenteAsignadoNombre**: `string` \| `null`

***

### origenPublicoId

> `readonly` **origenPublicoId**: `string` \| `null`

***

### solicitanteUid

> `readonly` **solicitanteUid**: `string` \| `null`

***

### creadoPorUid

> `readonly` **creadoPorUid**: `string` \| `null`

***

### sla

> **sla**: [`SlaState`](../interfaces/SlaState.md)

***

### facturacion

> **facturacion**: [`FacturacionState`](../interfaces/FacturacionState.md)

***

### tiempoTrabajadoMs

> **tiempoTrabajadoMs**: `number`

***

### abiertoEn

> `readonly` **abiertoEn**: `Date`

***

### ultimoCambioEstadoEn

> **ultimoCambioEstadoEn**: `Date`

***

### primeraRespuestaEn

> **primeraRespuestaEn**: `Date` \| `null`

***

### resueltoEn

> **resueltoEn**: `Date` \| `null`

***

### cerradoEn

> **cerradoEn**: `Date` \| `null`

***

### createdAt

> `readonly` **createdAt**: `Date`

***

### updatedAt

> **updatedAt**: `Date`

***

### historialEstados

> **historialEstados**: [`CambioEstado`](../interfaces/CambioEstado.md)[]

***

### archivado

> **archivado**: `boolean`

## Accessors

### estaAbierto

#### Get Signature

> **get** **estaAbierto**(): `boolean`

##### Returns

`boolean`

***

### esResuelto

#### Get Signature

> **get** **esResuelto**(): `boolean`

##### Returns

`boolean`

***

### esCerrado

#### Get Signature

> **get** **esCerrado**(): `boolean`

##### Returns

`boolean`

## Methods

### crear()

> `static` **crear**(`input`): `Ticket`

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

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### registrarPrimeraRespuesta()

> **registrarPrimeraRespuesta**(`ahora`): `void`

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### marcarFacturado()

> **marcarFacturado**(`facturado`, `ahora`): `void`

#### Parameters

##### facturado

`boolean`

##### ahora

`Date`

#### Returns

`void`

***

### archivar()

> **archivar**(`ahora`): `void`

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### restaurar()

> **restaurar**(`ahora`): `void`

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### slaConsumidoMs()

> **slaConsumidoMs**(`ahora`): `number`

Milisegundos "de reloj SLA" consumidos hasta `ahora` (descontando pausas).

#### Parameters

##### ahora

`Date`

#### Returns

`number`

***

### slaObjetivoMs()

> **slaObjetivoMs**(): `number`

#### Returns

`number`

***

### estaVencido()

> **estaVencido**(`ahora`): `boolean`

#### Parameters

##### ahora

`Date`

#### Returns

`boolean`

***

### slaRestanteMs()

> **slaRestanteMs**(`ahora`): `number`

ms restantes antes de incumplir el SLA (negativo si ya venció).

#### Parameters

##### ahora

`Date`

#### Returns

`number`

***

### estadoFueraDeCatalogo()

> **estadoFueraDeCatalogo**(`catalogo`): `boolean`

¿El estado actual está fuera del catálogo dado? (para avisos de UI)

#### Parameters

##### catalogo

readonly `string`[]

#### Returns

`boolean`
