[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/CalculadoraCompac](../README.md) / CalculadoraCompac

# Class: CalculadoraCompac

Defined in: core/entities/CalculadoraCompac.ts:65

Calculadora de licenciamiento Compac/CONTPAQi. Regla base: en cada equipo, el sistema más
caro se cobra a "precioPrimero" y los demás a "precioAdicional". SQL es un complemento
aparte por equipo (según tipo).

## Constructors

### Constructor

> **new CalculadoraCompac**(): `CalculadoraCompac`

#### Returns

`CalculadoraCompac`

## Methods

### calcular()

> `static` **calcular**(`equipos`, `config`): [`ResultadoCalculadora`](../interfaces/ResultadoCalculadora.md)

Defined in: core/entities/CalculadoraCompac.ts:66

#### Parameters

##### equipos

[`EquipoInput`](../interfaces/EquipoInput.md)[]

##### config

[`ConfiguracionCalculadora`](../interfaces/ConfiguracionCalculadora.md)

#### Returns

[`ResultadoCalculadora`](../interfaces/ResultadoCalculadora.md)
