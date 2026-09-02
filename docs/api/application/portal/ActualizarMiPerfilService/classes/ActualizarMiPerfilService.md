[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/portal/ActualizarMiPerfilService](../README.md) / ActualizarMiPerfilService

# Class: ActualizarMiPerfilService

Defined in: application/portal/ActualizarMiPerfilService.ts:7

Caso de uso: el cliente actualiza los datos de su propio perfil (hoy: solo el nombre).

## Constructors

### Constructor

> **new ActualizarMiPerfilService**(`usuarios`, `clock`): `ActualizarMiPerfilService`

Defined in: application/portal/ActualizarMiPerfilService.ts:8

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

Defined in: application/portal/ActualizarMiPerfilService.ts:13

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### nombre

`string`

#### Returns

`Promise`\<`void`\>
