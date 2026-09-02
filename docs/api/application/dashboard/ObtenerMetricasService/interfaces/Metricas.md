[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/dashboard/ObtenerMetricasService](../README.md) / Metricas

# Interface: Metricas

Defined in: application/dashboard/ObtenerMetricasService.ts:10

Snapshot de métricas del dashboard, ya acotado al alcance de permisos del actor.

## Properties

### tickets

> **tickets**: `object`

Defined in: application/dashboard/ObtenerMetricasService.ts:11

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

***

### cotizaciones

> **cotizaciones**: `object`

Defined in: application/dashboard/ObtenerMetricasService.ts:19

#### porEstado

> **porEstado**: `object`[]

#### totalAbiertas

> **totalAbiertas**: `number`

***

### misTareasPendientes

> **misTareasPendientes**: `number`

Defined in: application/dashboard/ObtenerMetricasService.ts:20

***

### proximosEventos

> **proximosEventos**: `object`[]

Defined in: application/dashboard/ObtenerMetricasService.ts:21

#### id

> **id**: `string`

#### titulo

> **titulo**: `string`

#### fechaHora

> **fechaHora**: `Date`

***

### actividadReciente

> **actividadReciente**: `object`[]

Defined in: application/dashboard/ObtenerMetricasService.ts:22

#### at

> **at**: `Date`

#### resumen

> **resumen**: `string`

#### actorNombre

> **actorNombre**: `string` \| `null`

#### modulo

> **modulo**: `string`
