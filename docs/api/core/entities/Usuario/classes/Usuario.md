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

### roles

> **roles**: (`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`)[]

Roles asignados (fuente de verdad). Ver getters `rol`/`rolPrincipal`.

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

### empresasAdicionales

> **empresasAdicionales**: `string`[]

***

### agente

> **agente**: [`PerfilAgente`](../interfaces/PerfilAgente.md)

***

### firma

> **firma**: `string` \| `null`

***

### encabezado

> **encabezado**: `string` \| `null`

***

### predeterminadosTicket

> **predeterminadosTicket**: [`PredeterminadosTicket`](../../ConfiguracionTickets/interfaces/PredeterminadosTicket.md) \| `null`

***

### contactosSoporte

> **contactosSoporte**: `object`[]

#### nombre

> **nombre**: `string`

#### telefono

> **telefono**: `string`

***

### totpSecreto

> **totpSecreto**: `string` \| `null`

***

### totpActivo

> **totpActivo**: `boolean`

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

### empresaIds

#### Get Signature

> **get** **empresaIds**(): `string`[]

Todas las empresas a las que puede levantar tickets en el portal (la principal primero).

##### Returns

`string`[]

***

### rol

#### Get Signature

> **get** **rol**(): `"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

El rol de mayor alcance. Se usa donde antes se leía un solo `rol` (badges, `data-role`…).

##### Returns

`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

***

### rolPrincipal

#### Get Signature

> **get** **rolPrincipal**(): `"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

##### Returns

`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

***

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

***

### esTecnico

#### Get Signature

> **get** **esTecnico**(): `boolean`

¿Puede tomar tickets como técnico (aparece en dropdowns de asignación)?

##### Returns

`boolean`

## Methods

### agregarEmpresa()

> **agregarEmpresa**(`empresaId`): `void`

Suma una empresa a la cuenta; si no tenía principal, esa pasa a ser la principal.

#### Parameters

##### empresaId

`string`

#### Returns

`void`

***

### tieneRol()

> **tieneRol**(`rol`): `boolean`

#### Parameters

##### rol

`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

#### Returns

`boolean`

***

### cambiarRoles()

> **cambiarRoles**(`roles`, `ahora`): `void`

Reemplaza el conjunto de roles validando coherencia (`cliente` es exclusivo).

#### Parameters

##### roles

(`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`)[]

##### ahora

`Date`

#### Returns

`void`

***

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

***

### fijarEncabezado()

> **fijarEncabezado**(`encabezado`, `ahora`): `void`

#### Parameters

##### encabezado

`string`

##### ahora

`Date`

#### Returns

`void`
