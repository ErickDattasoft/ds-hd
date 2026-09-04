[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Usuario](../README.md) / Usuario

# Class: Usuario

Cuenta de usuario. Aglutina staff (admin/supervisor/agente/lectura) y clientes del portal.
No sabe nada del catálogo de permisos: solo guarda los overrides; el cálculo del conjunto
efectivo vive en la capa de entrega (`interfaces/http/rbac/policy.ts`).

## Constructors

### Constructor

> **new Usuario**(`props`): `Usuario`

#### Parameters

##### props

[`UsuarioProps`](../interfaces/UsuarioProps.md)

#### Returns

`Usuario`

## Properties

### uid

> `readonly` **uid**: `string`

***

### email

> `readonly` **email**: [`Email`](../../value-objects/Email/classes/Email.md)

***

### nombre

> **nombre**: `string`

***

### rol

> **rol**: `"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

***

### permisosExtra

> **permisosExtra**: `string`[]

***

### permisosRevocados

> **permisosRevocados**: `string`[]

***

### activo

> **activo**: `boolean`

***

### empresaId

> **empresaId**: `string` \| `null`

***

### agente

> **agente**: [`PerfilAgente`](../interfaces/PerfilAgente.md)

***

### firma

> **firma**: `string` \| `null`

***

### createdAt

> `readonly` **createdAt**: `Date`

***

### updatedAt

> **updatedAt**: `Date`

***

### lastLoginAt

> **lastLoginAt**: `Date` \| `null`

## Accessors

### esStaff

#### Get Signature

> **get** **esStaff**(): `boolean`

##### Returns

`boolean`

***

### esCliente

#### Get Signature

> **get** **esCliente**(): `boolean`

##### Returns

`boolean`

## Methods

### registrarAcceso()

> **registrarAcceso**(`ahora`): `void`

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### desactivar()

> **desactivar**(): `void`

#### Returns

`void`

***

### activar()

> **activar**(): `void`

#### Returns

`void`

***

### fijarFirma()

> **fijarFirma**(`firma`, `ahora`): `void`

#### Parameters

##### firma

`string`

##### ahora

`Date`

#### Returns

`void`
