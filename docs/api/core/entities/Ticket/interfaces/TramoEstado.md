[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / TramoEstado

# Interface: TramoEstado

Un tramo de la línea de tiempo del ticket: cuánto estuvo en un estado y si ese tiempo cuenta.

## Properties

### estado

> **estado**: `string`

***

### desde

> **desde**: `Date`

***

### hasta

> **hasta**: `Date`

***

### ms

> **ms**: `number`

***

### cuenta

> **cuenta**: `boolean`

`false` para tramos en espera (Abierto/Pendiente) o finales — no suman al tiempo trabajado.
