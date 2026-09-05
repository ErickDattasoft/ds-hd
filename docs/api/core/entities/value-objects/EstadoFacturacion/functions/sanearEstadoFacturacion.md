[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/EstadoFacturacion](../README.md) / sanearEstadoFacturacion

# Function: sanearEstadoFacturacion()

> **sanearEstadoFacturacion**(`estado`, `facturadoLegacy`): `"no_facturado"` \| `"facturado"` \| `"no_aplica"` \| `"factura_mensual"` \| `"consulta_sin_costo"`

Normaliza el estado leído de props/Firestore, con respaldo al esquema viejo
(`facturacion.facturado: boolean`, sin `estado`) para no romper tickets ya guardados.

## Parameters

### estado

`unknown`

### facturadoLegacy

`unknown`

## Returns

`"no_facturado"` \| `"facturado"` \| `"no_aplica"` \| `"factura_mensual"` \| `"consulta_sin_costo"`
