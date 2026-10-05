[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ArticuloKB](../README.md) / coincideTexto

# Function: coincideTexto()

> **coincideTexto**(`articulo`, `texto`, `fraseExacta`): `boolean`

¿El artículo coincide con una búsqueda? Busca en nombre, ruta (empresa/subcarpetas), tags y
contenido, sin distinguir mayúsculas ni acentos. Por defecto (`fraseExacta=false`) exige que
CADA palabra aparezca en algún lado; con `fraseExacta=true`, la frase completa en un campo.

## Parameters

### articulo

[`ArticuloKB`](../classes/ArticuloKB.md)

### texto

`string`

### fraseExacta

`boolean`

## Returns

`boolean`
