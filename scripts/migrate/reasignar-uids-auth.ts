import 'dotenv/config';
/**
 * Paso posterior a `firebase auth:import`: reasigna cada `usuarios/{uid}` migrado (con uid
 * placeholder = su correo, ver `importarUsuarios` en importers.ts) al uid real de la cuenta
 * de Firebase Auth ya importada, fija el custom claim de rol y borra el doc placeholder.
 *
 * Requiere que ya hayas corrido, en este orden:
 *   1. `run-all.ts` (deja los usuarios con uid = correo)
 *   2. `firebase auth:export` (proyecto viejo) + `firebase auth:import` (proyecto nuevo)
 *      — ver scripts/migrate/README.md
 *
 * Idempotente: un usuario cuyo uid ya coincide con el de Auth se deja intacto; correr dos
 * veces no duplica ni rompe nada. Usa `roles-override.json` para corregir el rol de correos
 * puntuales (el resto conserva el rol que le asignó `importarUsuarios`).
 *
 * Uso:
 *   tsx scripts/migrate/reasignar-uids-auth.ts --dry-run
 *   tsx scripts/migrate/reasignar-uids-auth.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { parseRol, type Rol } from '../../src/core/entities/value-objects/Rol.js';
import { DRY_RUN, log, nuevoProyecto } from './lib.js';

const OVERRIDES_PATH = join(process.cwd(), 'scripts/migrate/roles-override.json');
const overrides = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8')) as Record<string, string>;

const c = nuevoProyecto();
const usuarios = c.resolve('usuarioRepo');
const auth = c.resolve('authProvider');

const todos = await usuarios.list();
let reasignados = 0;
let yaCorrectos = 0;
let sinCuentaAuth = 0;

for (const u of todos) {
  const email = u.email.value;
  const uidReal = await auth.getUidByEmail(email);

  if (!uidReal) {
    console.warn(`Sin cuenta de Auth para ${email} (¿corriste auth:import?); se omite.`);
    sinCuentaAuth++;
    continue;
  }
  if (uidReal === u.uid) {
    yaCorrectos++;
    continue;
  }

  const override = overrides[email.toLowerCase()];
  const rol: Rol = override ? parseRol(override) : u.rol;

  log(
    'reasignar-uids',
    `${email}: ${u.uid} → ${uidReal}${override ? ` (rol override: ${rol})` : ''}`,
  );
  if (!DRY_RUN) {
    await usuarios.save(
      new Usuario({
        uid: uidReal,
        email,
        nombre: u.nombre,
        rol,
        permisosExtra: u.permisosExtra,
        permisosRevocados: u.permisosRevocados,
        activo: u.activo,
        empresaId: u.empresaId,
        agente: u.agente,
        createdAt: u.createdAt,
      }),
    );
    await auth.setRoleClaim(uidReal, rol);
    await usuarios.delete(u.uid);
  }
  reasignados++;
}

log(
  'reasignar-uids',
  `${reasignados} reasignados, ${yaCorrectos} ya correctos, ${sinCuentaAuth} sin cuenta de Auth (de ${todos.length} totales)`,
);
process.exit(0);
