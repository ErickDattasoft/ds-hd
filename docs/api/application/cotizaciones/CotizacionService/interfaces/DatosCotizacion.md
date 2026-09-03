[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/cotizaciones/CotizacionService](../README.md) / DatosCotizacion

# Interface: DatosCotizacion

Datos para crear una cotización (folio y montos se calculan en el servicio).

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

### conceptos

> **conceptos**: [`ConceptoCotizacion`](../../../../core/entities/Cotizacion/interfaces/ConceptoCotizacion.md)[]

***

### origenCalculadora?

> `optional` **origenCalculadora?**: `boolean`

***

### parametrosCompac?

> `optional` **parametrosCompac?**: `Record`\<`string`, `unknown`\> \| `null`
