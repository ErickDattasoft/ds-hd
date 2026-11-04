[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/DescargasContpaqi](../README.md) / PublicacionContpaqi

# Interface: PublicacionContpaqi

Una publicación de la página, ya interpretada.

## Properties

### titulo

> **titulo**: `string`

Título tal cual (sin etiquetas): "Service Pack 2 CONTPAQi Comercial Premium® 12.1.0".

***

### base

> **base**: `string`

Versión base "12.1.0" (del título; si no trae, del campo "Versión:").

***

### tipo

> **tipo**: `"version"` \| `"service_pack"` \| `"fuera_de_version"`

***

### sp

> **sp**: `number`

Número de service pack si el título lo dice ("Service Pack 2" → 2; "Service Pack" → 1).

***

### fecha

> **fecha**: `string`

AAAA-MM-DD; si la página solo da el mes, el día 01. Vacío si no trae fecha.

***

### linkDescarga

> **linkDescarga**: `string`

***

### linkCartaTecnica

> **linkCartaTecnica**: `string`
