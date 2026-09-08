[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IAdjuntoTicketRepository](../README.md) / IAdjuntoTicketRepository

# Interface: IAdjuntoTicketRepository

Persistencia de los adjuntos de tickets (colección `tickets_adjuntos`, un doc por archivo).

## Methods

### crear()

> **crear**(`adjunto`): `Promise`\<`void`\>

Guarda un adjunto nuevo (con su contenido).

#### Parameters

##### adjunto

[`AdjuntoTicket`](../../../../entities/AdjuntoTicket/interfaces/AdjuntoTicket.md)

#### Returns

`Promise`\<`void`\>

***

### listarPorTicket()

> **listarPorTicket**(`ticketId`): `Promise`\<[`AdjuntoTicketMeta`](../../../../entities/AdjuntoTicket/type-aliases/AdjuntoTicketMeta.md)[]\>

Metadatos de los adjuntos de un ticket, del más viejo al más nuevo. Sin el contenido.

#### Parameters

##### ticketId

`string`

#### Returns

`Promise`\<[`AdjuntoTicketMeta`](../../../../entities/AdjuntoTicket/type-aliases/AdjuntoTicketMeta.md)[]\>

***

### obtener()

> **obtener**(`id`): `Promise`\<[`AdjuntoTicket`](../../../../entities/AdjuntoTicket/interfaces/AdjuntoTicket.md) \| `null`\>

Un adjunto completo (con contenido) por id, o `null`.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`AdjuntoTicket`](../../../../entities/AdjuntoTicket/interfaces/AdjuntoTicket.md) \| `null`\>

***

### eliminar()

> **eliminar**(`id`): `Promise`\<`void`\>

Borra un adjunto.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### eliminarPorTicket()

> **eliminarPorTicket**(`ticketId`): `Promise`\<`void`\>

Borra todos los adjuntos de un ticket (al eliminar el ticket de la papelera).

#### Parameters

##### ticketId

`string`

#### Returns

`Promise`\<`void`\>
