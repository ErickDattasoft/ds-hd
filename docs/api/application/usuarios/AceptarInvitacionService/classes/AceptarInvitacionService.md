[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/AceptarInvitacionService](../README.md) / AceptarInvitacionService

# Class: AceptarInvitacionService

Caso de uso: el invitado abre el enlace y fija su contraseña.

## Constructors

### Constructor

> **new AceptarInvitacionService**(`invitaciones`, `usuarios`, `auth`, `clock`, `logger`): `AceptarInvitacionService`

#### Parameters

##### invitaciones

[`IInvitacionRepository`](../../../../core/ports/repositories/IInvitacionRepository/interfaces/IInvitacionRepository.md)

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### auth

[`IAuthProvider`](../../../../core/ports/services/IAuthProvider/interfaces/IAuthProvider.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`AceptarInvitacionService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<\{ `email`: `string`; \}\>

#### Parameters

##### input

[`AceptarInvitacionInput`](../interfaces/AceptarInvitacionInput.md)

#### Returns

`Promise`\<\{ `email`: `string`; \}\>
