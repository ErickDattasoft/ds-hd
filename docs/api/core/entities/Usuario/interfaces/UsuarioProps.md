[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Usuario](../README.md) / UsuarioProps

# Interface: UsuarioProps

Props para construir un [Usuario](../classes/Usuario.md).

## Properties

### uid

> **uid**: `string`

***

### email

> **email**: `string`

***

### nombre

> **nombre**: `string`

***

### roles?

> `optional` **roles?**: `"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"` \| (`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`)[]

Roles asignados; los permisos efectivos son la unión de todos. No puede quedar vacío.

***

### ~~rol?~~

> `optional` **rol?**: `"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

#### Deprecated

Forma legacy de un solo rol. Se acepta al leer documentos viejos.

***

### permisosExtra?

> `optional` **permisosExtra?**: `string`[]

Permisos concedidos por encima de los de su rol.

***

### permisosRevocados?

> `optional` **permisosRevocados?**: `string`[]

Permisos retirados respecto a los de su rol.

***

### activo?

> `optional` **activo?**: `boolean`

***

### empresaId?

> `optional` **empresaId?**: `string` \| `null`

Empresa asociada; obligatoria para `rol === 'cliente'`.

***

### empresasAdicionales?

> `optional` **empresasAdicionales?**: `string`[]

Otras empresas del cliente (p. ej. un administrador que lleva varias que se facturan aparte).

***

### agente?

> `optional` **agente?**: `Partial`\<[`PerfilAgente`](PerfilAgente.md)\>

***

### firma?

> `optional` **firma?**: `string` \| `null`

Firma que se agrega a las respuestas públicas de tickets, si la tiene configurada.

***

### encabezado?

> `optional` **encabezado?**: `string` \| `null`

Encabezado/plantilla que el usuario inserta al redactar un ticket (con `[fecha]`).

***

### predeterminadosTicket?

> `optional` **predeterminadosTicket?**: [`PredeterminadosTicket`](../../ConfiguracionTickets/interfaces/PredeterminadosTicket.md) \| `null`

Predeterminados propios del ticket nuevo; ganan sobre los de Configuración → Tickets.

***

### contactosSoporte?

> `optional` **contactosSoporte?**: `object`[]

Contactos de soporte propios; si los tiene, sustituyen a los de Configuración en los avisos.

#### nombre

> **nombre**: `string`

#### telefono

> **telefono**: `string`

***

### totpSecreto?

> `optional` **totpSecreto?**: `string` \| `null`

***

### totpActivo?

> `optional` **totpActivo?**: `boolean`

***

### createdAt?

> `optional` **createdAt?**: `Date`

***

### updatedAt?

> `optional` **updatedAt?**: `Date`

***

### lastLoginAt?

> `optional` **lastLoginAt?**: `Date` \| `null`
