[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/dashboard/ObtenerMetricasService](../README.md) / MetricasLicencias

# Interface: MetricasLicencias

Resumen de licencias en riesgo para el banner y la tarjeta de "avisos pendientes".

## Properties

### totalEmpresas

> **totalEmpresas**: `number`

Total de empresas activas (para el stat del dashboard).

***

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

Empresas con versiones desactualizadas que AÚN NO se avisaron (el «🔔 Avisos pendientes» del
viejo, que abre el mismo filtro que su botón en Empresas).

***

### proximas90

> **proximas90**: `object`[]

Licencias que vencen en los próximos 90 días (lista del dashboard del viejo), máx. 6.

#### empresaId

> **empresaId**: `string`

#### empresa

> **empresa**: `string`

#### sistema

> **sistema**: `string`

#### dias

> **dias**: `number`

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
