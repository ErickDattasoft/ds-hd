[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/knowledge/AccesoKBService](../README.md) / AccesoKBService

# Class: AccesoKBService

Panel «👥 Acceso» de la base de conocimiento (como el del CRM viejo): el propietario marca,
persona por persona, quién la puede ver — sin importar si es administrador. También guarda
la ruta de Windows de cada carpeta como recordatorio para indexar.

## Constructors

### Constructor

> **new AccesoKBService**(`config`, `usuarios`, `bitacora`): `AccesoKBService`

#### Parameters

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

#### Returns

`AccesoKBService`

## Methods

### obtener()

> **obtener**(`actor`): `Promise`\<\{ `filas`: [`FilaAccesoKB`](../interfaces/FilaAccesoKB.md)[]; `rutas`: `Record`\<`"soporte"` \| `"empresas"`, `string`\>; \}\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<\{ `filas`: [`FilaAccesoKB`](../interfaces/FilaAccesoKB.md)[]; `rutas`: `Record`\<`"soporte"` \| `"empresas"`, `string`\>; \}\>

***

### guardarAcceso()

> **guardarAcceso**(`actor`, `uids`): `Promise`\<`void`\>

Reemplaza la lista completa de quién tiene acceso.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### uids

`string`[]

#### Returns

`Promise`\<`void`\>

***

### guardarRutas()

> **guardarRutas**(`actor`, `rutas`): `Promise`\<`void`\>

Ruta de Windows de cada carpeta (solo recordatorio; el navegador no puede abrirla sola).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### rutas

`Partial`\<`Record`\<[`CarpetaKB`](../../../../core/entities/ArticuloKB/type-aliases/CarpetaKB.md), `string`\>\>

#### Returns

`Promise`\<`void`\>

***

### rutas()

> **rutas**(): `Promise`\<`Record`\<`"soporte"` \| `"empresas"`, `string`\>\>

#### Returns

`Promise`\<`Record`\<`"soporte"` \| `"empresas"`, `string`\>\>
