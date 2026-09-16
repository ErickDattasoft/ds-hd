[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/empresas/AvisarEmpresasService](../README.md) / ResultadoAviso

# Interface: ResultadoAviso

Qué pasó al intentar avisar a una empresa (enviado, o por qué no).

## Properties

### empresaId

> **empresaId**: `string`

***

### empresaNombre

> **empresaNombre**: `string`

***

### enviado

> **enviado**: `boolean`

***

### motivo?

> `optional` **motivo?**: `"sin_pendientes"` \| `"sin_contacto_correo"` \| `"sin_contacto_telefono"` \| `"no_encontrada"`

***

### whatsappManual?

> `optional` **whatsappManual?**: `object`

Solo cuando enviado=true por WhatsApp sin webhook n8n: el cliente debe abrir
wa.me con este teléfono/mensaje (mismo respaldo "WhatsApp Web" del CRM viejo).

#### telefono

> **telefono**: `string`

#### mensaje

> **mensaje**: `string`
