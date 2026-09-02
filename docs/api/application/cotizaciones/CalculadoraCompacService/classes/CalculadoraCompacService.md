[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/cotizaciones/CalculadoraCompacService](../README.md) / CalculadoraCompacService

# Class: CalculadoraCompacService

Defined in: application/cotizaciones/CalculadoraCompacService.ts:10

Caso de uso: calcular el licenciamiento Compac con la configuración vigente.

## Constructors

### Constructor

> **new CalculadoraCompacService**(`config`): `CalculadoraCompacService`

Defined in: application/cotizaciones/CalculadoraCompacService.ts:11

#### Parameters

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

#### Returns

`CalculadoraCompacService`

## Methods

### config\_()

> **config\_**(): `Promise`\<[`ConfiguracionCalculadora`](../../../../core/entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)\>

Defined in: application/cotizaciones/CalculadoraCompacService.ts:13

#### Returns

`Promise`\<[`ConfiguracionCalculadora`](../../../../core/entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)\>

***

### calcular()

> **calcular**(`equipos`): `Promise`\<[`ResultadoCalculadora`](../../../../core/entities/CalculadoraCompac/interfaces/ResultadoCalculadora.md) & `object`\>

Defined in: application/cotizaciones/CalculadoraCompacService.ts:17

#### Parameters

##### equipos

[`EquipoInput`](../../../../core/entities/CalculadoraCompac/interfaces/EquipoInput.md)[]

#### Returns

`Promise`\<[`ResultadoCalculadora`](../../../../core/entities/CalculadoraCompac/interfaces/ResultadoCalculadora.md) & `object`\>
