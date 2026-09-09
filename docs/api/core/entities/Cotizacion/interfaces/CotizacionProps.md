[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Cotizacion](../README.md) / CotizacionProps

# Interface: CotizacionProps

Props para construir una [Cotizacion](../classes/Cotizacion.md).

## Extends

- [`DatosGeneralesCotizacion`](DatosGeneralesCotizacion.md)

## Properties

### emisorNombre?

> `optional` **emisorNombre?**: `string` \| `null`

Emisor — quien elabora la cotización.

#### Inherited from

[`DatosGeneralesCotizacion`](DatosGeneralesCotizacion.md).[`emisorNombre`](DatosGeneralesCotizacion.md#emisornombre)

***

### emisorCargo?

> `optional` **emisorCargo?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](DatosGeneralesCotizacion.md).[`emisorCargo`](DatosGeneralesCotizacion.md#emisorcargo)

***

### emisorTelefono?

> `optional` **emisorTelefono?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](DatosGeneralesCotizacion.md).[`emisorTelefono`](DatosGeneralesCotizacion.md#emisortelefono)

***

### emisorCorreo?

> `optional` **emisorCorreo?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](DatosGeneralesCotizacion.md).[`emisorCorreo`](DatosGeneralesCotizacion.md#emisorcorreo)

***

### rfc?

> `optional` **rfc?**: `string` \| `null`

Receptor — datos fiscales/de contacto de la empresa.

#### Inherited from

[`DatosGeneralesCotizacion`](DatosGeneralesCotizacion.md).[`rfc`](DatosGeneralesCotizacion.md#rfc)

***

### contactoNombre?

> `optional` **contactoNombre?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](DatosGeneralesCotizacion.md).[`contactoNombre`](DatosGeneralesCotizacion.md#contactonombre)

***

### contactoCorreo?

> `optional` **contactoCorreo?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](DatosGeneralesCotizacion.md).[`contactoCorreo`](DatosGeneralesCotizacion.md#contactocorreo)

***

### contactoTelefono?

> `optional` **contactoTelefono?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](DatosGeneralesCotizacion.md).[`contactoTelefono`](DatosGeneralesCotizacion.md#contactotelefono)

***

### id

> **id**: `string`

***

### folio

> **folio**: `string`

***

### empresaId

> **empresaId**: `string`

***

### empresaNombre?

> `optional` **empresaNombre?**: `string` \| `null`

***

### contactoId?

> `optional` **contactoId?**: `string` \| `null`

***

### fecha

> **fecha**: `Date`

***

### vigenciaDias?

> `optional` **vigenciaDias?**: `number`

***

### estado?

> `optional` **estado?**: [`EstadoCotizacion`](../type-aliases/EstadoCotizacion.md)

***

### moneda?

> `optional` **moneda?**: `string`

***

### ivaTasa?

> `optional` **ivaTasa?**: `number`

***

### conceptos?

> `optional` **conceptos?**: [`ConceptoCotizacion`](ConceptoCotizacion.md)[]

***

### notas?

> `optional` **notas?**: `string` \| `null`

***

### condiciones?

> `optional` **condiciones?**: `string` \| `null`

Condiciones / términos comerciales (forma de pago, tiempos de entrega…).

***

### origenCalculadora?

> `optional` **origenCalculadora?**: `boolean`

***

### parametrosCompac?

> `optional` **parametrosCompac?**: `Record`\<`string`, `unknown`\> \| `null`

***

### creadoPorUid?

> `optional` **creadoPorUid?**: `string` \| `null`

***

### createdAt?

> `optional` **createdAt?**: `Date`

***

### updatedAt?

> `optional` **updatedAt?**: `Date`
