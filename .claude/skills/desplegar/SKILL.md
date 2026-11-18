---
name: desplegar
description: Publica ds-hd en producción con todos los pasos de siempre — revisa tipos, pruebas y lint (se detiene si algo falla), hace commit y push, despliega el Worker a Cloudflare, verifica que producción responda y anota el commit en la memoria. Usar cuando el usuario diga «despliega», «sube a producción», «publica», «/desplegar» o al terminar un cambio que ya aprobó.
argument-hint: "[mensaje del commit, opcional]"
---

# Desplegar ds-hd

Producción: https://ds-hd.dattasoft.workers.dev (Cloudflare Workers). Desplegar con
`npm run worker:deploy` está **siempre autorizado** por el usuario. Responder SIEMPRE en español.

Sigue los pasos en orden. Si uno falla, **detente**, explica el error en español y corrígelo
antes de seguir. Nunca despliegues con pruebas o tipos en rojo.

## 1. Revisar qué se va a subir

```bash
git status --short
git diff --stat
```

- Si no hay cambios y tampoco commits sin subir (`git log origin/main..HEAD`), avisa que no hay nada que desplegar y termina.
- Que no vaya nada que no deba: `.env`, respaldos, scripts temporales de captura (`test/zz-*.ts`), archivos de la carpeta del CRM viejo.

## 2. Verificar (se detiene si algo falla)

```bash
npx tsc --noEmit -p .
npx vitest run 2>&1 | grep -E "Tests |FAIL|×" | head -20
npm run lint 2>&1 | grep -E " error | warning " | head -20
```

- Tipos: sin salida = bien.
- Pruebas: debe decir `Tests  N passed (N)`, sin `failed`.
- Lint: sin errores ni advertencias.

## 3. Commit y push

- Si hay cambios sin commit: un commit con mensaje en español estilo convencional
  (`feat(area): …`, `fix(area): …`), describiendo lo que ve el usuario. Si el usuario dio
  mensaje en `$ARGUMENTS`, úsalo. Termina el mensaje con la línea de atribución que indique el
  recordatorio del sistema.
- `git push -q`

## 4. Desplegar

```bash
npm run worker:deploy 2>&1 | grep -E "Version ID|rror|✘" | head -5
```

Debe mostrar `Current Version ID: …`. Si el clasificador de permisos lo bloquea, pide al usuario
que lo autorice en una línea o que corra él `npm run worker:deploy`.

## 5. Verificar producción

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://ds-hd.dattasoft.workers.dev/login
curl -s -o /dev/null -w "%{http_code}\n" https://ds-hd.dattasoft.workers.dev/eventos
```

Ambos deben dar `200`. Si el cambio tiene una página pública, revisa también esa ruta. No
intentes leer ni escribir datos de producción (Firestore): el clasificador lo bloquea.

## 6. Anotar en la memoria

En `MEMORY.md` (entrada «▶️ CONTINUAR AQUÍ»), agrega al inicio, con la fecha de hoy, el hash
corto del commit, `DESPLEGADO`, qué cambió en una frase y qué hay que preguntarle al usuario
(«preguntar si le gustó / si ya funciona»).

## 7. Avisar al usuario

En español, corto: qué quedó en producción, el commit, que pruebas/lint pasaron (con el número
de pruebas) y qué debe probar él. Si algo no se pudo verificar, dilo.
