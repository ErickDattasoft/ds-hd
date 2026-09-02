[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/CrearUsuarioService](../README.md) / CrearUsuarioService

# Class: CrearUsuarioService

Defined in: application/usuarios/CrearUsuarioService.ts:31

Caso de uso: un administrador da de alta una cuenta de staff.

## Constructors

### Constructor

> **new CrearUsuarioService**(`usuarios`, `invitaciones`, `auth`, `email`, `ids`, `clock`, `logger`, `baseUrl`, `invitacionTtlHoras`): `CrearUsuarioService`

Defined in: application/usuarios/CrearUsuarioService.ts:32

#### Parameters

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### invitaciones

[`IInvitacionRepository`](../../../../core/ports/repositories/IInvitacionRepository/interfaces/IInvitacionRepository.md)

##### auth

[`IAuthProvider`](../../../../core/ports/services/IAuthProvider/interfaces/IAuthProvider.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

##### baseUrl

`string`

##### invitacionTtlHoras

`number`

#### Returns

`CrearUsuarioService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`CrearUsuarioResultado`](../interfaces/CrearUsuarioResultado.md)\>

Defined in: application/usuarios/CrearUsuarioService.ts:44

#### Parameters

##### input

[`CrearUsuarioInput`](../interfaces/CrearUsuarioInput.md)

#### Returns

`Promise`\<[`CrearUsuarioResultado`](../interfaces/CrearUsuarioResultado.md)\>
