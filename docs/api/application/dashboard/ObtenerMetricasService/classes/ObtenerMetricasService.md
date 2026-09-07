[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/dashboard/ObtenerMetricasService](../README.md) / ObtenerMetricasService

# Class: ObtenerMetricasService

Caso de uso: métricas del dashboard, acotadas al alcance del actor.

## Constructors

### Constructor

> **new ObtenerMetricasService**(`ticketQueries`, `cotizaciones`, `eventos`, `tareas`, `bitacora`, `clock`, `empresas`, `versiones`): `ObtenerMetricasService`

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

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### versiones

[`IVersionRepository`](../../../../core/ports/repositories/IVersionRepository/interfaces/IVersionRepository.md)

#### Returns

`ObtenerMetricasService`

## Methods

### ejecutar()

> **ejecutar**(`actor`): `Promise`\<[`Metricas`](../interfaces/Metricas.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<[`Metricas`](../interfaces/Metricas.md)\>
