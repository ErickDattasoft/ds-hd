[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IEmpresaRepository](../README.md) / IEmpresaRepository

# Interface: IEmpresaRepository

Defined in: core/ports/repositories/IEmpresaRepository.ts:10

Persistencia de empresas (`empresas/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Empresa`](../../../../entities/Empresa/classes/Empresa.md) \| `null`\>

Defined in: core/ports/repositories/IEmpresaRepository.ts:11

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Empresa`](../../../../entities/Empresa/classes/Empresa.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`Empresa`](../../../../entities/Empresa/classes/Empresa.md)[]\>

Defined in: core/ports/repositories/IEmpresaRepository.ts:12

#### Parameters

##### filtro?

[`ListarEmpresasFiltro`](ListarEmpresasFiltro.md)

#### Returns

`Promise`\<[`Empresa`](../../../../entities/Empresa/classes/Empresa.md)[]\>

***

### save()

> **save**(`empresa`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IEmpresaRepository.ts:13

#### Parameters

##### empresa

[`Empresa`](../../../../entities/Empresa/classes/Empresa.md)

#### Returns

`Promise`\<`void`\>

***

### existePorNombre()

> **existePorNombre**(`nombre`, `exceptoId?`): `Promise`\<`boolean`\>

Defined in: core/ports/repositories/IEmpresaRepository.ts:14

#### Parameters

##### nombre

`string`

##### exceptoId?

`string`

#### Returns

`Promise`\<`boolean`\>
