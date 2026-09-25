[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/migracion/importadores](../README.md) / OpcionesImportacion

# Interface: OpcionesImportacion

Cómo se reporta el avance y si se escribe de verdad.

## Properties

### dryRun

> **dryRun**: `boolean`

`true` = simulacro: se recorre y valida todo, pero no se escribe nada.

***

### log

> **log**: (`paso`, `msg`) => `void`

Recibe cada línea de avance (la consola en el script, el resumen HTML en la UI).

#### Parameters

##### paso

`string`

##### msg

`string`

#### Returns

`void`
