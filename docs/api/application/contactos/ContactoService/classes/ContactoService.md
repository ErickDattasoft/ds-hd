[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/contactos/ContactoService](../README.md) / ContactoService

# Class: ContactoService

Gestión de contactos (CRUD + archivar).

## Constructors

### Constructor

> **new ContactoService**(`repo`, `empresas`, `ids`, `clock`, `bitacora`): `ContactoService`

#### Parameters

##### repo

[`IContactoRepository`](../../../../core/ports/repositories/IContactoRepository/interfaces/IContactoRepository.md)

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

#### Returns

`ContactoService`

## Methods

### listar()

> **listar**(`filtro?`): `Promise`\<[`Contacto`](../../../../core/entities/Contacto/classes/Contacto.md)[]\>

#### Parameters

##### filtro?

[`ListarContactosFiltro`](../../../../core/ports/repositories/IContactoRepository/interfaces/ListarContactosFiltro.md)

#### Returns

`Promise`\<[`Contacto`](../../../../core/entities/Contacto/classes/Contacto.md)[]\>

***

### obtener()

> **obtener**(`id`): `Promise`\<[`Contacto`](../../../../core/entities/Contacto/classes/Contacto.md)\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Contacto`](../../../../core/entities/Contacto/classes/Contacto.md)\>

***

### crear()

> **crear**(`actor`, `datos`): `Promise`\<[`Contacto`](../../../../core/entities/Contacto/classes/Contacto.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### datos

[`DatosContacto`](../interfaces/DatosContacto.md)

#### Returns

`Promise`\<[`Contacto`](../../../../core/entities/Contacto/classes/Contacto.md)\>

***

### actualizar()

> **actualizar**(`actor`, `id`, `datos`): `Promise`\<[`Contacto`](../../../../core/entities/Contacto/classes/Contacto.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

##### datos

[`DatosContacto`](../interfaces/DatosContacto.md)

#### Returns

`Promise`\<[`Contacto`](../../../../core/entities/Contacto/classes/Contacto.md)\>

***

### archivar()

> **archivar**(`actor`, `id`, `archivar`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

##### archivar

`boolean`

#### Returns

`Promise`\<`void`\>
