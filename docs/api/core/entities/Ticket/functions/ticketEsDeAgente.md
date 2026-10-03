[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / ticketEsDeAgente

# Function: ticketEsDeAgente()

> **ticketEsDeAgente**(`t`, `agente`): `boolean`

¿El ticket es de este agente? Por uid, o por nombre en "Agente" o en "Canalizado a" — los
tickets migrados del CRM viejo solo traen el nombre (sin uid), y allá la mayoría se asignaba
escribiendo a la persona en "Canalizado a".

## Parameters

### t

`TicketAsignacion`

### agente

#### uid

`string`

#### nombre

`string`

## Returns

`boolean`
