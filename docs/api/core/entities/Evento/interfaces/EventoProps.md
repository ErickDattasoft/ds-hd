[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Evento](../README.md) / EventoProps

# Interface: EventoProps

Props para construir un [Evento](../classes/Evento.md).

## Properties

### id

> **id**: `string`

***

### titulo

> **titulo**: `string`

***

### descripcion?

> `optional` **descripcion?**: `string` \| `null`

***

### fechaHora

> **fechaHora**: `Date`

***

### cupo?

> `optional` **cupo?**: `number`

***

### estado?

> `optional` **estado?**: [`EstadoEvento`](../type-aliases/EstadoEvento.md)

***

### urlWebinar?

> `optional` **urlWebinar?**: `string` \| `null`

***

### horasRecordatorio?

> `optional` **horasRecordatorio?**: `number`

Horas antes del evento para enviar el recordatorio.

***

### limiteRegistrosPorIp?

> `optional` **limiteRegistrosPorIp?**: `number` \| `null`

Máximo de inscripciones desde una misma IP; `null` = usar [LIMITE\_REGISTROS\_POR\_IP\_DEFECTO](../variables/LIMITE_REGISTROS_POR_IP_DEFECTO.md).

***

### creadoPorUid?

> `optional` **creadoPorUid?**: `string` \| `null`

***

### createdAt?

> `optional` **createdAt?**: `Date`

***

### updatedAt?

> `optional` **updatedAt?**: `Date`
