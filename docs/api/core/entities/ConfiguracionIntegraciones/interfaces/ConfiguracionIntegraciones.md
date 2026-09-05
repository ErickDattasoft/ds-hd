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
