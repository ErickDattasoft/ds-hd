[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/migracion/importadores](../README.md) / crearImportadores

# Function: crearImportadores()

> **crearImportadores**(`__namedParameters`): `object`

Crea el juego de importadores atado a unas opciones. El closure es lo que permite que el
cuerpo de cada importador siga escribiendo `log(...)` y `DRY_RUN` como cuando esto vivía
en `scripts/migrate/` — sin globales de proceso, que en el worker no existen.

## Parameters

### \_\_namedParameters

[`OpcionesImportacion`](../interfaces/OpcionesImportacion.md)

## Returns

### importarEmpresas

> **importarEmpresas**: (`c`, `datos`) => `Promise`\<\{ `ok`: `number`; `total`: `number`; `sobrantes`: `string`[]; \}\>

Empresas (`clientes`, campos en MAYÚSCULAS)

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<\{ `ok`: `number`; `total`: `number`; `sobrantes`: `string`[]; \}\>

### importarContactos

> **importarContactos**: (`c`, `datos`) => `Promise`\<\{ `ok`: `number`; `sinEmpresa`: `string`[]; `total`: `number`; `sobrantes`: `string`[]; \}\>

Contactos (empareja `empresa` de texto contra el nombre real de la empresa)

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<\{ `ok`: `number`; `sinEmpresa`: `string`[]; `total`: `number`; `sobrantes`: `string`[]; \}\>

### importarTickets

> **importarTickets**: (`c`, `datos`) => `Promise`\<\{ `ok`: `number`; `total`: `number`; \}\>

Tickets activos + los de "papelera" (que entran con `archivado: true`), resolviendo
antes las colisiones de folio contra lo que ya existe en ds-hd.

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<\{ `ok`: `number`; `total`: `number`; \}\>

### importarEventos

> **importarEventos**: (`c`, `datos`) => `Promise`\<\{ `ok`: `number`; `total`: `number`; \}\>

Eventos (`eventos`: los del módulo de invitaciones del CRM viejo, con su lista de empresas
invitadas y sus invitados externos "extras").

Entran SIEMPRE como borrador: publicar abre el registro público de ds-hd, que el CRM viejo
no tenía, y eso no puede pasar como efecto colateral de una importación. Las inscripciones
no vienen en el respaldo (viven en otra colección del Firestore viejo), solo las
invitaciones dirigidas — que es justo el seguimiento que se quiere conservar.

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<\{ `ok`: `number`; `total`: `number`; \}\>

### importarCotizaciones

> **importarCotizaciones**: (`c`, `datos`) => `Promise`\<\{ `ok`: `number`; `total`: `number`; `sinEmpresa`: `string`[]; \}\>

Cotizaciones (`cotizaciones`), conservando el folio original (`numero`, p. ej.
"COT-2026-007") — el mismo criterio que con los folios de tickets.

El CRM viejo marcaba el IVA por renglón (`tieneIVA`) y ds-hd lleva una sola tasa por
cotización: si ningún renglón llevaba IVA la cotización queda con tasa 0, y si el archivo
mezcla renglones con y sin IVA se avisa por bitácora para revisarla a mano.

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<\{ `ok`: `number`; `total`: `number`; `sinEmpresa`: `string`[]; \}\>

### importarVersiones

> **importarVersiones**: (`c`, `datos`) => `Promise`\<`number`\>

Versiones de sistemas (`versionesMercado` + `cartasTecnicas`, dos dicts sistema→valor)

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<`number`\>

### importarKB

> **importarKB**: (`c`, `datos`) => `Promise`\<`number`\>

Base de conocimiento (`knowledge_base`, ya trae `_id`)

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<`number`\>

### importarBitacora

> **importarBitacora**: (`c`, `datos`) => `Promise`\<`number`\>

Bitácora (histórico de texto libre — no tiene la estructura módulo/entidad del nuevo)

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<`number`\>

### importarConfiguracionTickets

> **importarConfiguracionTickets**: (`c`, `datos`) => `Promise`\<`boolean`\>

Configuración de tickets real (reemplaza los valores por defecto)

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<`boolean`\>

### importarConfiguracionAvisos

> **importarConfiguracionAvisos**: (`c`, `datos`) => `Promise`\<`boolean`\>

Plantillas de aviso de Versiones/Licencias y sus contactos de soporte.

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<`boolean`\>

### importarAcercaDe

> **importarAcercaDe**: (`c`, `datos`) => `Promise`\<`boolean`\>

"Acerca de" (`acercaDe: { version, fecha, notas }` en el respaldo del CRM viejo)

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<`boolean`\>

### importarUsuarios

> **importarUsuarios**: (`c`, `datos`) => `Promise`\<`number`\>

No crea cuentas (requiere Firebase Auth real) — solo avisa cuáles faltan por invitar.

#### Parameters

##### c

`Container`

##### datos

`Dato`

#### Returns

`Promise`\<`number`\>
