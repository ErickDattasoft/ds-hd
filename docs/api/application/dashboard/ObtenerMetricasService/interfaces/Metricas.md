[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/dashboard/ObtenerMetricasService](../README.md) / Metricas

# Interface: Metricas

Snapshot de métricas del dashboard, ya acotado al alcance de permisos del actor.

## Properties

### tickets

> **tickets**: `object`

#### abiertos

> **abiertos**: `number`

#### vencidos

> **vencidos**: `number`

#### sinAsignar

> **sinAsignar**: `number`

#### creadosSemana

> **creadosSemana**: `number`

#### porEstado

> **porEstado**: `object`[]

#### porPrioridad

> **porPrioridad**: `object`[]

#### porMes

> **porMes**: `object`[]

#### total

> **total**: `number`

Todos los tickets (fuera de la papelera) y su conteo por estado, para las tarjetas.

#### porEstadoTodos

> **porEstadoTodos**: `object`[]

#### recientes

> **recientes**: `object`[]

#### viejos

> **viejos**: `object`[]

Abiertos desde hace 5 días o más, los más viejos primero (máx. 6).

***

### contactosTotal

> **contactosTotal**: `number` \| `null`

Total de contactos activos; `null` si no hay repositorio o permiso.

***

### tareasPendientes

> **tareasPendientes**: `object`[]

Tareas pendientes de todo el equipo, las que vencen primero (máx. 8).

#### id

> **id**: `string`

#### titulo

> **titulo**: `string`

#### empresaId

> **empresaId**: `string` \| `null`

#### vence

> **vence**: `string` \| `null`

#### asignadoANombre

> **asignadoANombre**: `string` \| `null`

***

### cotizaciones

> **cotizaciones**: `object`

#### porEstado

> **porEstado**: `object`[]

#### totalAbiertas

> **totalAbiertas**: `number`

***

### misTareasPendientes

> **misTareasPendientes**: `number`

***

### ticketsPublicosPendientes

> **ticketsPublicosPendientes**: `number`

Tickets del buzón público a la espera de aceptar/rechazar (`0` si el actor no ve el buzón).

***

### proximosEventos

> **proximosEventos**: `object`[]

#### id

> **id**: `string`

#### titulo

> **titulo**: `string`

#### fechaHora

> **fechaHora**: `Date`

***

### actividadReciente

> **actividadReciente**: `object`[]

#### at

> **at**: `Date`

#### resumen

> **resumen**: `string`

#### actorNombre

> **actorNombre**: `string` \| `null`

#### modulo

> **modulo**: `string`

***

### licencias

> **licencias**: [`MetricasLicencias`](MetricasLicencias.md) \| `null`

`null` si el actor no puede leer empresas.
