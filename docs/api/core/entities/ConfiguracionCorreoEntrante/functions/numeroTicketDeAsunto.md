[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ConfiguracionCorreoEntrante](../README.md) / numeroTicketDeAsunto

# Function: numeroTicketDeAsunto()

> **numeroTicketDeAsunto**(`asunto`): `number` \| `null`

Número de ticket en un asunto (`[Ticket #123] …`, `Re: Ticket #123`, `#123`).
`null` si el asunto no trae ninguno: sin número no hay a qué ticket pegar la respuesta.

## Parameters

### asunto

`string`

## Returns

`number` \| `null`
