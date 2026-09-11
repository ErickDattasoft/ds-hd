[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ConfiguracionIntegraciones](../README.md) / ConfiguracionIntegraciones

# Interface: ConfiguracionIntegraciones

Config de integraciones externas (documento `configuracion/integraciones`).

## Properties

### n8nWebhookTickets

> **n8nWebhookTickets**: `string`

Si viene vacío, `N8nWebhookPublisher` usa el env var `N8N_WEBHOOK_TICKETS` como respaldo.

***

### n8nWebhookCotizaciones

> **n8nWebhookCotizaciones**: `string`

Si viene vacío, `N8nWebhookPublisher` usa el env var `N8N_WEBHOOK_COTIZACIONES` como respaldo.

***

### n8nWebhookEmpresas

> **n8nWebhookEmpresas**: `string`

Webhook para "Avisar por WhatsApp" desde Empresas — CallMeBot no sirve para esto (solo
manda al número propio dado de alta), así que este evento se manda tal cual a n8n para
que ahí se enrute a un proveedor real de WhatsApp Business.

***

### whatsappHabilitado

> **whatsappHabilitado**: `boolean`

***

### whatsappTelefono

> **whatsappTelefono**: `string`

***

### whatsappApiKey

> **whatsappApiKey**: `string`

***

### reglas

> **reglas**: [`MatrizReglas`](../type-aliases/MatrizReglas.md)
