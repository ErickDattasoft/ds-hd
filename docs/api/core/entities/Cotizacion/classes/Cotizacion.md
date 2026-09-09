[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Cotizacion](../README.md) / Cotizacion

# Class: Cotizacion

Cotización comercial con folio consecutivo, conceptos e importes.

## Constructors

### Constructor

> **new Cotizacion**(`props`): `Cotizacion`

#### Parameters

##### props

[`CotizacionProps`](../interfaces/CotizacionProps.md)

#### Returns

`Cotizacion`

## Properties

### id

> `readonly` **id**: `string`

***

### folio

> `readonly` **folio**: `string`

***

### empresaId

> **empresaId**: `string`

***

### empresaNombre

> **empresaNombre**: `string` \| `null`

***

### contactoId

> **contactoId**: `string` \| `null`

***

### fecha

> **fecha**: `Date`

***

### vigenciaDias

> **vigenciaDias**: `number`

***

### estado

> **estado**: [`EstadoCotizacion`](../type-aliases/EstadoCotizacion.md)

***

### moneda

> **moneda**: `string`

***

### ivaTasa

> **ivaTasa**: `number`

***

### conceptos

> **conceptos**: [`ConceptoCotizacion`](../interfaces/ConceptoCotizacion.md)[]

***

### notas

> **notas**: `string` \| `null`

***

### condiciones

> **condiciones**: `string` \| `null`

***

### emisorNombre

> **emisorNombre**: `string` \| `null`

***

### emisorCargo

> **emisorCargo**: `string` \| `null`

***

### emisorTelefono

> **emisorTelefono**: `string` \| `null`

***

### emisorCorreo

> **emisorCorreo**: `string` \| `null`

***

### rfc

> **rfc**: `string` \| `null`

***

### contactoNombre

> **contactoNombre**: `string` \| `null`

***

### contactoCorreo

> **contactoCorreo**: `string` \| `null`

***

### contactoTelefono

> **contactoTelefono**: `string` \| `null`

***

### origenCalculadora

> **origenCalculadora**: `boolean`

***

### parametrosCompac

> **parametrosCompac**: `Record`\<`string`, `unknown`\> \| `null`

***

### creadoPorUid

> `readonly` **creadoPorUid**: `string` \| `null`

***

### createdAt

> `readonly` **createdAt**: `Date`

***

### updatedAt

> **updatedAt**: `Date`

## Accessors

### subtotal

#### Get Signature

> **get** **subtotal**(): `number`

##### Returns

`number`

***

### iva

#### Get Signature

> **get** **iva**(): `number`

##### Returns

`number`

***

### total

#### Get Signature

> **get** **total**(): `number`

##### Returns

`number`

***

### venceEl

#### Get Signature

> **get** **venceEl**(): `Date`

##### Returns

`Date`

## Methods

### cambiarEstado()

> **cambiarEstado**(`nuevo`, `ahora`): `void`

#### Parameters

##### nuevo

[`EstadoCotizacion`](../type-aliases/EstadoCotizacion.md)

##### ahora

`Date`

#### Returns

`void`

***

### reemplazarConceptos()

> **reemplazarConceptos**(`conceptos`, `ahora`): `void`

#### Parameters

##### conceptos

[`ConceptoCotizacion`](../interfaces/ConceptoCotizacion.md)[]

##### ahora

`Date`

#### Returns

`void`

***

### actualizarDatosGenerales()

> **actualizarDatosGenerales**(`datos`, `condiciones`, `ahora`): `void`

Actualiza los datos generales (emisor / receptor) y las condiciones comerciales.

#### Parameters

##### datos

[`DatosGeneralesCotizacion`](../interfaces/DatosGeneralesCotizacion.md)

##### condiciones

`string` \| `null` \| `undefined`

##### ahora

`Date`

#### Returns

`void`
