[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/ActualizarUsuarioService](../README.md) / ActualizarUsuarioService

# Class: ActualizarUsuarioService

Caso de uso: editar nombre, rol, estado, permisos y perfil de agente de un usuario.

## Constructors

### Constructor

> **new ActualizarUsuarioService**(`usuarios`, `auth`, `clock`, `logger`): `ActualizarUsuarioService`

#### Parameters

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### auth

[`IAuthProvider`](../../../../core/ports/services/IAuthProvider/interfaces/IAuthProvider.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ActualizarUsuarioService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

[`ActualizarUsuarioInput`](../interfaces/ActualizarUsuarioInput.md)

#### Returns

`Promise`\<`void`\>
