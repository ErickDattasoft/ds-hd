[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/AcercaDe](../README.md) / AcercaDe

# Interface: AcercaDe

"Acerca de" — ficha de identidad de la aplicación (paridad con el modal del CRM viejo).

Se divide en dos: [INFO\_APP](../variables/INFO_APP.md) es fijo (nombre, autoría, stack, enlaces de infraestructura)
y vive en el código; AcercaDe es la parte editable por un admin y se guarda en el
documento singleton `configuracion/acercaDe`.

## Properties

### version

> **version**: `string`

Sobrescribe la versión leída de `package.json`. Vacío = usar `APP_VERSION`.

***

### ultimaActualizacion

> **ultimaActualizacion**: `string`

Texto libre, p. ej. "Septiembre 2026".

***

### notas

> **notas**: `string`

Notas / bitácora de cambios que el admin quiera dejar a la vista.
