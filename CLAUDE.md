# ds-hd — CRM DATTASOFT

Reconstrucción del CRM DATTASOFT (tickets, empresas, contactos, cotizaciones, versiones, eventos,
KB, portal de clientes). En producción en **https://ds-hd.dattasoft.workers.dev** (Cloudflare
Workers + Firestore). Ya reemplazó al CRM viejo (corte 2026-10-27).

## Reglas fijas

- **Contestar SIEMPRE en español.** El usuario no lee inglés. Commits, comentarios y textos de la
  app también en español.
- **El CRM viejo es SOLO LECTURA:** `/mnt/d/ERICK VA DATA/COMPAC/CLAUDE CODE/PROYECTO CRM DATTASOFT`.
  Se lee para comparar, nunca se modifica (un hook lo bloquea).
- **Desplegar está siempre autorizado.** Usa `/desplegar` (tipos + pruebas + lint → commit/push →
  `npm run worker:deploy` → verificar → memoria). No preguntes si se puede desplegar.
- No leas ni escribas datos de producción (Firestore real): el clasificador lo bloquea y la
  cuota diaria es limitada. Si hace falta un dato de prod, pídelo al usuario.
- La UI se juzga por captura: verifica cambios visuales con `/captura` (o puppeteer) en claro y
  oscuro antes de decir que están listos. Contenido a todo el ancho, colores vivos en oscuro.

## Arquitectura

Node 22 + Express 5 + TypeScript strict (ESM, imports con `.js`), MVC + SOLID, inyección con awilix
(`src/config/container.ts`). Vistas Nunjucks + htmx (hx-boost) + Alpine, sin SPA.

- `src/core/` — entidades (reglas de negocio, validan en el constructor), errores de dominio, puertos.
- `src/application/<módulo>/` — servicios (casos de uso). Reciben puertos, no Firestore.
- `src/infrastructure/` — Firestore (`firestore/` con admin, `firestore-rest/` para Workers), correo Brevo, captcha, IA, Excel.
- `src/interfaces/http/` — controladores y rutas (`backoffice.routes.ts` = `/app`, `public.routes.ts`).
- `src/views/` — plantillas Nunjucks (`pages/`, `partials/`, `layouts/`).
- `src/assets/` — CSS/JS fuente; se compilan a `public/build/` con `npm run build:assets` (un hook lo hace solo al editar con Edit/Write; si editas con sed/python, corre `npm run build:assets` a mano).
- `src/main.worker.ts` — entrada del Worker; los crons horarios están en `JOBS_POR_CRON`.

## Pruebas

- `npx vitest run` — unitarias, contrato y e2e (supertest con `makeTestApp` de `test/helpers/app.ts`, repos en memoria de `test/fakes/`). Las variables de entorno de prueba ya vienen en `vitest.config.ts`.
- `npx tsc --noEmit -p .` y `npm run lint` (exige JSDoc en funciones exportadas).
- Todo cambio de lógica lleva prueba; los e2e van en `test/e2e/<módulo>.test.ts`.

## Trampas conocidas

- **Workers:** librerías que solo corren en Node (exceljs, multer…) tumban el Worker entero. Antes de agregar una dependencia, pruébala con `npm run worker:dev`. Excel se hace con `FflateExcelIO`.
- **Presupuesto por petición del Worker:** operaciones masivas (importar, enviar muchos correos) se trocean en lotes (p. ej. 25 envíos por clic).
- **Nunjucks:** `selectattr` no compara valores; un `set` dentro de `for` no sale del ciclo (cuenta con `push` a una lista); `{...}[x]` en línea no funciona (primero `set` el diccionario).
- **Fechas:** se muestran en hora de México (`ZONA_MEXICO`); un `datetime-local` se interpreta como hora de México.
- **Firestore:** arreglos dentro de un documento guardan fechas como texto ISO; los contadores del menú tienen caché de 2 min (olvídala con `cacheContadores.delete(container)` tras cambiar lo que cuentan).
- **CSS nuevo con hx-boost:** no carga hasta F5; díselo al usuario tras desplegar cambios de CSS.
- **Correo:** Brevo (`IEmailSender`); el entrante llega por CloudMailin (máx. 512 KB) y respuestas con imagen por la API de Zoho cada 5 min.
