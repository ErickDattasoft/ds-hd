[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IEmpresaRepository](../README.md) / IEmpresaRepository

# Interface: IEmpresaRepository

Persistencia de empresas (`empresas/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Empresa`](../../../../entities/Empresa/classes/Empresa.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Empresa`](../../../../entities/Empresa/classes/Empresa.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`Empresa`](../../../../entities/Empresa/classes/Empresa.md)[]\>

#### Parameters

##### filtro?

[`ListarEmpresasFiltro`](ListarEmpresasFiltro.md)

#### Returns

`Promise`\<[`Empresa`](../../../../entities/Empresa/classes/Empresa.md)[]\>

***

### contar()

> **contar**(`soloActivas?`): `Promise`\<`number`\>

Cuántas hay, sin traerlas: lo resuelve el servidor con un conteo agregado.

#### Parameters

##### soloActivas?

`boolean`

#### Returns

`Promise`\<`number`\>

***

### guardarVarias()

> **guardarVarias**(`empresas`): `Promise`\<`void`\>

Guarda muchas de golpe (importaciones), agrupando las llamadas.

#### Parameters

##### empresas

[`Empresa`](../../../../entities/Empresa/classes/Empresa.md)[]

#### Returns

`Promise`\<`void`\>

***

### eliminarVarias()

> **eliminarVarias**(`ids`): `Promise`\<`void`\>

Borra muchas de golpe, agrupando las llamadas.

#### Parameters

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>

***

### save()

> **save**(`empresa`): `Promise`\<`void`\>

#### Parameters

##### empresa

[`Empresa`](../../../../entities/Empresa/classes/Empresa.md)

#### Returns

`Promise`\<`void`\>

***

### eliminar()

> **eliminar**(`id`): `Promise`\<`void`\>

Borrado permanente (solo desde la papelera).

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### existePorNombre()

> **existePorNombre**(`nombre`, `exceptoId?`): `Promise`\<`boolean`\>

#### Parameters

##### nombre

`string`

##### exceptoId?

`string`

#### Returns

`Promise`\<`boolean`\>
