[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/ActualizarMiFirmaService](../README.md) / ActualizarMiFirmaService

# Class: ActualizarMiFirmaService

Caso de uso: un usuario de staff fija su propia firma para respuestas de tickets.

## Constructors

### Constructor

> **new ActualizarMiFirmaService**(`usuarios`, `clock`): `ActualizarMiFirmaService`

#### Parameters

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`ActualizarMiFirmaService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### firma

`string`

#### Returns

`Promise`\<`void`\>
