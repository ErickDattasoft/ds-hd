[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/notificacionTicket](../README.md) / DestinatariosTicket

# Interface: DestinatariosTicket

A quién va un correo de notificación de un ticket.

## Properties

### para

> **para**: `object`[]

#### email

> **email**: `string`

#### nombre?

> `optional` **nombre?**: `string`

***

### cc

> **cc**: `object`[]

#### email

> **email**: `string`

#### nombre?

> `optional` **nombre?**: `string`

***

### responderA?

> `optional` **responderA?**: `object`

#### email

> **email**: `string`

#### nombre?

> `optional` **nombre?**: `string`

***

### sinContacto

> **sinContacto**: `boolean`

`true` si el ticket no tiene correo de contacto (el cliente no recibió nada directo).
