[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IEmailSender](../README.md) / CorreoSaliente

# Interface: CorreoSaliente

Defined in: core/ports/services/IEmailSender.ts:2

Correo transaccional a enviar, agnóstico del proveedor.

## Properties

### para

> **para**: `object`[]

Defined in: core/ports/services/IEmailSender.ts:3

#### email

> **email**: `string`

#### nombre?

> `optional` **nombre?**: `string`

***

### asunto

> **asunto**: `string`

Defined in: core/ports/services/IEmailSender.ts:4

***

### html

> **html**: `string`

Defined in: core/ports/services/IEmailSender.ts:5

***

### texto?

> `optional` **texto?**: `string`

Defined in: core/ports/services/IEmailSender.ts:7

Texto plano opcional (si se omite, el proveedor puede derivarlo del HTML).

***

### cc?

> `optional` **cc?**: `object`[]

Defined in: core/ports/services/IEmailSender.ts:8

#### email

> **email**: `string`

#### nombre?

> `optional` **nombre?**: `string`

***

### cco?

> `optional` **cco?**: `object`[]

Defined in: core/ports/services/IEmailSender.ts:9

#### email

> **email**: `string`

#### nombre?

> `optional` **nombre?**: `string`

***

### tags?

> `optional` **tags?**: `string`[]

Defined in: core/ports/services/IEmailSender.ts:11

Etiquetas para rastrear el correo en el proveedor (webhooks de entrega/rebote).
