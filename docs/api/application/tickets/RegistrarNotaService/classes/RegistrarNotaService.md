[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/RegistrarNotaService](../README.md) / RegistrarNotaService

# Class: RegistrarNotaService

Caso de uso: agregar una nota (pública o interna) a un ticket.

## Constructors

### Constructor

> **new RegistrarNotaService**(`tickets`, `config`, `usuarios`, `ids`, `clock`, `email`, `logger`, `webhooks?`, `adjuntos?`, `baseUrl?`): `RegistrarNotaService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

##### webhooks?

[`IWebhookPublisher`](../../../../core/ports/services/IWebhookPublisher/interfaces/IWebhookPublisher.md)

##### adjuntos?

[`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

##### baseUrl?

`string` = `''`

URL pública del CRM: las imágenes del correo apuntan a `/adjunto/<id>`.

#### Returns

`RegistrarNotaService`

## Properties

### MAX\_IMAGENES

> `readonly` `static` **MAX\_IMAGENES**: `5` = `5`

Máximo de capturas por respuesta.

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`NotaTicket`](../../../../core/entities/NotaTicket/interfaces/NotaTicket.md)\>

#### Parameters

##### input

[`RegistrarNotaInput`](../../dto/interfaces/RegistrarNotaInput.md)

#### Returns

`Promise`\<[`NotaTicket`](../../../../core/entities/NotaTicket/interfaces/NotaTicket.md)\>
