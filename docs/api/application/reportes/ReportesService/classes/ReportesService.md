[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/reportes/ReportesService](../README.md) / ReportesService

# Class: ReportesService

Reportes de desempeño del soporte en un rango de fechas (por fecha de creación del ticket).

## Constructors

### Constructor

> **new ReportesService**(`tickets`, `clock`): `ReportesService`

#### Parameters

##### tickets

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`ReportesService`

## Methods

### generar()

> **generar**(`actor`, `desde`, `hasta`): `Promise`\<[`Reporte`](../interfaces/Reporte.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### desde

`Date`

##### hasta

`Date`

#### Returns

`Promise`\<[`Reporte`](../interfaces/Reporte.md)\>

***

### csv()

> `static` **csv**(`titulo`, `filas`): `string`

CSV (Excel en español: separador `;`) de una sección del reporte.

#### Parameters

##### titulo

`string`

##### filas

[`FilaReporte`](../interfaces/FilaReporte.md)[]

#### Returns

`string`
