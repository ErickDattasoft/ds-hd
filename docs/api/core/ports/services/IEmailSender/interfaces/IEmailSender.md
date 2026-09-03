[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IEmailSender](../README.md) / IEmailSender

# Interface: IEmailSender

Puerto de envío de correo transaccional (hoy: Brevo). En desarrollo/tests se usa
un fake que solo registra los correos en memoria.

## Methods

### enviar()

> **enviar**(`correo`): `Promise`\<`void`\>

#### Parameters

##### correo

[`CorreoSaliente`](CorreoSaliente.md)

#### Returns

`Promise`\<`void`\>
