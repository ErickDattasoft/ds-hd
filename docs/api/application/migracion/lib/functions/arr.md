[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/migracion/lib](../README.md) / arr

# Function: arr()

> **arr**(`v`): `Record`\<`string`, `unknown`\>[]

Utilidades del importador del CRM viejo, sin nada de Node (`node:crypto`, `node:fs`,
`process`) — este módulo corre igual en el script de migración y dentro del worker de
Cloudflare que sirve la app, que es lo que permite ofrecer el botón "Importar respaldo
del CRM viejo" en la UI y no solo por terminal.

## Parameters

### v

`unknown`

## Returns

`Record`\<`string`, `unknown`\>[]
