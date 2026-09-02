[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IEmailSender](../README.md) / IEmailSender

# Interface: IEmailSender

Defined in: core/ports/services/IEmailSender.ts:18

Puerto de envío de correo transaccional (hoy: Brevo). En desarrollo/tests se usa
un fake que solo registra los correos en memoria.

## Methods

### enviar()

> **enviar**(`correo`): `Promise`\<`void`\>

Defined in: core/ports/services/IEmailSender.ts:19

#### Parameters

##### correo

[`CorreoSaliente`](CorreoSaliente.md)

#### Returns

`Promise`\<`void`\>
