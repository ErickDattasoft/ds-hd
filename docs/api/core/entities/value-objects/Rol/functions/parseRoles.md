[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/Rol](../README.md) / parseRoles

# Function: parseRoles()

> **parseRoles**(`value`): (`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`)[]

Valida y normaliza un conjunto de roles (de un formulario o de la BD). Acepta un string
suelto (legacy: `usuarios/{uid}.rol`) o un arreglo. Deduplica y respeta el orden de `ROLES`.
Lanza si queda vacío o si algún valor no es un rol conocido.

## Parameters

### value

`unknown`

## Returns

(`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`)[]
