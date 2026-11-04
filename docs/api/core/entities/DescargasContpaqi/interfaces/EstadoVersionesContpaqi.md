[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/DescargasContpaqi](../README.md) / EstadoVersionesContpaqi

# Interface: EstadoVersionesContpaqi

Lo último leído de la página (documento `configuracion/versionesContpaqi`).

## Properties

### revisado

> **revisado**: `string` \| `null`

ISO de la última lectura que salió bien; null = nunca.

***

### ultimas

> **ultimas**: `Record`\<`string`, [`UltimaVersionContpaqi`](UltimaVersionContpaqi.md)\>

Última versión publicada por sistema del catálogo (solo los que se encontraron).

***

### error

> **error**: `string`

Si la última lectura falló, por qué (vacío si salió bien).

***

### intentado

> **intentado**: `string` \| `null`

ISO del último intento (bien o mal), para no leer la página más de una vez al día.
