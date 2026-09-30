[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/CalculadoraCompac](../README.md) / CalculadoraCompac

# Class: CalculadoraCompac

Calculadora de licenciamiento Compac/CONTPAQi, idéntica al CRM viejo: por equipo se cobra
el precio del 1er sistema de su tipo más el adicional por cada sistema extra; SQL es un
renglón aparte y solo para Servidor. El IVA lo pone la cotización.

## Constructors

### Constructor

> **new CalculadoraCompac**(): `CalculadoraCompac`

#### Returns

`CalculadoraCompac`

## Methods

### calcularGrupo()

> `static` **calcularGrupo**(`grupo`, `config`): [`ResultadoGrupoCompac`](../interfaces/ResultadoGrupoCompac.md)

#### Parameters

##### grupo

[`GrupoCompac`](../interfaces/GrupoCompac.md)

##### config

[`ConfiguracionCalculadora`](../interfaces/ConfiguracionCalculadora.md)

#### Returns

[`ResultadoGrupoCompac`](../interfaces/ResultadoGrupoCompac.md)

***

### calcular()

> `static` **calcular**(`grupos`, `config`): [`ResultadoCalculadora`](../interfaces/ResultadoCalculadora.md)

#### Parameters

##### grupos

[`GrupoCompac`](../interfaces/GrupoCompac.md)[]

##### config

[`ConfiguracionCalculadora`](../interfaces/ConfiguracionCalculadora.md)

#### Returns

[`ResultadoCalculadora`](../interfaces/ResultadoCalculadora.md)
