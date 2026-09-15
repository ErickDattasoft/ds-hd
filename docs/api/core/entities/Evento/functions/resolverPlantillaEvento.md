[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Evento](../README.md) / resolverPlantillaEvento

# Function: resolverPlantillaEvento()

> **resolverPlantillaEvento**(`evento`, `inscrito`): `string`

Resuelve la plantilla de CONFIRMACIÓN del evento (o [PLANTILLA\_EVENTO\_DEFAULT](../variables/PLANTILLA_EVENTO_DEFAULT.md) si no
 tiene una propia) — usada tanto por el correo automático como por el botón manual de
 WhatsApp por inscrito.

## Parameters

### evento

`Pick`\<[`Evento`](../classes/Evento.md), `"titulo"` \| `"fechaHora"` \| `"sistema"` \| `"urlWebinar"` \| `"contactoNombre"` \| `"contactoWhatsapp"` \| `"plantilla"`\>

### inscrito

#### nombre

`string`

## Returns

`string`
