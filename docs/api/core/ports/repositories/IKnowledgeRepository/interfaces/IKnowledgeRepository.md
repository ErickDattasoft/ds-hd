[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IKnowledgeRepository](../README.md) / IKnowledgeRepository

# Interface: IKnowledgeRepository

Persistencia de la base de conocimiento (`knowledge_base/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md) \| `null`\>

***

### findBySlug()

> **findBySlug**(`slug`): `Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md) \| `null`\>

#### Parameters

##### slug

`string`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md)[]\>

#### Parameters

##### filtro?

[`ListarKBFiltro`](ListarKBFiltro.md)

#### Returns

`Promise`\<[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md)[]\>

***

### save()

> **save**(`articulo`): `Promise`\<`void`\>

#### Parameters

##### articulo

[`ArticuloKB`](../../../../entities/ArticuloKB/classes/ArticuloKB.md)

#### Returns

`Promise`\<`void`\>

***

### eliminar()

> **eliminar**(`id`): `Promise`\<`void`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>
