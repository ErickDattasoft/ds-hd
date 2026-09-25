[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/migracion/lib](../README.md) / hashId

# Function: hashId()

> **hashId**(`prefijo`, ...`partes`): `Promise`\<`string`\>

Id determinista corto a partir de campos que identifican el registro (el respaldo viejo no
trae ids propios) — así reimportar no duplica nada.

Es SHA-1 por WebCrypto, que da exactamente el mismo hexadecimal que el `node:crypto` que
usaba el script antes: los ids generados aquí siguen coincidiendo con los de la migración
que ya corrió contra el proyecto real, y por eso reimportar sigue siendo un no-op.

## Parameters

### prefijo

`string`

### partes

...`string`[]

## Returns

`Promise`\<`string`\>
