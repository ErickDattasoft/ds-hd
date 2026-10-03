[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / nombresCoinciden

# Function: nombresCoinciden()

> **nombresCoinciden**(`a`, `b`): `boolean`

¿Dos nombres se refieren a la misma persona? "DIEGO" = "Diego Armando" = "diego armando": todas
las palabras del más corto están en el más largo (el CRM viejo guarda unas veces el nombre
corto y otras el completo). Por palabras, no por subcadena, para que "Ana" no calce "Mariana".

## Parameters

### a

`string` \| `null` \| `undefined`

### b

`string` \| `null` \| `undefined`

## Returns

`boolean`
