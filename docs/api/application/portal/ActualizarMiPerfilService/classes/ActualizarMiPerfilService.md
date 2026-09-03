[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/portal/ActualizarMiPerfilService](../README.md) / ActualizarMiPerfilService

# Class: ActualizarMiPerfilService

Caso de uso: el cliente actualiza los datos de su propio perfil (hoy: solo el nombre).

## Constructors

### Constructor

> **new ActualizarMiPerfilService**(`usuarios`, `clock`): `ActualizarMiPerfilService`

#### Parameters

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`ActualizarMiPerfilService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### nombre

`string`

#### Returns

`Promise`\<`void`\>
