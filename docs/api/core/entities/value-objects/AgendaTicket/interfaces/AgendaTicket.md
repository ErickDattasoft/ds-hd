[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/AgendaTicket](../README.md) / AgendaTicket

# Interface: AgendaTicket

Programación de atención de un ticket ("📅 Programar atención" del CRM viejo): una fecha y
hora en las que se atenderá, y si se pide un recordatorio por WhatsApp 30 min antes (que
dispara n8n — ds-hd solo publica el evento con la fecha/hora objetivo).

## Properties

### fecha

> **fecha**: `string`

`YYYY-MM-DD`.

***

### hora

> **hora**: `string`

`HH:MM` (24 h).

***

### recordatorioWhatsapp

> **recordatorioWhatsapp**: `boolean`
