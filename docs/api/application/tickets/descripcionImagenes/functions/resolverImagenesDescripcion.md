[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/descripcionImagenes](../README.md) / resolverImagenesDescripcion

# Function: resolverImagenesDescripcion()

> **resolverImagenesDescripcion**(`html`, `ticketId`, `adjuntos`): `Promise`\<`string`\>

Resuelve cada `<img data-adj-id="…">` de una descripción de ticket (ya saneada, sin `src` —
ver `sanitizarDescripcionHtml`) contra su adjunto real, inyectando el `src` con el `data:` URI.
Verifica que el adjunto sea de ESTE ticket (nunca confía en el id a ciegas) — para el detalle,
imprimir y el portal de cliente.

## Parameters

### html

`string`

### ticketId

`string`

### adjuntos

[`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

## Returns

`Promise`\<`string`\>
