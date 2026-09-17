[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/ContrasenaService](../README.md) / ContrasenaService

# Class: ContrasenaService

Casos de uso de contraseña: cambiar la propia y restablecer la de otro (admin).

## Constructors

### Constructor

> **new ContrasenaService**(`usuarios`, `auth`, `logger`): `ContrasenaService`

#### Parameters

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### auth

[`IAuthProvider`](../../../../core/ports/services/IAuthProvider/interfaces/IAuthProvider.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ContrasenaService`

## Methods

### cambiarMia()

> **cambiarMia**(`input`): `Promise`\<`void`\>

El usuario cambia su contraseña confirmando la actual.

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### actual

`string`

###### password

`string`

###### passwordConfirmacion

`string`

#### Returns

`Promise`\<`void`\>

***

### restablecer()

> **restablecer**(`input`): `Promise`\<`void`\>

Un administrador fija una contraseña nueva a otro usuario y corta sus sesiones.

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### uid

`string`

###### password

`string`

###### passwordConfirmacion

`string`

#### Returns

`Promise`\<`void`\>
