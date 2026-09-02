[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/auth/SolicitarAccesoService](../README.md) / SolicitarAccesoService

# Class: SolicitarAccesoService

Defined in: application/auth/SolicitarAccesoService.ts:18

Caso de uso: alguien pide acceso al back-office desde la pantalla de login.

## Constructors

### Constructor

> **new SolicitarAccesoService**(`solicitudes`, `usuarios`, `email`, `logger`): `SolicitarAccesoService`

Defined in: application/auth/SolicitarAccesoService.ts:19

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

Defined in: application/auth/SolicitarAccesoService.ts:26

#### Parameters

##### input

[`SolicitarAccesoInput`](../interfaces/SolicitarAccesoInput.md)

#### Returns

`Promise`\<`void`\>
