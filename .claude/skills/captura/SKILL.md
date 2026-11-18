---
name: captura
description: Toma capturas de pantallas de ds-hd (celular y escritorio, tema claro y oscuro) con datos de prueba en memoria, para revisar cómo se ve un cambio antes de decir que está listo o para enseñárselo al usuario. Usar con «/captura <pantalla>», «cómo se ve», «toma captura», o tras cualquier cambio visual (CSS, plantillas .njk).
argument-hint: "<qué pantalla, p. ej. «invitación estilo navidad» o «/app/tickets»>"
---

# Capturas de ds-hd

Usa el helper `capturar()` de `test/helpers/captura.ts`: levanta la app con repos en memoria
(sin Firebase), inicia sesión como admin si la ruta es `/app/...` y guarda un .png por
ruta × vista (celular 390 px, escritorio 1440 px) × tema (claro, oscuro).

## Pasos

1. **Decide qué capturar** a partir de `$ARGUMENTS`: la ruta (o rutas) y qué datos necesita la
   pantalla para verse realista (un evento con lugar y programa, tickets con varios estados,
   una empresa con contactos…). Nombres y datos en español y creíbles, nunca datos reales de
   clientes.

2. **Compila el CSS/JS** por si se editó con sed/python: `npm run build:assets`.

3. **Escribe un test temporal** `test/zz-captura.test.ts` (el prefijo `zz-` está en .gitignore):

   ```ts
   import { it } from 'vitest';
   import { capturar } from './helpers/captura.js';
   import { Evento } from '../src/core/entities/Evento.js';

   it('captura', async () => {
     const archivos = await capturar({
       carpeta: '<SCRATCHPAD>/cap',            // ruta absoluta del scratchpad de la sesión
       rutas: ['/eventos/ev1'],
       // vistas: ['celular'], temas: ['claro'], completa: true,   // opcionales
       sembrar: (t) => {
         t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Posada 2026', tipo: 'presencial',
           estilo: 'navidad', fechaHora: new Date(Date.now() + 20 * 86400000), estado: 'publicado' }));
       },
       // antes: async (page) => { await page.click('summary'); },  // abrir algo antes de la foto
     });
     console.log(archivos.join('\n'));
   }, 120_000);
   ```

   Los repos en memoria disponibles están en `TestApp` (`test/helpers/app.ts`): `eventoRepo`,
   `ticketRepo`, `empresaRepo`, `contactoRepo`, etc. Para ver qué campos lleva cada entidad,
   lee su constructor en `src/core/entities/`.

4. **Córrelo** (crea antes la carpeta; el filtro quita el registro de peticiones del servidor):
   `mkdir -p <SCRATCHPAD>/cap && npx vitest run test/zz-captura.test.ts 2>&1 | grep -E "\.png$|Tests |FAIL|Error:" | head -40`

5. **Borra el test temporal**: `rm test/zz-captura.test.ts`.

6. **Mira las imágenes** con Read (cada .png) y revisa de verdad: que el CSS nuevo se aplique,
   textos cortados, contraste en oscuro, que en celular no haya scroll horizontal, alineación.
   Si algo se ve mal, corrígelo y repite.

7. **Responde en español**: qué revisaste y qué se ve bien o mal. Si el usuario quiere verlas,
   da la ruta absoluta completa de cada .png.
