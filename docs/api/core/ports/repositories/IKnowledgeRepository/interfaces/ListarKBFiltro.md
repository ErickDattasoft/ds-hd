[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IKnowledgeRepository](../README.md) / ListarKBFiltro

# Interface: ListarKBFiltro

Filtros para listar artículos de la base de conocimiento.

## Properties

### categoria?

> `optional` **categoria?**: `string`

***

### publicado?

> `optional` **publicado?**: `boolean`

***

### texto?

> `optional` **texto?**: `string`

***

### fraseExacta?

> `optional` **fraseExacta?**: `boolean`

Si viene junto a `texto`: exige la frase completa como substring contiguo (en vez de
exigir cada palabra por separado, más laxo).

***

### tag?

> `optional` **tag?**: `string`

Solo artículos que tengan este tag exacto.
