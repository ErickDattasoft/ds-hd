[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ITicketQueries](../README.md) / FiltroTickets

# Interface: FiltroTickets

Filtros para listar/contar tickets.

## Properties

### estado?

> `optional` **estado?**: `string`

***

### prioridad?

> `optional` **prioridad?**: `string`

***

### grupo?

> `optional` **grupo?**: `string`

***

### agenteAsignadoUid?

> `optional` **agenteAsignadoUid?**: `string`

***

### sinAsignar?

> `optional` **sinAsignar?**: `boolean`

`true` = solo sin asignar.

***

### empresaId?

> `optional` **empresaId?**: `string`

***

### solicitanteUid?

> `optional` **solicitanteUid?**: `string`

***

### canal?

> `optional` **canal?**: `string`

***

### soloAbiertos?

> `optional` **soloAbiertos?**: `boolean`

Excluye estados finales (resuelto/cerrado).

***

### soloProgramados?

> `optional` **soloProgramados?**: `boolean`

`true` = solo tickets con atención programada (agenda), ordenados por fecha/hora asc.

***

### texto?

> `optional` **texto?**: `string`

Busca en asunto, #, empresa, contacto y agente (como el buscador del CRM viejo).

***

### tipo?

> `optional` **tipo?**: `string`

***

### facturacion?

> `optional` **facturacion?**: `string`

Estado de facturación (`no_facturado`, `facturado`…).

***

### limite?

> `optional` **limite?**: `number`

***

### archivado?

> `optional` **archivado?**: `boolean`

`false` (por defecto en las vistas normales) excluye tickets en la papelera.
