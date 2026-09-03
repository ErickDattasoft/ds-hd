[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ConfiguracionTickets](../README.md) / ConfiguracionTickets

# Interface: ConfiguracionTickets

Catálogos configurables del módulo de tickets (documento `configuracion/tickets`).

## Properties

### tipos

> **tipos**: `string`[]

***

### sistemas

> **sistemas**: `string`[]

***

### grupos

> **grupos**: `string`[]

***

### estados

> **estados**: `string`[]

***

### prioridades

> **prioridades**: `string`[]

***

### slaHoras

> **slaHoras**: `Record`\<`string`, `number`\>

Horas objetivo de SLA por prioridad.

***

### tiposFacturables

> **tiposFacturables**: `string`[]

Tipos de ticket que ameritan facturación.

***

### estadoInicial

> **estadoInicial**: `string`

Estado con el que nace un ticket nuevo.

***

### correosNotificacion

> **correosNotificacion**: `string`[]

Correos que se notifican al llegar un ticket del portal público.
