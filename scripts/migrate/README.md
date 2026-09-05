# Migración desde el CRM viejo

El CRM DATTASOFT original tiene su propio botón "Respaldar" (topbar) que descarga un JSON
completo de la app: `{version, app, fecha, datos: {clientes, contactos, tickets, papelera,
usuarios, knowledge_base, bitacora, versionesMercado, cartasTecnicas, configTickets, ...}}`.
Estos scripts trasladan ese respaldo al modelo por colecciones de ds-hd, en el proyecto
Firebase real (`ds-hd-b4939`). No hace falta acceso directo al proyecto Firebase viejo — el
respaldo ya trae todo lo necesario.

## Flujo

```bash
# 1. Descargar el respaldo más reciente desde el CRM viejo (botón "Respaldar" en la barra
#    superior) — o usar uno que el usuario ya tenga guardado.

# 2. Dry-run contra el proyecto real (usa .env.real o el .env que apunte a ds-hd-b4939)
tsx scripts/migrate/run-all.ts --dry-run --input=/ruta/al/respaldo.json

# 3. Migración real
tsx scripts/migrate/run-all.ts --input=/ruta/al/respaldo.json

# 4. Verificar
tsx scripts/migrate/99-verify-migration.ts
```

## Notas

- **Idempotente**: los ids se generan de forma determinista (slug del nombre o hash de campos
  estables — el respaldo viejo no trae ids propios salvo la base de conocimiento). Correr el
  script dos veces no duplica nada.
- **Usuarios NO se crean por script**: `importarUsuarios` solo reporta qué correos del
  respaldo no tienen cuenta todavía en ds-hd — el alta real es por invitación desde
  `/app/usuarios` (la persona pone su propia contraseña). Crear cuentas por script quedó
  descartado a propósito: es el mismo flujo que usaría cualquier alta de personal nueva, no
  solo la migración.
- **Contactos sin empresa emparejada**: el campo `empresa` de cada contacto en el respaldo
  viejo es texto libre, no un id — se empareja por coincidencia exacta de nombre contra las
  empresas ya importadas. Los que no emparejan quedan bajo la empresa placeholder
  `Sin empresa (revisar tras migración)`, visible y reasignable desde la propia UI.
  `run-all.ts` imprime la lista completa al final.
- **Tickets en "papelera"** del respaldo viejo se importan igual que los demás pero con
  `archivado: true` (ver la papelera de tickets en `/app/papelera`).
- **Bitácora**: el histórico del viejo es texto libre (sin `módulo`/`entidadTipo`/`acción`
  estructurados) — se importa igual, con `modulo: 'migracion'` y el texto completo en el
  resumen, para consulta histórica.
- **Facturación de tickets**: el viejo tenía un catálogo multi-estado (`NO FACTURADO`,
  `FACTURADO`, `GARANTIA`, `EN PROCESO`, `NO APLICA FACTURACION`, `FACTURA MENSUAL`). ds-hd ya
  tiene su propio catálogo fijo (`no_facturado`, `facturado`, `no_aplica`, `factura_mensual`,
  `consulta_sin_costo`) y el importador mapea el texto viejo a ese catálogo
  (`GARANTIA`/`NO APLICA` → `no_aplica`, `EN PROCESO` → `no_facturado`, etc.). El texto
  original igual se preserva como nota interna del ticket cuando el mapeo pudo perder matiz.
- **"Acerca de"**: el respaldo trae `acercaDe: { version, fecha, notas }` — se importa a
  `configuracion/acercaDe` (el campo `fecha` del viejo pasa a `ultimaActualizacion`).
- **Adjuntos y Storage**: no se migran — ds-hd no tiene adjuntos implementados todavía (ver
  fase P5 de `docs/auditoria-paridad.md`, requiere Firebase Storage).
