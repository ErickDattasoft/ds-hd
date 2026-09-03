[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/auth/LoginService](../README.md) / LoginService

# Class: LoginService

Caso de uso: iniciar sesión con correo y contraseña.

## Constructors

### Constructor

> **new LoginService**(`usuarios`, `auth`, `sesiones`, `clock`, `logger`): `LoginService`

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

#### Parameters

##### input

[`LoginInput`](../interfaces/LoginInput.md)

#### Returns

`Promise`\<[`LoginResultado`](../interfaces/LoginResultado.md)\>
