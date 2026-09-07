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
