[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/DescargasContpaqi](../README.md) / UltimaVersionContpaqi

# Interface: UltimaVersionContpaqi

Lo más nuevo publicado para un sistema del catálogo, en el formato con el que se registra.

## Properties

### version

> **version**: `string`

"12.1.0 Sp 2" — mismo formato que se captura a mano (versión + el SP más alto).

***

### base

> **base**: `string`

La versión sin SP: "12.1.0".

***

### fecha

> **fecha**: `string`

Fecha y descarga de la versión (sin SP); si la página no la trae, las de lo más nuevo.

***

### linkDescarga

> **linkDescarga**: `string`

***

### linkCartaTecnica

> **linkCartaTecnica**: `string`

La carta técnica de la versión (los SP casi nunca traen; su *nota* técnica no se usa).

***

### titulo

> **titulo**: `string`

Título de la publicación más nueva, para que se vea de dónde salió.

***

### servicePacks

> **servicePacks**: [`SpContpaqi`](SpContpaqi.md)[]

Cada SP (o solución fuera de versión) de esa versión, de menor a mayor.
