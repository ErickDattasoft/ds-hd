[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Cotizacion](../README.md) / ConceptoCotizacion

# Interface: ConceptoCotizacion

Una línea/renglón de una cotización.

## Properties

### descripcion

> **descripcion**: `string`

***

### cantidad

> **cantidad**: `number`

***

### precioUnitario

> **precioUnitario**: `number`

***

### descuento

> **descuento**: `number`

Descuento de la línea, en porcentaje (0-100).

***

### importe

> **importe**: `number`

cantidad * precioUnitario * (1 - descuento/100) (se recalcula al guardar).
