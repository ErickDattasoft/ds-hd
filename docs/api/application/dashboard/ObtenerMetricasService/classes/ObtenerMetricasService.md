[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/dashboard/ObtenerMetricasService](../README.md) / ObtenerMetricasService

# Class: ObtenerMetricasService

Defined in: application/dashboard/ObtenerMetricasService.ts:26

Caso de uso: métricas del dashboard, acotadas al alcance del actor.

## Constructors

### Constructor

> **new ObtenerMetricasService**(`ticketQueries`, `cotizaciones`, `eventos`, `tareas`, `bitacora`, `clock`): `ObtenerMetricasService`

Defined in: application/dashboard/ObtenerMetricasService.ts:27

#### Parameters

##### ticketQueries

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### cotizaciones

[`ICotizacionRepository`](../../../../core/ports/repositories/ICotizacionRepository/interfaces/ICotizacionRepository.md)

##### eventos

[`IEventoRepository`](../../../../core/ports/repositories/IEventoRepository/interfaces/IEventoRepository.md)

##### tareas

[`ITareaRepository`](../../../../core/ports/repositories/ISeguimientoRepository/interfaces/ITareaRepository.md)

##### bitacora

[`IBitacoraRepository`](../../../../core/ports/repositories/IBitacoraRepository/interfaces/IBitacoraRepository.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`ObtenerMetricasService`

## Methods

### ejecutar()

> **ejecutar**(`actor`): `Promise`\<[`Metricas`](../interfaces/Metricas.md)\>

Defined in: application/dashboard/ObtenerMetricasService.ts:36

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<[`Metricas`](../interfaces/Metricas.md)\>
