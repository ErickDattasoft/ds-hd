[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IKnowledgeRepository](../README.md) / IKnowledgeRepository

# Interface: IKnowledgeRepository

Defined in: core/ports/repositories/IKnowledgeRepository.ts:11

Persistencia de la base de conocimiento (`knowledge_base/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md) \| `null`\>

Defined in: core/ports/repositories/IKnowledgeRepository.ts:12

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md) \| `null`\>

***

### findBySlug()

> **findBySlug**(`slug`): `Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md) \| `null`\>

Defined in: core/ports/repositories/IKnowledgeRepository.ts:13

#### Parameters

##### slug

`string`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md)[]\>

Defined in: core/ports/repositories/IKnowledgeRepository.ts:14

#### Parameters

##### filtro?

[`ListarKBFiltro`](ListarKBFiltro.md)

#### Returns

`Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md)[]\>

***

### save()

> **save**(`articulo`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IKnowledgeRepository.ts:15

#### Parameters

##### articulo

[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md)

#### Returns

`Promise`\<`void`\>

***

### eliminar()

> **eliminar**(`id`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IKnowledgeRepository.ts:16

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>
