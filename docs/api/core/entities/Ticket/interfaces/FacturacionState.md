[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / FacturacionState

# Interface: FacturacionState

Estado de facturación de un ticket.

## Properties

### requiere

> **requiere**: `boolean`

Si el tipo de ticket amerita facturación (p. ej. consultorías).

***

### estado

> **estado**: `"no_facturado"` \| `"facturado"` \| `"no_aplica"` \| `"factura_mensual"` \| `"consulta_sin_costo"`

Catálogo fijo: no_facturado/facturado/no_aplica/factura_mensual/consulta_sin_costo.

***

### notificadaEn

> **notificadaEn**: `Date` \| `null`
