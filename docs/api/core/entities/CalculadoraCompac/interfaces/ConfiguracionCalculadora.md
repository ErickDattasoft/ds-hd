[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/CalculadoraCompac](../README.md) / ConfiguracionCalculadora

# Interface: ConfiguracionCalculadora

Catálogo completo de precios que consume [CalculadoraCompac](../classes/CalculadoraCompac.md).

## Properties

### sistemas

> **sistemas**: [`SistemaCompac`](SistemaCompac.md)[]

***

### sql

> **sql**: `object`

SQL se cobra como complemento por equipo (no participa en la regla "1º + adicionales").
`precioServidor` aplica a equipos Servidor; `precioTerminal` a Terminales.

#### clave

> **clave**: `string`

#### nombre

> **nombre**: `string`

#### precioServidor

> **precioServidor**: `number`

#### precioTerminal

> **precioTerminal**: `number`

***

### ivaTasa

> **ivaTasa**: `number`

***

### moneda

> **moneda**: `string`
