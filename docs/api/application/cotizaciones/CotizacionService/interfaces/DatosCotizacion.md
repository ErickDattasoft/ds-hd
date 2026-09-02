[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/cotizaciones/CotizacionService](../README.md) / DatosCotizacion

# Interface: DatosCotizacion

Defined in: application/cotizaciones/CotizacionService.ts:12

Datos para crear una cotización (folio y montos se calculan en el servicio).

## Properties

### empresaId

> **empresaId**: `string`

Defined in: application/cotizaciones/CotizacionService.ts:13

***

### contactoId?

> `optional` **contactoId?**: `string`

Defined in: application/cotizaciones/CotizacionService.ts:14

***

### vigenciaDias?

> `optional` **vigenciaDias?**: `number`

Defined in: application/cotizaciones/CotizacionService.ts:15

***

### notas?

> `optional` **notas?**: `string`

Defined in: application/cotizaciones/CotizacionService.ts:16

***

### conceptos

> **conceptos**: [`ConceptoCotizacion`](../../../../core/entities/Cotizacion/interfaces/ConceptoCotizacion.md)[]

Defined in: application/cotizaciones/CotizacionService.ts:17

***

### origenCalculadora?

> `optional` **origenCalculadora?**: `boolean`

Defined in: application/cotizaciones/CotizacionService.ts:18

***

### parametrosCompac?

> `optional` **parametrosCompac?**: `Record`\<`string`, `unknown`\> \| `null`

Defined in: application/cotizaciones/CotizacionService.ts:19
