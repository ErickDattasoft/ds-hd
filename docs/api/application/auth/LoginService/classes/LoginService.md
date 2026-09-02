[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/auth/LoginService](../README.md) / LoginService

# Class: LoginService

Defined in: application/auth/LoginService.ts:23

Caso de uso: iniciar sesión con correo y contraseña.

## Constructors

### Constructor

> **new LoginService**(`usuarios`, `auth`, `sesiones`, `clock`, `logger`): `LoginService`

Defined in: application/auth/LoginService.ts:24

#### Parameters

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### auth

[`IAuthProvider`](../../../../core/ports/services/IAuthProvider/interfaces/IAuthProvider.md)

##### sesiones

[`ISessionManager`](../../../../core/ports/services/ISessionManager/interfaces/ISessionManager.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`LoginService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`LoginResultado`](../interfaces/LoginResultado.md)\>

Defined in: application/auth/LoginService.ts:32

#### Parameters

##### input

[`LoginInput`](../interfaces/LoginInput.md)

#### Returns

`Promise`\<[`LoginResultado`](../interfaces/LoginResultado.md)\>
