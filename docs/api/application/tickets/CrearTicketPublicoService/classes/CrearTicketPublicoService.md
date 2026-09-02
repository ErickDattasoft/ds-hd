[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/CrearTicketPublicoService](../README.md) / CrearTicketPublicoService

# Class: CrearTicketPublicoService

Defined in: application/tickets/CrearTicketPublicoService.ts:27

Caso de uso: alguien sin cuenta levanta un ticket desde el formulario público.

## Constructors

### Constructor

> **new CrearTicketPublicoService**(`buzon`, `config`, `captcha`, `email`, `clock`, `logger`): `CrearTicketPublicoService`

Defined in: application/tickets/CrearTicketPublicoService.ts:28

#### Parameters

##### buzon

[`ITicketPublicoRepository`](../../../../core/ports/repositories/ITicketPublicoRepository/interfaces/ITicketPublicoRepository.md)

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### captcha

[`ICaptchaVerifier`](../../../../core/ports/services/ICaptchaVerifier/interfaces/ICaptchaVerifier.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`CrearTicketPublicoService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`TicketPublico`](../../../../core/entities/TicketPublico/interfaces/TicketPublico.md)\>

Defined in: application/tickets/CrearTicketPublicoService.ts:37

#### Parameters

##### input

[`CrearTicketPublicoInput`](../interfaces/CrearTicketPublicoInput.md)

#### Returns

`Promise`\<[`TicketPublico`](../../../../core/entities/TicketPublico/interfaces/TicketPublico.md)\>
