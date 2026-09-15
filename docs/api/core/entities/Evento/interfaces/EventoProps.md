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

### invitaciones?

> `optional` **invitaciones?**: [`InvitacionEmpresa`](InvitacionEmpresa.md)[]

Empresas de la cartera invitadas de forma dirigida.

***

### invitadosExternos?

> `optional` **invitadosExternos?**: [`InvitadoExterno`](InvitadoExterno.md)[]

Invitados externos (redes sociales, referidos).

***

### flayer?

> `optional` **flayer?**: [`EventoFlayer`](EventoFlayer.md) \| `null`

Imagen promocional (poster/flayer) del evento.

***

### sistema?

> `optional` **sistema?**: `string` \| `null`

Sistema al que aplica el evento (p. ej. "Contabilidad"); dispara la pregunta "¿lo usas?"
 en el registro público y alimenta el comodín `[sistema]` de la plantilla.

***

### contactoNombre?

> `optional` **contactoNombre?**: `string` \| `null`

Contacto de referencia de ESTE evento (distinto del "invitado por" de cada invitación).

***

### contactoWhatsapp?

> `optional` **contactoWhatsapp?**: `string` \| `null`

***

### plantilla?

> `optional` **plantilla?**: `string` \| `null`

Plantilla de mensaje con comodines, propia de este evento — ver [resolverPlantillaEvento](../functions/resolverPlantillaEvento.md).

***

### mensajeSeguimiento?

> `optional` **mensajeSeguimiento?**: `string` \| `null`

Mensaje de seguimiento por correo tras el evento; vacío = no se manda (opcional a propósito).

***

### horasSeguimiento?

> `optional` **horasSeguimiento?**: `number` \| `null`

Horas después del evento para el seguimiento; `null` = usar el valor por defecto (24h).

***

### creadoPorUid?

> `optional` **creadoPorUid?**: `string` \| `null`

***

### createdAt?

> `optional` **createdAt?**: `Date`

***

### updatedAt?

> `optional` **updatedAt?**: `Date`
