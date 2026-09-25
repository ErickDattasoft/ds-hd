[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/migracion/MigracionCrmViejoService](../README.md) / MigracionCrmViejoService

# Class: MigracionCrmViejoService

Importa un respaldo del CRM viejo (botón "Respaldar" de la app original) desde la UI, con
la misma lógica exacta que `scripts/migrate/run-all.ts` — ambos consumen los importadores
de `importadores.ts`, así que no hay dos versiones que se puedan desincronizar.

Es distinto de `BackupService`: ese restaura el formato propio de ds-hd, este traduce el
formato del CRM viejo (`{datos: {clientes, contactos, tickets, ...}}`) al modelo nuevo.

Los adjuntos de tickets NO se migran por aquí: viven en el Firestore del CRM viejo y
requieren su service account, que solo tiene el script (`importarAdjuntos`).

## Constructors

### Constructor

> **new MigracionCrmViejoService**(`c`): `MigracionCrmViejoService`

#### Parameters

##### c

`Container`

#### Returns

`MigracionCrmViejoService`

## Methods

### importar()

> **importar**(`actor`, `raw`, `__namedParameters`): `Promise`\<[`ResultadoImportacion`](../interfaces/ResultadoImportacion.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### raw

`Record`\<`string`, `unknown`\>

##### \_\_namedParameters

[`OpcionesImportarCrmViejo`](../interfaces/OpcionesImportarCrmViejo.md)

#### Returns

`Promise`\<[`ResultadoImportacion`](../interfaces/ResultadoImportacion.md)\>
