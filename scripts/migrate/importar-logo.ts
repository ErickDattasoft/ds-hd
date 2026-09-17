import 'dotenv/config';
/**
 * Importa `datos.logoEmpresa` del respaldo del CRM viejo a `ConfiguracionLogo`. Se quedó
 * pendiente en la migración original (importers.ts solo lo menciona en un comentario, nunca
 * lo escribe) — el logo nunca llegó a producción.
 *
 * Uso:
 *   DOTENV_CONFIG_PATH=.env.real npx tsx scripts/migrate/importar-logo.ts --input=/ruta/al/respaldo.json
 */
import { readFileSync } from 'node:fs';
import { buildContainer } from '../../src/config/container.js';
import { loadConfig } from '../../src/config/env.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';

const inputArg = process.argv.find((a) => a.startsWith('--input='));
if (!inputArg) throw new Error('Falta --input=/ruta/al/respaldo.json');
const ruta = inputArg.slice('--input='.length);

const backup = JSON.parse(readFileSync(ruta, 'utf8')) as { datos?: { logoEmpresa?: string } };
const dataUri = backup.datos?.logoEmpresa;
if (!dataUri) throw new Error('El respaldo no trae datos.logoEmpresa');

const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUri);
const contentType = m?.[1];
const base64 = m?.[2];
if (!contentType || !base64) throw new Error('logoEmpresa no tiene forma de data URI reconocible');

const actorSistema: SessionUser = {
  uid: 'migracion',
  nombre: 'Migración',
  email: 'migracion@dattasoft.mx',
  roles: ['admin'],
  rol: 'admin',
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  esTecnico: false,
  permisos: ['configuracion:catalogos'],
};

const c = buildContainer(loadConfig());
const configLogo = c.resolve('configuracionLogoService');

const existente = await configLogo.obtener();
if (existente) {
  console.log(`Ya hay un logo configurado (${existente.contentType}, ${existente.tamano} bytes) — no se sobreescribe.`);
  console.log('Si de verdad quieres reemplazarlo, bórralo primero desde Configuración → Apariencia.');
  process.exit(0);
}

await configLogo.actualizar(actorSistema, { contentType, base64 });
const guardado = await configLogo.obtener();
console.log(`Logo importado: ${guardado?.contentType}, ${guardado?.tamano} bytes.`);
process.exit(0);
