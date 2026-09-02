[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/EstadoTicket](../README.md) / validarTransicion

# Function: validarTransicion()

> **validarTransicion**(`desde`, `hacia`, `catalogo`): `void`

Defined in: core/entities/value-objects/EstadoTicket.ts:66

Valida una transición de estado. Regla simple y permisiva pero no absurda:
 - no se puede transicionar al mismo estado
 - desde `cerrado` solo se puede reabrir (a un no-final)
 - cualquier otra transición entre estados del catálogo es válida

## Parameters

### desde

`string`

### hacia

`string`

### catalogo

readonly `string`[]

## Returns

`void`
