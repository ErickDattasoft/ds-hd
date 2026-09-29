[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/cotizaciones/CotizacionService](../README.md) / DatosCotizacion

# Interface: DatosCotizacion

Datos para crear una cotización (folio y montos se calculan en el servicio).

## Extends

- [`DatosGeneralesCotizacion`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md)

## Properties

### empresaId

> **empresaId**: `string`

***

### contactoId?

> `optional` **contactoId?**: `string`

***

### vigenciaDias?

> `optional` **vigenciaDias?**: `number`

***

### notas?

> `optional` **notas?**: `string`

***

### condiciones?

> `optional` **condiciones?**: `string`

***

### conceptos

> **conceptos**: [`ConceptoCotizacion`](../../../../core/entities/Cotizacion/interfaces/ConceptoCotizacion.md)[]

***

### origenCalculadora?

> `optional` **origenCalculadora?**: `boolean`

***

### parametrosCompac?

> `optional` **parametrosCompac?**: `Record`\<`string`, `unknown`\> \| `null`

***

### fecha?

> `optional` **fecha?**: `Date`

Fecha de emisión; por defecto, hoy.

***

### ticketId?

> `optional` **ticketId?**: `string`

Ticket desde el que se cotiza («🧾 Cotizar» en su detalle): queda ligada a él.

***

### ticketNumero?

> `optional` **ticketNumero?**: `number`

***

### emisorNombre?

> `optional` **emisorNombre?**: `string` \| `null`

Emisor — quien elabora la cotización.

#### Inherited from

[`DatosGeneralesCotizacion`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md).[`emisorNombre`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md#emisornombre)

***

### emisorCargo?

> `optional` **emisorCargo?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md).[`emisorCargo`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md#emisorcargo)

***

### emisorTelefono?

> `optional` **emisorTelefono?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md).[`emisorTelefono`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md#emisortelefono)

***

### emisorCorreo?

> `optional` **emisorCorreo?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md).[`emisorCorreo`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md#emisorcorreo)

***

### rfc?

> `optional` **rfc?**: `string` \| `null`

Receptor — datos fiscales/de contacto de la empresa.

#### Inherited from

[`DatosGeneralesCotizacion`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md).[`rfc`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md#rfc)

***

### contactoNombre?

> `optional` **contactoNombre?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md).[`contactoNombre`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md#contactonombre)

***

### contactoCorreo?

> `optional` **contactoCorreo?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md).[`contactoCorreo`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md#contactocorreo)

***

### contactoTelefono?

> `optional` **contactoTelefono?**: `string` \| `null`

#### Inherited from

[`DatosGeneralesCotizacion`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md).[`contactoTelefono`](../../../../core/entities/Cotizacion/interfaces/DatosGeneralesCotizacion.md#contactotelefono)
