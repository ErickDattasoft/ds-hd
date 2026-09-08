[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/notificacionTicket](../README.md) / destinatariosTicket

# Function: destinatariosTicket()

> **destinatariosTicket**(`ticket`, `correosNotificacion`, `copiaInterna`): [`DestinatariosTicket`](../interfaces/DestinatariosTicket.md)

Decide los destinatarios de un correo de ticket: va al contacto (si tiene correo), con copia
a los `correosNotificacion` de la configuración y a `copiaInterna` (agente asignado o quien
hace la acción). Si el contacto no tiene correo, el mensaje va directo a esa lista para que
no se pierda. `responderA` = primer correo de la lista de configuración.

## Parameters

### ticket

`Pick`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md), `"contactoCorreo"` \| `"contactoNombre"`\>

### correosNotificacion

readonly `string`[]

### copiaInterna

`string` \| `null`

## Returns

[`DestinatariosTicket`](../interfaces/DestinatariosTicket.md)
