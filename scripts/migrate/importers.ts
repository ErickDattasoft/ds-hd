/**
 * Importadores por entidad contra la forma REAL del respaldo (botón "Respaldar" del CRM
 * viejo): `{clientes, contactos, tickets, papelera, usuarios, knowledge_base, bitacora,
 * versionesMercado, cartasTecnicas, configTickets, logoEmpresa, ...}` (ver `lib.ts` para el
 * desempaquetado del wrapper `{version, app, fecha, datos: {...}}`).
 *
 * Ninguno de estos registros trae un id propio (salvo KB, que sí tiene `_id`) — los ids se
 * generan de forma determinista (slug o hash de campos estables) para que correr el script
 * dos veces no duplique nada.
 */
import { Empresa } from '../../src/core/entities/Empresa.js';
import { Contacto } from '../../src/core/entities/Contacto.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import { ArticuloKB } from '../../src/core/entities/ArticuloKB.js';
import type { EntradaBitacora } from '../../src/core/entities/EntradaBitacora.js';
import { PRIORIDADES, type Prioridad } from '../../src/core/entities/value-objects/Prioridad.js';
import type { EstadoFacturacion } from '../../src/core/entities/value-objects/EstadoFacturacion.js';
import { sanearAcercaDe } from '../../src/core/entities/AcercaDe.js';
import { CONFIG_TICKETS_POR_DEFECTO, type ConfiguracionTickets } from '../../src/core/entities/ConfiguracionTickets.js';
import { CONFIG_AVISOS_POR_DEFECTO, type ConfiguracionAvisos, type ContactoSoporte } from '../../src/core/entities/ConfiguracionAvisos.js';
import { CONTADOR_TICKETS } from '../../src/application/tickets/constantes.js';
import { FirestoreRestClient } from '../../src/infrastructure/firestore-rest/FirestoreRestClient.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { arr, DRY_RUN, hashId, log, slug } from './lib.js';
import type { Container } from '../../src/config/container.js';

type Dato = Record<string, unknown>;
const s = (v: unknown): string => (v == null ? '' : String(v)).trim();
const fecha = (v: unknown): Date => {
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (v && typeof v === 'object' && 'seconds' in (v as Dato)) {
    return new Date(Number((v as { seconds: number }).seconds) * 1000);
  }
  return new Date();
};
const NO_APLICA = 'no aplica';
/** El CRM viejo a veces guarda varios correos separados por coma en un solo campo. */
const primerCorreo = (v: unknown): string => s(v).split(/[,;]/)[0]?.trim() ?? '';

// ── Empresas (`clientes`, campos en MAYÚSCULAS) ─────────────────────────────────────────────
export async function importarEmpresas(c: Container, datos: Dato): Promise<{ ok: number; total: number }> {
  const repo = c.resolve('empresaRepo');
  const items = arr(datos.clientes);
  let ok = 0;
  for (const d of items) {
    const nombre = s(d.EMPRESA);
    if (!nombre) {
      log('empresas', `omitida sin nombre: ${JSON.stringify(d).slice(0, 80)}`);
      continue;
    }
    const sistemasDict = (d.SISTEMAS ?? {}) as Record<string, string>;
    const vencimientos = (d.VENCIMIENTOS ?? {}) as Record<string, string>;
    const versionesInstaladas: Record<string, string> = {};
    const sistemasContratados: string[] = [];
    for (const [sistema, valor] of Object.entries(sistemasDict)) {
      const v = s(valor);
      if (v && v.toLowerCase() !== NO_APLICA) {
        versionesInstaladas[sistema] = v;
        sistemasContratados.push(sistema);
      }
    }
    const vigencias: Record<string, string> = {};
    for (const [sistema, fechaIso] of Object.entries(vencimientos)) {
      if (s(fechaIso)) vigencias[sistema] = s(fechaIso);
    }
    try {
      const empresa = new Empresa({
        id: slug(nombre),
        nombre,
        rfc: s(d.RFC) || null,
        telefono: s(d.TELEFONO_1) || s(d.TELEFONO_2) || null,
        email: s(d.CORREO) || s(d.CORREO_2) || null,
        sistemasContratados,
        vigencias,
        versionesInstaladas,
        notas: s(d.CONTACTO) ? `Contacto original del CRM viejo: ${s(d.CONTACTO)}` : null,
      });
      if (!DRY_RUN) await repo.save(empresa);
      ok++;
    } catch (err) {
      log('empresas', `ERROR con "${nombre}": ${err instanceof Error ? err.message : err}`);
    }
  }
  log('empresas', `${ok}/${items.length} importadas`);
  return { ok, total: items.length };
}

const EMPRESA_PLACEHOLDER_ID = 'sin-empresa-migracion';

// ── Contactos (empareja `empresa` de texto contra el nombre real de la empresa) ─────────────
export async function importarContactos(
  c: Container,
  datos: Dato,
): Promise<{ ok: number; sinEmpresa: string[]; total: number }> {
  const empresaRepo = c.resolve('empresaRepo');
  const contactoRepo = c.resolve('contactoRepo');
  // Se arma el mapa desde el respaldo mismo (no con una lectura a Firestore tras importar
  // empresas) — así funciona igual en --dry-run que en la corrida real.
  const porNombre = new Map(
    arr(datos.clientes)
      .map((d) => s(d.EMPRESA))
      .filter(Boolean)
      .map((nombre) => [nombre.toLowerCase(), slug(nombre)]),
  );

  const items = arr(datos.contactos);
  let ok = 0;
  const sinEmpresa: string[] = [];
  let placeholderCreado = false;
  for (const d of items) {
    const nombre = s(d.nombre) || 'Sin nombre';
    const empresaNombre = s(d.empresa);
    let empresaId = porNombre.get(empresaNombre.toLowerCase()) ?? null;
    if (!empresaId) {
      sinEmpresa.push(`${nombre} (empresa del respaldo: "${empresaNombre}")`);
      empresaId = EMPRESA_PLACEHOLDER_ID;
      // El dominio exige que todo contacto tenga una empresa real — se crea una sola vez
      // como "buzón" para revisar y reasignar los que no emparejaron, desde la propia UI.
      if (!placeholderCreado && !DRY_RUN && !(await empresaRepo.findById(EMPRESA_PLACEHOLDER_ID))) {
        await empresaRepo.save(
          new Empresa({
            id: EMPRESA_PLACEHOLDER_ID,
            nombre: 'Sin empresa (revisar tras migración)',
            notas: 'Contactos migrados cuyo nombre de empresa en el respaldo viejo no emparejó con ninguna empresa real. Reasígnalos desde aquí.',
          }),
        );
        placeholderCreado = true;
      }
    }
    try {
      const contacto = new Contacto({
        id: hashId('con', nombre, s(d.correo), empresaNombre),
        nombre,
        empresaId,
        email: primerCorreo(d.correo) || null,
        telefono: s(d.telefono1) || null,
        celular: s(d.telefono2) || null,
      });
      if (!DRY_RUN) await contactoRepo.save(contacto);
      ok++;
    } catch (err) {
      log('contactos', `ERROR con "${nombre}": ${err instanceof Error ? err.message : err}`);
    }
  }
  log('contactos', `${ok}/${items.length} importados, ${sinEmpresa.length} sin empresa emparejada`);
  return { ok, sinEmpresa, total: items.length };
}

// ── Tickets (activos + los 5 de "papelera", que se marcan archivado:true) ──────────────────
function prioridadDe(v: unknown): Prioridad {
  const t = s(v);
  return (PRIORIDADES as readonly string[]).includes(t) ? (t as Prioridad) : 'Media';
}

/** Mapea el catálogo textual multi-estado del CRM viejo al catálogo fijo de ds-hd. */
function estadoFacturacionDe(texto: string): EstadoFacturacion {
  switch (texto.trim().toLowerCase()) {
    case 'facturado':
      return 'facturado';
    case 'factura mensual':
      return 'factura_mensual';
    case 'consulta sin costo':
      return 'consulta_sin_costo';
    case 'garantia':
    case 'garantía':
    case 'no aplica':
    case 'no aplica facturacion':
    case 'no aplica facturación':
      return 'no_aplica';
    default:
      // 'no facturado', 'en proceso', vacío o desconocido → pendiente de facturar.
      return 'no_facturado';
  }
}

async function importarListaTickets(
  c: Container,
  items: { d: Dato; numero: number; archivado: boolean }[],
): Promise<number> {
  const repo = c.resolve('ticketRepo');
  let ok = 0;
  for (const { d, numero, archivado } of items) {
    const asunto = s(d.asunto) || 'Sin asunto';
    try {
      const facturadoTexto = s(d.facturado);
      // Id por folio FINAL (no el original del respaldo: los que colisionan ya vienen con un
      // folio nuevo asignado en importarTickets). Así los tickets que no colisionaron quedan
      // con exactamente el mismo id que ya tenían de la corrida anterior (reimportar es un
      // no-op para ellos) y solo los que sí colisionaron generan documentos nuevos.
      const id = `tic-${numero}`;
      const ticket = new Ticket({
        id,
        numero,
        asunto,
        descripcion: s(d.descripcion) || '(sin descripción)',
        tipo: s(d.tipo) || 'General',
        sistema: s(d.sistema) || null,
        estado: s(d.estado) || 'Abierto',
        prioridad: prioridadDe(d.prioridad),
        grupo: s(d.grupo) || null,
        canal: 'interno',
        empresaNombre: s(d.empresa) || null,
        contactoNombre: s(d.contacto) || s(d.solicitado) || null,
        contactoCorreo: s(d.contactoCorreo) || null,
        agenteAsignadoNombre: s(d.agente) || null,
        facturacion: {
          estado: estadoFacturacionDe(facturadoTexto),
        },
        // `fechaProgramada`/`horaProgramada` del CRM viejo → agenda del ticket (sin
        // recordatorio: los destinatarios del viejo no se migran, se re-configuran a mano).
        agenda: /^\d{4}-\d{2}-\d{2}$/.test(s(d.fechaProgramada))
          ? { fecha: s(d.fechaProgramada), hora: s(d.horaProgramada) || '09:00', recordatorioWhatsapp: false }
          : null,
        abiertoEn: fecha(d.fechaCreacion),
        createdAt: fecha(d.fechaCreacion),
        updatedAt: fecha(d.fechaActualizacion ?? d.fechaCreacion),
        archivado,
      });
      if (!DRY_RUN) {
        await repo.save(ticket);
        // Nota interna con el texto libre que el viejo guardaba aparte + el estado de
        // facturación textual original (por si el mapeo al catálogo fijo perdió matiz,
        // p. ej. "en proceso" o "garantía").
        const notaInterna = [
          s(d.notasInternas),
          facturadoTexto && facturadoTexto.toLowerCase() !== 'no facturado'
            ? `Facturación original del CRM viejo: ${facturadoTexto}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n');
        if (notaInterna) {
          await repo.agregarNota(ticket.id, {
            id: hashId('nota-interna', ticket.id),
            tipo: 'interna',
            cuerpo: notaInterna,
            autorUid: 'migracion',
            autorNombre: 'Migración',
            createdAt: ticket.createdAt,
          });
        }
        for (const n of arr(d.notas)) {
          const cuerpo = s(n.texto ?? n.cuerpo);
          if (!cuerpo) continue;
          await repo.agregarNota(ticket.id, {
            id: hashId('nota', ticket.id, cuerpo, s(n.fecha)),
            tipo: 'publica',
            cuerpo,
            autorUid: 'migracion',
            autorNombre: s(n.autor) || 'Migración',
            createdAt: fecha(n.fecha),
          });
        }
        // La "actividad" del viejo es texto libre (cambios de estado/asignación/facturación
        // mezclados) — no encaja en `historialEstados` (que es solo estado+fecha), así que se
        // preserva como eventos de la línea de tiempo del ticket, igual que hace el resto de
        // la app para trazabilidad.
        for (const a of arr(d.actividad)) {
          const texto = s(a.texto);
          if (!texto) continue;
          await repo.registrarEvento(ticket.id, {
            id: hashId('evt', ticket.id, texto, s(a.fecha)),
            tipo: 'nota',
            resumen: texto,
            actorUid: null,
            actorNombre: s(a.usuario) || 'Migración',
            at: fecha(a.fecha),
          });
        }
      }
      ok++;
    } catch (err) {
      log('tickets', `ERROR con #${numero} "${asunto}": ${err instanceof Error ? err.message : err}`);
    }
  }
  return ok;
}

export async function importarTickets(c: Container, datos: Dato): Promise<{ ok: number; total: number }> {
  const activos = arr(datos.tickets);
  const papelera = arr(datos.papelera);

  // El máximo folio se calcula contra lo que YA existe en Firestore (no solo contra este
  // archivo): un respaldo más nuevo puede traer menos tickets que uno anterior ya importado
  // (p. ej. si se borraron de la papelera del viejo) y no por eso hay que bajar el contador ni
  // reusar folios de tickets que siguen existiendo en ds-hd.
  const existentes = await c.resolve('ticketQueries').listar({});
  const maxExistente = Math.max(0, ...existentes.map((t) => t.numero));

  // El respaldo viejo tiene folios (`numero`) repetidos entre activos/papelera (y hasta
  // dentro de papelera misma) — son tickets DISTINTOS con folio coincidente, no duplicados a
  // ignorar. Se conserva el original la primera vez que aparece un folio y se reasigna uno
  // nuevo, consecutivo al máximo real, a cada repetición — así nadie pierde su folio de toda
  // la vida salvo el caso realmente colisionado.
  const usados = new Set<number>();
  let siguienteLibre =
    Math.max(maxExistente, ...[...activos, ...papelera].map((d) => Number(d.numero ?? 0))) + 1;
  const renumerados: string[] = [];
  const asignar = (d: Dato, archivado: boolean) => {
    const original = Number(d.numero ?? 0);
    if (!original) return null;
    let numero = original;
    if (usados.has(numero)) {
      numero = siguienteLibre++;
      renumerados.push(`#${original} → #${numero} (${s(d.asunto) || 'sin asunto'})`);
    }
    usados.add(numero);
    return { d, numero, archivado };
  };
  const items = [
    ...activos.map((d) => asignar(d, false)),
    ...papelera.map((d) => asignar(d, true)),
  ].filter((x): x is { d: Dato; numero: number; archivado: boolean } => x !== null);

  const ok = await importarListaTickets(c, items);

  const maxNumero = Math.max(maxExistente, ...items.map((i) => i.numero));
  if (!DRY_RUN && maxNumero > 0) {
    await c.resolve('contadorRepo').fijar(CONTADOR_TICKETS, maxNumero);
  }
  const total = activos.length + papelera.length;
  log(
    'tickets',
    `${ok}/${total} procesados (${activos.length} activos + ${papelera.length} en papelera), contador de folios = ${maxNumero}`,
  );
  if (renumerados.length) {
    log('tickets', `${renumerados.length} folios colisionados, reasignados:`);
    for (const linea of renumerados) log('tickets', `  - ${linea}`);
  }
  return { ok, total };
}

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

// ── Versiones de sistemas (`versionesMercado` + `cartasTecnicas`, dos dicts sistema→valor) ──
export async function importarVersiones(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('versionRepo');
  const versiones = (datos.versionesMercado ?? {}) as Record<string, string>;
  const cartas = (datos.cartasTecnicas ?? {}) as Record<string, string>;
  let n = 0;
  for (const [sistema, versionActual] of Object.entries(versiones)) {
    if (!s(versionActual)) continue;
    if (!DRY_RUN) {
      await repo.save(
        new VersionSistema({
          id: slug(sistema),
          sistema,
          versionActual: s(versionActual),
          linkDescarga: s(cartas[sistema]) || null,
        }),
      );
    }
    n++;
  }
  log('versiones', `${n} sistemas con versión oficial`);
  return n;
}

// ── Base de conocimiento (`knowledge_base`, ya trae `_id`) ──────────────────────────────────
export async function importarKB(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('knowledgeRepo');
  const items = arr(datos.knowledge_base);
  let n = 0;
  for (const d of items) {
    const titulo = s(d.title) || 'Sin título';
    try {
      if (!DRY_RUN) {
        await repo.save(
          new ArticuloKB({
            id: s(d._id) || hashId('kb', titulo),
            titulo,
            categoria: s(d.category) || null,
            cuerpoMarkdown: s(d.content) || '(sin contenido)',
            tags: arr(d.tags as unknown as Dato[]).map(String),
            rutaDestino: s(d.sourcePath) || null,
            // Documentación técnica interna ya publicada en el viejo — visible para staff.
            publicado: true,
            visibilidad: 'staff',
            createdAt: fecha(d.created_at),
            updatedAt: fecha(d.updated_at ?? d.content_updated_at),
          }),
        );
      }
      n++;
    } catch (err) {
      log('kb', `ERROR con "${titulo}": ${err instanceof Error ? err.message : err}`);
    }
  }
  log('kb', `${n}/${items.length} artículos`);
  return n;
}

// ── Bitácora (histórico de texto libre — no tiene la estructura módulo/entidad del nuevo) ──
export async function importarBitacora(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('bitacoraRepo');
  const items = arr(datos.bitacora);
  let n = 0;
  for (const d of items) {
    const msg = s(d.msg);
    if (!msg) continue;
    const entrada: EntradaBitacora = {
      id: hashId('bit', msg, s(d.fecha), s(d.usuario)),
      at: fecha(d.fecha),
      actorUid: null,
      actorNombre: s(d.usuario) || null,
      accion: 'migracion',
      modulo: 'migracion',
      entidadTipo: 'HistorialCrmViejo',
      entidadId: 'n/a',
      resumen: s(d.icon) ? `${d.icon} ${msg}` : msg,
    };
    if (!DRY_RUN) await repo.registrar(entrada);
    n++;
  }
  log('bitacora', `${n}/${items.length} entradas históricas`);
  return n;
}

// ── Configuración de tickets real (reemplaza los valores por defecto) ───────────────────────
export async function importarConfiguracionTickets(c: Container, datos: Dato): Promise<boolean> {
  const cfg = datos.configTickets as Dato | undefined;
  if (!cfg) {
    log('configTickets', 'el respaldo no trae configTickets, se deja el valor por defecto');
    return false;
  }
  const repo = c.resolve('configuracionRepo');
  const sla = (cfg.sla ?? {}) as Record<string, number>;
  const nueva: ConfiguracionTickets = {
    tipos: arr(cfg.tipos as unknown as Dato[]).map(String).length ? (cfg.tipos as string[]) : CONFIG_TICKETS_POR_DEFECTO.tipos,
    sistemas: (cfg.sistemas as string[]) ?? CONFIG_TICKETS_POR_DEFECTO.sistemas,
    grupos: (cfg.grupos as string[]) ?? CONFIG_TICKETS_POR_DEFECTO.grupos,
    estados: (cfg.estados as string[]) ?? CONFIG_TICKETS_POR_DEFECTO.estados,
    prioridades: CONFIG_TICKETS_POR_DEFECTO.prioridades,
    slaHoras: {
      Urgente: Number(sla.Urgente ?? CONFIG_TICKETS_POR_DEFECTO.slaHoras.Urgente),
      Alta: Number(sla.Alta ?? CONFIG_TICKETS_POR_DEFECTO.slaHoras.Alta),
      Media: Number(sla.Media ?? CONFIG_TICKETS_POR_DEFECTO.slaHoras.Media),
      Baja: Number(sla.Baja ?? CONFIG_TICKETS_POR_DEFECTO.slaHoras.Baja),
    },
    tiposFacturables: CONFIG_TICKETS_POR_DEFECTO.tiposFacturables.filter((t) =>
      ((cfg.tipos as string[]) ?? []).includes(t),
    ),
    estadoInicial: s((cfg.defaults as Dato)?.estados) || CONFIG_TICKETS_POR_DEFECTO.estadoInicial,
    correosNotificacion: s(cfg.correoSoporte)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  };
  if (!DRY_RUN) await repo.guardarTickets(nueva);
  log('configTickets', `catálogos reales importados (${nueva.tipos.length} tipos, ${nueva.estados.length} estados)`);
  return true;
}

// ── Plantillas de aviso de Versiones/Licencias (`plantillaMensaje`, `plantillaLicencias`,
// contactos de soporte dentro de `configTickets`) — comparten el nombre de comodines que ya
// usaba el viejo (`[contacto]`, `[empresa]`, `[sistemas_pendientes]`, `[contacto_soporte]`).
function contactosDe(v: unknown): ContactoSoporte[] {
  return arr(v as Dato[])
    .map((c) => ({ nombre: s(c.nombre), telefono: s(c.telefono) }))
    .filter((c) => c.nombre || c.telefono);
}

export async function importarConfiguracionAvisos(c: Container, datos: Dato): Promise<boolean> {
  const cfg = (datos.configTickets ?? {}) as Dato;
  const plantillaVersiones = s(datos.plantillaMensaje);
  const plantillaLicencias = s(datos.plantillaLicencias);
  if (!plantillaVersiones && !plantillaLicencias) {
    log('configAvisos', 'el respaldo no trae plantillas de aviso, se dejan las de por defecto');
    return false;
  }
  // Si el respaldo no tiene contactos específicos de versiones/licencias, cae al general
  // `contactosSoporte` (así lo hacía el viejo: un solo directorio, comodín compartido).
  const generales = contactosDe(cfg.contactosSoporte);
  const contactosSoporteVersiones = contactosDe(cfg.contactosSoporteVersiones);
  const contactosSoporteLicencias = contactosDe(cfg.contactosSoporteLicencias);
  const nueva: ConfiguracionAvisos = {
    plantillaVersiones: plantillaVersiones || CONFIG_AVISOS_POR_DEFECTO.plantillaVersiones,
    plantillaLicencias: plantillaLicencias || CONFIG_AVISOS_POR_DEFECTO.plantillaLicencias,
    contactosSoporteVersiones: contactosSoporteVersiones.length ? contactosSoporteVersiones : generales,
    contactosSoporteLicencias: contactosSoporteLicencias.length ? contactosSoporteLicencias : generales,
  };
  if (!DRY_RUN) await c.resolve('configuracionRepo').guardarAvisos(nueva);
  log('configAvisos', 'plantillas y contactos de soporte reales importados');
  return true;
}

// ── "Acerca de" (`acercaDe: { version, fecha, notas }` en el respaldo del CRM viejo) ────────
export async function importarAcercaDe(c: Container, datos: Dato): Promise<boolean> {
  const raw = datos.acercaDe as Dato | undefined;
  if (!raw || typeof raw !== 'object') {
    log('acercaDe', 'el respaldo no trae "Acerca de", se deja el valor por defecto');
    return false;
  }
  const nueva = sanearAcercaDe({
    version: s(raw.version),
    // El viejo guardaba el texto de fecha en `fecha`; el nuevo lo llama `ultimaActualizacion`.
    ultimaActualizacion: s(raw.ultimaActualizacion ?? raw.fecha),
    notas: s(raw.notas),
  });
  if (!DRY_RUN) await c.resolve('configuracionRepo').guardarAcercaDe(nueva);
  log('acercaDe', 'contenido de "Acerca de" importado');
  return true;
}

// ── Usuarios (`usuarios`, ya sembrados a mano — este importador solo reporta, no crea nada) ─
/** No crea cuentas (requiere Firebase Auth real) — solo avisa cuáles faltan por invitar. */
export async function importarUsuarios(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('usuarioRepo');
  const items = arr(datos.usuarios);
  let faltantes = 0;
  for (const d of items) {
    const email = s(d.authEmail ?? d.email).toLowerCase();
    const nombre = s(d.nombre);
    if (!email || email === 'invitado@dattasoft.mx') continue; // cuenta de prueba del viejo
    if (await repo.findByEmail(email)) {
      log('usuarios', `${email} ya existe, se omite`);
      continue;
    }
    faltantes++;
    log(
      'usuarios',
      `${email} (${nombre}) no existe en ds-hd y no se puede crear aquí sin cuenta de Auth ` +
        `real — dalo de alta por invitación desde /app/usuarios.`,
    );
  }
  return faltantes;
}
