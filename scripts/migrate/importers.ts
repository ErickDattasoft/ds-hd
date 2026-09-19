/**
 * Lo que queda aquí del importador del CRM viejo: SOLO los adjuntos de tickets, que no pueden
 * correr desde la UI — su contenido vive en el Firestore del CRM viejo y hace falta su service
 * account, que solo existe en disco (ver `ubicarSaViejo`).
 *
 * El resto de los importadores (empresas, contactos, tickets, KB, bitácora, configuración) se
 * mudó a `src/application/migracion/importadores.ts` para que el botón "Importar respaldo del
 * CRM viejo" de la app y estos scripts compartan exactamente la misma lógica. Se reexportan
 * abajo atados a las opciones de la línea de comandos (`--dry-run` y `console.log`), así que
 * los scripts los siguen usando igual que antes.
 */
import { FirestoreRestClient } from '../../src/infrastructure/firestore-rest/FirestoreRestClient.js';
import { crearImportadores } from '../../src/application/migracion/importadores.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { arr, DRY_RUN, fechaDe as fecha, log } from './lib.js';
import type { Container } from '../../src/config/container.js';

type Dato = Record<string, unknown>;
const s = (v: unknown): string => (v == null ? '' : String(v)).trim();

export const {
  importarEmpresas,
  importarContactos,
  importarTickets,
  importarEventos,
  importarCotizaciones,
  importarVersiones,
  importarKB,
  importarBitacora,
  importarConfiguracionTickets,
  importarConfiguracionAvisos,
  importarAcercaDe,
  importarUsuarios,
} = crearImportadores({ dryRun: DRY_RUN, log });

interface SaViejo {
  client_email: string;
  private_key: string;
  project_id?: string;
}

/**
 * Localiza la service account del CRM viejo (`agenda-crm-netlify`) para migrar adjuntos.
 * Sin configurar nada: busca `scripts/migrate/crm-viejo-sa.json` (gitignored) o cualquier
 * `agenda-crm-netlify-firebase-adminsdk-*.json` en `scripts/migrate/` o la raíz del repo.
 * Alternativas: env `CRM_VIEJO_SA_B64` (JSON en base64) o `CRM_VIEJO_SA_JSON` (ruta).
 */
function ubicarSaViejo(): SaViejo | null {
  const { CRM_VIEJO_SA_B64, CRM_VIEJO_SA_JSON } = process.env;
  if (CRM_VIEJO_SA_B64) {
    return JSON.parse(Buffer.from(CRM_VIEJO_SA_B64, 'base64').toString('utf8')) as SaViejo;
  }
  const raiz = process.cwd();
  const candidatos = [
    CRM_VIEJO_SA_JSON,
    join(raiz, 'scripts', 'migrate', 'crm-viejo-sa.json'),
    ...['scripts/migrate', '.'].flatMap((dir) => {
      const abs = join(raiz, dir);
      try {
        return readdirSync(abs)
          .filter((f) => /^agenda-crm-netlify-firebase-adminsdk-.*\.json$/.test(f))
          .map((f) => join(abs, f));
      } catch {
        return [];
      }
    }),
  ].filter((p): p is string => Boolean(p) && existsSync(p!));
  if (!candidatos[0]) return null;
  return JSON.parse(readFileSync(candidatos[0], 'utf8')) as SaViejo;
}

// ── Adjuntos de tickets ────────────────────────────────────────────────────────────────────
//
// El respaldo ("Respaldar") trae SOLO las referencias (`ticket.adjuntos = [{adjId, nombre,
// tipo, size}]`); el contenido vive en la colección `tickets_adjuntos` del Firestore del CRM
// viejo (proyecto `agenda-crm-netlify`). Este paso lee ese proyecto directo con su service
// account (ver `ubicarSaViejo`) y copia cada adjunto a `tickets_adjuntos` de ds-hd, ligado por
// `ticketId=tic-<folio>`. Se omite (sin fallar) si no encuentra la SA del viejo. Idempotente:
// el doc de ds-hd usa el id `mig-<adjId>`.
export async function importarAdjuntos(c: Container, datos: Dato): Promise<number> {
  const sa = ubicarSaViejo();
  if (!sa) {
    log(
      'adjuntos',
      'sin service account del CRM viejo — se omiten. Copia el JSON a scripts/migrate/crm-viejo-sa.json (o define CRM_VIEJO_SA_B64).',
    );
    return 0;
  }
  const viejo = new FirestoreRestClient({
    projectId: sa.project_id ?? 'agenda-crm-netlify',
    serviceAccount: sa,
  }) as unknown as {
    doc(path: string): { get(): Promise<{ exists: boolean; data(): Dato | undefined }> };
  };
  const adjRepo = c.resolve('adjuntoTicketRepo');
  const ticketRepo = c.resolve('ticketRepo');

  let ok = 0;
  let saltados = 0;
  for (const t of [...arr(datos.tickets), ...arr(datos.papelera)]) {
    const refs = arr(t.adjuntos);
    const numero = Number(t.numero ?? 0);
    if (!refs.length || !numero) continue;
    const ticketId = `tic-${numero}`;
    if (!(await ticketRepo.findById(ticketId))) {
      log('adjuntos', `ticket #${numero} no está en ds-hd — se omiten sus ${refs.length} adjunto(s)`);
      saltados += refs.length;
      continue;
    }
    for (const ref of refs) {
      const adjId = s(ref.adjId);
      if (!adjId) continue;
      try {
        const snap = await viejo.doc(`tickets_adjuntos/${adjId}`).get();
        const d = snap.exists ? snap.data() : undefined;
        const dataUrl = s(d?.data);
        if (!dataUrl) {
          log('adjuntos', `adjunto ${adjId} sin contenido en el CRM viejo — se omite`);
          saltados++;
          continue;
        }
        if (dataUrl.length > 1_000_000) {
          log('adjuntos', `adjunto ${adjId} "${s(d?.nombre)}" supera el límite de 1 MiB de un doc — se omite`);
          saltados++;
          continue;
        }
        const contentType = s(d?.tipo) || s(ref.tipo) || 'application/octet-stream';
        const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
        if (!DRY_RUN) {
          await adjRepo.crear({
            id: `mig-${adjId}`,
            ticketId,
            nombre: s(d?.nombre) || s(ref.nombre) || 'adjunto',
            contentType,
            tamano: Number(d?.size ?? ref.size ?? Math.floor((base64.length * 3) / 4)),
            data: `data:${contentType};base64,${base64}`,
            subidoPorUid: null,
            subidoPorNombre: 'Migración CRM viejo',
            createdAt: fecha(d?.fecha),
          });
        }
        ok++;
      } catch (err) {
        log('adjuntos', `ERROR con adjunto ${adjId}: ${err instanceof Error ? err.message : err}`);
        saltados++;
      }
    }
  }
  log('adjuntos', `${ok} adjunto(s) migrado(s), ${saltados} saltado(s)`);
  return ok;
}
