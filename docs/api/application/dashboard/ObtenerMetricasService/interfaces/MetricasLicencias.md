[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/dashboard/ObtenerMetricasService](../README.md) / MetricasLicencias

# Interface: MetricasLicencias

Resumen de licencias en riesgo para el banner y la tarjeta de "avisos pendientes".

## Properties

### empresasEnRiesgo

> **empresasEnRiesgo**: `number`

Empresas activas con al menos una licencia vencida o por vencer.

***

### vencidas

> **vencidas**: `number`

Total de licencias vencidas (todas las empresas).

***

### porVencer

> **porVencer**: `number`

Total de licencias por vencer (dentro del umbral de aviso).

***

### avisosPendientes

> **avisosPendientes**: `number`

Empresas con algo que avisar: licencia en riesgo o versión desactualizada.

***

### banner

> **banner**: `object`[]

Empresas más urgentes para el banner (máx. 5).

#### empresaId

> **empresaId**: `string`

#### nombre

> **nombre**: `string`

#### vencidas

> **vencidas**: `number`

#### porVencer

> **porVencer**: `number`

#### diasMin

> **diasMin**: `number`
