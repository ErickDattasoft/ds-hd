[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/cotizaciones/CalculadoraCompacService](../README.md) / CalculadoraCompacService

# Class: CalculadoraCompacService

Caso de uso: calcular el licenciamiento Compac con la configuración vigente.

## Constructors

### Constructor

> **new CalculadoraCompacService**(`config`): `CalculadoraCompacService`

#### Parameters

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

#### Returns

`CalculadoraCompacService`

## Methods

### config\_()

> **config\_**(): `Promise`\<[`ConfiguracionCalculadora`](../../../../core/entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)\>

#### Returns

`Promise`\<[`ConfiguracionCalculadora`](../../../../core/entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)\>

***

### calcular()

> **calcular**(`equipos`): `Promise`\<[`ResultadoCalculadora`](../../../../core/entities/CalculadoraCompac/interfaces/ResultadoCalculadora.md) & `object`\>

#### Parameters

##### equipos

[`EquipoInput`](../../../../core/entities/CalculadoraCompac/interfaces/EquipoInput.md)[]

#### Returns

`Promise`\<[`ResultadoCalculadora`](../../../../core/entities/CalculadoraCompac/interfaces/ResultadoCalculadora.md) & `object`\>
