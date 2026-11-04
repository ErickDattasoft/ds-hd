[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/DescargasContpaqi](../README.md) / ultimaVersionDe

# Function: ultimaVersionDe()

> **ultimaVersionDe**(`sistema`, `publicaciones`): [`UltimaVersionContpaqi`](../interfaces/UltimaVersionContpaqi.md) \| `null`

Lo más nuevo de un sistema. Las "Soluciones fuera de versión" se cuentan como service pack
de la última versión normal anterior (así se registran: SFV 19.2.2 de Nóminas = "19.2.1 Sp 1").

## Parameters

### sistema

`string`

### publicaciones

[`PublicacionContpaqi`](../interfaces/PublicacionContpaqi.md)[]

## Returns

[`UltimaVersionContpaqi`](../interfaces/UltimaVersionContpaqi.md) \| `null`
