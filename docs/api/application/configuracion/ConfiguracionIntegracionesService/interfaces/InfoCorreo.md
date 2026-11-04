[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/ConfiguracionIntegracionesService](../README.md) / InfoCorreo

# Interface: InfoCorreo

Cómo está configurado el envío de correo en el servidor (para la prueba desde la UI).

## Properties

### modo

> `readonly` **modo**: `"brevo"` \| `"smtp"` \| `"log"`

`brevo` = API de Brevo · `smtp` = servidor SMTP · `log` = sin configurar (solo se registra).

***

### remitente

> `readonly` **remitente**: `string`

Dirección `From` con la que sale el correo.

***

### brevoApiKey?

> `readonly` `optional` **brevoApiKey?**: `string`

Clave de la API de Brevo (vacía si no hay), para consultar qué pasó con lo enviado.
