[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/auth/SolicitarAccesoService](../README.md) / SolicitarAccesoService

# Class: SolicitarAccesoService

Caso de uso: alguien pide acceso al back-office desde la pantalla de login.

## Constructors

### Constructor

> **new SolicitarAccesoService**(`solicitudes`, `usuarios`, `email`, `logger`): `SolicitarAccesoService`

#### Parameters

##### solicitudes

[`ISolicitudAccesoRepository`](../../../../core/ports/repositories/ISolicitudAccesoRepository/interfaces/ISolicitudAccesoRepository.md)

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`SolicitarAccesoService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

[`SolicitarAccesoInput`](../interfaces/SolicitarAccesoInput.md)

#### Returns

`Promise`\<`void`\>
