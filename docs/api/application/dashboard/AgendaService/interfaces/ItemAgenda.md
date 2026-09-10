[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/dashboard/AgendaService](../README.md) / ItemAgenda

# Interface: ItemAgenda

Un elemento agendado en un día del calendario.

## Properties

### tipo

> **tipo**: `"ticket"` \| `"evento"` \| `"tarea"`

***

### id

> **id**: `string`

***

### titulo

> **titulo**: `string`

***

### hora

> **hora**: `string` \| `null`

`HH:MM` local, o `null` si es todo el día (tareas).

***

### href

> **href**: `string`

***

### orden

> **orden**: `number`

Orden dentro del día (por hora; las tareas van al final).
