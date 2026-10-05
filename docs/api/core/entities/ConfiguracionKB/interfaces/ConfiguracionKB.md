[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ConfiguracionKB](../README.md) / ConfiguracionKB

# Interface: ConfiguracionKB

Config de la base de conocimiento (documento `configuracion/kb`). Como el panel «👥 Acceso»
del CRM viejo: quién la ve NO depende del rol (un admin puede no verla); lo decide solo el
propietario, persona por persona.

## Properties

### acceso

> **acceso**: `string`[]

uids con acceso de lectura (el propietario siempre lo tiene, no hace falta listarlo).

***

### rutas

> **rutas**: `Record`\<[`CarpetaKB`](../../ArticuloKB/type-aliases/CarpetaKB.md), `string`\>

Ruta de Windows de cada carpeta, solo como recordatorio en el botón de indexar.
