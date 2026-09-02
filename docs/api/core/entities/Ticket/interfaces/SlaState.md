[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / SlaState

# Interface: SlaState

Defined in: core/entities/Ticket.ts:22

Estado del "reloj" de SLA de un ticket, con soporte de pausa.

## Properties

### horasResolucion

> **horasResolucion**: `number`

Defined in: core/entities/Ticket.ts:24

Horas objetivo de resolución (según prioridad al crear; no se recalcula sola).

***

### pausadoDesde

> **pausadoDesde**: `Date` \| `null`

Defined in: core/entities/Ticket.ts:26

Momento desde el que el SLA está pausado (estado "pendiente"), o null.

***

### msPausadoTotal

> **msPausadoTotal**: `number`

Defined in: core/entities/Ticket.ts:28

Milisegundos acumulados en pausa.
