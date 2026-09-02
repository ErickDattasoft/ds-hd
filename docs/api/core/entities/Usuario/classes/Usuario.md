[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Usuario](../README.md) / Usuario

# Class: Usuario

Defined in: core/entities/Usuario.ts:44

Cuenta de usuario. Aglutina staff (admin/supervisor/agente/lectura) y clientes del portal.
No sabe nada del catálogo de permisos: solo guarda los overrides; el cálculo del conjunto
efectivo vive en la capa de entrega (`interfaces/http/rbac/policy.ts`).

## Constructors

### Constructor

> **new Usuario**(`props`): `Usuario`

Defined in: core/entities/Usuario.ts:58

#### Parameters

##### props

[`UsuarioProps`](../interfaces/UsuarioProps.md)

#### Returns

`Usuario`

## Properties

### uid

> `readonly` **uid**: `string`

Defined in: core/entities/Usuario.ts:45

***

### email

> `readonly` **email**: [`Email`](../../value-objects/Email/classes/Email.md)

Defined in: core/entities/Usuario.ts:46

***

### nombre

> **nombre**: `string`

Defined in: core/entities/Usuario.ts:47

***

### rol

> **rol**: `"admin"` \| `"supervisor"` \| `"agente"` \| `"lectura"` \| `"cliente"`

Defined in: core/entities/Usuario.ts:48

***

### permisosExtra

> **permisosExtra**: `string`[]

Defined in: core/entities/Usuario.ts:49

***

### permisosRevocados

> **permisosRevocados**: `string`[]

Defined in: core/entities/Usuario.ts:50

***

### activo

> **activo**: `boolean`

Defined in: core/entities/Usuario.ts:51

***

### empresaId

> **empresaId**: `string` \| `null`

Defined in: core/entities/Usuario.ts:52

***

### agente

> **agente**: [`PerfilAgente`](../interfaces/PerfilAgente.md)

Defined in: core/entities/Usuario.ts:53

***

### createdAt

> `readonly` **createdAt**: `Date`

Defined in: core/entities/Usuario.ts:54

***

### updatedAt

> **updatedAt**: `Date`

Defined in: core/entities/Usuario.ts:55

***

### lastLoginAt

> **lastLoginAt**: `Date` \| `null`

Defined in: core/entities/Usuario.ts:56

## Accessors

### esStaff

#### Get Signature

> **get** **esStaff**(): `boolean`

Defined in: core/entities/Usuario.ts:73

##### Returns

`boolean`

***

### esCliente

#### Get Signature

> **get** **esCliente**(): `boolean`

Defined in: core/entities/Usuario.ts:77

##### Returns

`boolean`

## Methods

### registrarAcceso()

> **registrarAcceso**(`ahora`): `void`

Defined in: core/entities/Usuario.ts:81

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### desactivar()

> **desactivar**(): `void`

Defined in: core/entities/Usuario.ts:85

#### Returns

`void`

***

### activar()

> **activar**(): `void`

Defined in: core/entities/Usuario.ts:90

#### Returns

`void`
