[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / ticketDisponibleParaEquipo

# Function: ticketDisponibleParaEquipo()

> **ticketDisponibleParaEquipo**(`t`, `admins?`): `boolean`

¿Cualquier agente puede tomar el ticket? Si nadie lo tiene, o si su "Agente" es un admin y
todavía no se canalizó a nadie: es el caso normal de «un admin lo captura y luego se reparte»
(el Agente se queda con quien lo levantó). En cuanto se canaliza, ya es solo de esa persona.

## Parameters

### t

`TicketAsignacion`

### admins?

readonly `object`[] = `[]`

## Returns

`boolean`
