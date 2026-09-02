[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ConfiguracionTickets](../README.md) / ConfiguracionTickets

# Interface: ConfiguracionTickets

Defined in: core/entities/ConfiguracionTickets.ts:5

Catálogos configurables del módulo de tickets (documento `configuracion/tickets`).

## Properties

### tipos

> **tipos**: `string`[]

Defined in: core/entities/ConfiguracionTickets.ts:6

***

### sistemas

> **sistemas**: `string`[]

Defined in: core/entities/ConfiguracionTickets.ts:7

***

### grupos

> **grupos**: `string`[]

Defined in: core/entities/ConfiguracionTickets.ts:8

***

### estados

> **estados**: `string`[]

Defined in: core/entities/ConfiguracionTickets.ts:9

***

### prioridades

> **prioridades**: `string`[]

Defined in: core/entities/ConfiguracionTickets.ts:10

***

### slaHoras

> **slaHoras**: `Record`\<`string`, `number`\>

Defined in: core/entities/ConfiguracionTickets.ts:12

Horas objetivo de SLA por prioridad.

***

### tiposFacturables

> **tiposFacturables**: `string`[]

Defined in: core/entities/ConfiguracionTickets.ts:14

Tipos de ticket que ameritan facturación.

***

### estadoInicial

> **estadoInicial**: `string`

Defined in: core/entities/ConfiguracionTickets.ts:16

Estado con el que nace un ticket nuevo.

***

### correosNotificacion

> **correosNotificacion**: `string`[]

Defined in: core/entities/ConfiguracionTickets.ts:18

Correos que se notifican al llegar un ticket del portal público.
