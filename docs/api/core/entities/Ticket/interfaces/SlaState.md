[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / SlaState

# Interface: SlaState

Estado del "reloj" de SLA de un ticket, con soporte de pausa.

## Properties

### horasResolucion

> **horasResolucion**: `number`

Horas objetivo de resolución (según prioridad al crear; no se recalcula sola).

***

### pausadoDesde

> **pausadoDesde**: `Date` \| `null`

Momento desde el que el SLA está pausado (estado "pendiente"), o null.

***

### msPausadoTotal

> **msPausadoTotal**: `number`

Milisegundos acumulados en pausa.
