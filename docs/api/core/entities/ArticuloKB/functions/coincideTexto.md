[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ArticuloKB](../README.md) / coincideTexto

# Function: coincideTexto()

> **coincideTexto**(`articulo`, `texto`, `fraseExacta`): `boolean`

¿El artículo coincide con una búsqueda de texto? Busca en título, cuerpo y tags.
Por defecto (`fraseExacta=false`) exige que CADA palabra de `texto` aparezca en algún lado
(más laxo, mejor recall); con `fraseExacta=true` exige la frase completa como substring
contiguo en un solo campo (más estricto).

## Parameters

### articulo

[`ArticuloKB`](../classes/ArticuloKB.md)

### texto

`string`

### fraseExacta

`boolean`

## Returns

`boolean`
