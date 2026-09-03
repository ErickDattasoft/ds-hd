[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/InvitarClienteService](../README.md) / InvitarClienteService

# Class: InvitarClienteService

Caso de uso: el staff invita a un contacto de una empresa a usar el portal de clientes.
Crea la identidad, el documento `usuarios/{uid}` con rol `cliente` vinculado a la empresa,
y una invitación de un solo uso para que fije su contraseña.

## Constructors

### Constructor

> **new InvitarClienteService**(`usuarios`, `invitaciones`, `auth`, `email`, `ids`, `clock`, `logger`, `baseUrl`, `invitacionTtlHoras`): `InvitarClienteService`

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

`InvitarClienteService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`InvitarClienteResultado`](../interfaces/InvitarClienteResultado.md)\>

#### Parameters

##### input

[`InvitarClienteInput`](../interfaces/InvitarClienteInput.md)

#### Returns

`Promise`\<[`InvitarClienteResultado`](../interfaces/InvitarClienteResultado.md)\>
