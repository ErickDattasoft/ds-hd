[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/historialCorreo](../README.md) / historialActividadHtml

# Function: historialActividadHtml()

> **historialActividadHtml**(`eventos`, `modo`): `string`

Bloque HTML con la bitácora del ticket para incrustar al pie de un correo.
`modo: 'cliente'` filtra a creación / cambios de estado / reasignaciones (con el nombre del
agente); `modo: 'interno'` muestra todo. Devuelve `''` si no hay nada que mostrar.

## Parameters

### eventos

readonly [`EventoTicket`](../../../../core/entities/NotaTicket/interfaces/EventoTicket.md)[]

### modo

`"cliente"` \| `"interno"`

## Returns

`string`
