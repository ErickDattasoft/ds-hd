[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IEmailSender](../README.md) / CorreoSaliente

# Interface: CorreoSaliente

Correo transaccional a enviar, agnóstico del proveedor.

## Properties

### para

> **para**: `object`[]

#### email

> **email**: `string`

#### nombre?

> `optional` **nombre?**: `string`

***

### asunto

> **asunto**: `string`

***

### html

> **html**: `string`

***

### texto?

> `optional` **texto?**: `string`

Texto plano opcional (si se omite, el proveedor puede derivarlo del HTML).

***

### cc?

> `optional` **cc?**: `object`[]

#### email

> **email**: `string`

#### nombre?

> `optional` **nombre?**: `string`

***

### cco?

> `optional` **cco?**: `object`[]

#### email

> **email**: `string`

#### nombre?

> `optional` **nombre?**: `string`

***

### responderA?

> `optional` **responderA?**: `object`

Dirección a la que responde el destinatario (si se omite, el remitente configurado).

#### email

> **email**: `string`

#### nombre?

> `optional` **nombre?**: `string`

***

### tags?

> `optional` **tags?**: `string`[]

Etiquetas para rastrear el correo en el proveedor (webhooks de entrega/rebote).
