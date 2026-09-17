[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ConfiguracionCorreoEntrante](../README.md) / ConfiguracionCorreoEntrante

# Interface: ConfiguracionCorreoEntrante

Correo entrante: el CRM revisa cada hora un buzón de Zoho Mail y mete las respuestas de los
clientes como nota en su ticket (documento `configuracion/correo_entrante`).

Usa la API de Zoho Mail con OAuth, así que NO hace falta tocar el DNS del dominio: basta
autorizar una vez la aplicación en la consola de Zoho y pegar aquí el refresh token.

## Properties

### habilitado

> **habilitado**: `boolean`

***

### region

> **region**: `string`

Dominio de Zoho de la cuenta: `com`, `eu`, `in`, `com.au`, `jp`, `ca`.

***

### clientId

> **clientId**: `string`

***

### clientSecret

> **clientSecret**: `string`

***

### refreshToken

> **refreshToken**: `string`

***

### accountId

> **accountId**: `string`

Id de la cuenta de Zoho Mail (lo descubre el botón "Probar conexión").

***

### carpeta

> **carpeta**: `string`

Carpeta a revisar; vacío = Inbox.

***

### soloContactoDelTicket

> **soloContactoDelTicket**: `boolean`

Solo se aceptan respuestas del correo del contacto del ticket (recomendado).

***

### ultimaRevision

> **ultimaRevision**: `string` \| `null`

Resultado de la última revisión, para verlo en Configuración.

***

### ultimoResultado

> **ultimoResultado**: `string` \| `null`
