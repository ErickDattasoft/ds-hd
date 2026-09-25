[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/empresas/EmpresaService](../README.md) / DatosEmpresa

# Interface: DatosEmpresa

Datos editables de una empresa (alta o edición).

## Properties

### nombre

> **nombre**: `string`

***

### rfc?

> `optional` **rfc?**: `string`

***

### razonSocial?

> `optional` **razonSocial?**: `string`

***

### direccion?

> `optional` **direccion?**: `string`

***

### telefono?

> `optional` **telefono?**: `string`

***

### telefonoAlternativo?

> `optional` **telefonoAlternativo?**: `string`

***

### email?

> `optional` **email?**: `string`

***

### emailAlternativo?

> `optional` **emailAlternativo?**: `string`

***

### contactoPrincipalId?

> `optional` **contactoPrincipalId?**: `string` \| `null`

Contactos marcados como principal y alternativo; deben ser de esta empresa (lo cuida el controlador).

***

### contactoAlternativoId?

> `optional` **contactoAlternativoId?**: `string` \| `null`

***

### sistemasContratados?

> `optional` **sistemasContratados?**: `string`[]

***

### vigencias?

> `optional` **vigencias?**: `Record`\<`string`, `string`\>

Fecha de vigencia de licencia por sistema, formato ISO `YYYY-MM-DD`.

***

### versionesInstaladas?

> `optional` **versionesInstaladas?**: `Record`\<`string`, `string`\>

Versión instalada por sistema (texto libre).

***

### camposExtra?

> `optional` **camposExtra?**: `object`[]

Campos personalizados libres.

#### etiqueta

> **etiqueta**: `string`

#### valor

> **valor**: `string`

***

### notas?

> `optional` **notas?**: `string`
