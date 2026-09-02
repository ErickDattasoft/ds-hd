# Migración desde el CRM viejo

El CRM DATTASOFT original guarda casi todo en un único documento Firestore `agenda/datos`
(más `tickets_publicos`, `knowledge_base`, `inscripciones_evento`, `staff_aprobado`).
Estos scripts lo trasladan al modelo por colecciones de ds-hd, en un proyecto Firebase
**nuevo**.

## Flujo (ventana coordinada, app vieja en solo-lectura)

```bash
# 1. Exportar el doc monolítico + colecciones sueltas del proyecto VIEJO
OLD_FIREBASE_PROJECT_ID=agenda-crm-netlify \
OLD_FIREBASE_SERVICE_ACCOUNT_B64=<base64 del service account viejo> \
  tsx scripts/migrate/00-export-agenda-datos.ts     # → scratchpad/agenda-datos.json

# 2. (opcional) revisar el JSON y ajustar mapeos en importers.ts si los nombres de campo difieren

# 3. Dry-run contra el proyecto NUEVO (usa .env normal de ds-hd)
tsx scripts/migrate/run-all.ts --dry-run

# 4. Migración real (deja usuarios/{uid} con uid = correo, placeholder)
tsx scripts/migrate/run-all.ts

# 5. Usuarios de Firebase Auth (contraseñas) — CLI de Firebase
firebase auth:export usuarios.json --project agenda-crm-netlify
firebase auth:import usuarios.json --project ds-hd-xxxxx \
  --hash-algo=SCRYPT --hash-key=... --salt-separator=... --rounds=8 --mem-cost=14   # parámetros del proyecto viejo

# 6. Reasignar cada usuarios/{uid} al uid real de Auth (dry-run primero)
tsx scripts/migrate/reasignar-uids-auth.ts --dry-run
tsx scripts/migrate/reasignar-uids-auth.ts

# 7. Storage (adjuntos)
gsutil -m rsync -r gs://agenda-crm-netlify.appspot.com gs://ds-hd-xxxxx.appspot.com

# 8. Verificar
tsx scripts/migrate/99-verify-migration.ts
```

## Notas

- **Idempotente**: los importadores usan el id viejo y `set(merge:true)`; repetir no duplica.
  `reasignar-uids-auth.ts` también: un usuario cuyo uid ya coincide con el de Auth se deja
  intacto.
- `importarUsuarios` deja el `uid` = correo como placeholder. `reasignar-uids-auth.ts` busca
  el uid real por correo (`IAuthProvider.getUidByEmail`), reescribe el doc bajo ese uid, fija
  el custom claim de rol y borra el placeholder. Usa `roles-override.json` para corregir el
  rol de correos puntuales (el CRM viejo solo distinguía `admin`/`normal`).
- El CRM viejo tenía nombres de campo inconsistentes; donde el mapeo es incierto hay `TODO`
  en `importers.ts`. Ajusta con el `agenda-datos.json` real antes de la corrida definitiva.
- El proyecto viejo y `agenda/datos` quedan **congelados** como rollback.
