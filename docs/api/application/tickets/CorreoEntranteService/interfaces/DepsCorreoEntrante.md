[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/CorreoEntranteService](../README.md) / DepsCorreoEntrante

# Interface: DepsCorreoEntrante

Dependencias extra del correo entrante por webhook (CloudMailin). Opcionales en el sondeo.

## Properties

### adjuntos?

> `optional` **adjuntos?**: [`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

***

### solicitudes?

> `optional` **solicitudes?**: [`ITicketPublicoRepository`](../../../../core/ports/repositories/ITicketPublicoRepository/interfaces/ITicketPublicoRepository.md)

Buzón de tickets públicos: ahí caen los correos sin número de ticket (solicitudes).

***

### usuarios?

> `optional` **usuarios?**: [`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

Para aceptar respuestas de usuarios del CRM (agentes en copia) aunque no sean el contacto.

***

### email?

> `optional` **email?**: [`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

Aviso al equipo de que llegó una respuesta.

***

### remitentesPropios?

> `optional` **remitentesPropios?**: readonly `string`[]

Direcciones desde las que el CRM manda correo. Si llega algo DE ellas es nuestro propio aviso
reenviado: se ignora. Sin esta barrera el CRM viejo entró en bucle el 2026-10-02 (~20 correos
en minutos) porque el aviso de "nueva respuesta" coincidía con el filtro de Zoho.

***

### webhookActivo?

> `optional` **webhookActivo?**: `boolean`

¿Está puesta la clave del webhook (`CORREO_ENTRANTE_SECRET`)? Solo para mostrarlo en Configuración.
