[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ConfiguracionCorreoEntrante](../README.md) / textoDeHtmlCorreo

# Function: textoDeHtmlCorreo()

> **textoDeHtmlCorreo**(`html`): `string`

HTML de un correo a texto legible, **sin el hilo citado**: Gmail/Zoho/Outlook meten las
respuestas anteriores en `<blockquote>` o en un bloque de cita (`gmail_quote`, `zmail_extra`,
`divRplyFwdMsg`). Quitarlo aquí es más confiable que adivinarlo después en texto plano, sobre
todo cuando la línea "El … escribió:" viene partida en dos.

## Parameters

### html

`string`

## Returns

`string`
