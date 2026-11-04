[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/dashboard/CumpleanosService](../README.md) / CumpleanosService

# Class: CumpleanosService

Cumpleaños de contactos y aniversarios de empresas de hoy y los próximos días, para el tablero.
Consulta solo los que caen en esas fechas (por su mes-día), no toda la cartera: cuida la cuota.

## Constructors

### Constructor

> **new CumpleanosService**(`contactos`, `empresas`, `clock`): `CumpleanosService`

#### Parameters

##### contactos

[`IContactoRepository`](../../../../core/ports/repositories/IContactoRepository/interfaces/IContactoRepository.md)

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`CumpleanosService`

## Methods

### proximos()

> **proximos**(`actor`): `Promise`\<[`FechaEspecial`](../interfaces/FechaEspecial.md)[]\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<[`FechaEspecial`](../interfaces/FechaEspecial.md)[]\>
