[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/EliminarUsuarioService](../README.md) / EliminarUsuarioService

# Class: EliminarUsuarioService

Caso de uso: eliminar un usuario para siempre (cuenta de acceso + `usuarios/{uid}`).
Los tickets guardan el nombre del agente, así que el historial no pierde a quién lo atendió;
aun así, se exige reasignar antes los tickets abiertos para no dejarlos sin responsable.

## Constructors

### Constructor

> **new EliminarUsuarioService**(`usuarios`, `auth`, `tickets`, `logger`, `bitacora?`): `EliminarUsuarioService`

#### Parameters

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### auth

[`IAuthProvider`](../../../../core/ports/services/IAuthProvider/interfaces/IAuthProvider.md)

##### tickets

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

##### bitacora?

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

#### Returns

`EliminarUsuarioService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<\{ `nombre`: `string`; \}\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### uid

`string`

#### Returns

`Promise`\<\{ `nombre`: `string`; \}\>
