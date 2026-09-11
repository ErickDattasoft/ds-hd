[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ConfiguracionResumen](../README.md) / ConfiguracionResumen

# Interface: ConfiguracionResumen

Config del resumen diario por correo (documento `configuracion/resumen`).

## Properties

### habilitado

> **habilitado**: `boolean`

***

### destinatarios

> **destinatarios**: `string`[]

Correos que reciben el resumen.

***

### horaEnvio

> **horaEnvio**: `number`

Hora local (America/Mexico_City), 0-23, en la que el job de cron lo envía.

***

### ultimoEnvio

> **ultimoEnvio**: `string` \| `null`

Fecha local (`YYYY-MM-DD`) del último envío automático, para no repetirlo el mismo día.
