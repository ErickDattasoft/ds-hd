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
import { Empresa } from '../../core/entities/Empresa.js';
import { Contacto } from '../../core/entities/Contacto.js';
import { Ticket } from '../../core/entities/Ticket.js';
import { VersionSistema } from '../../core/entities/VersionSistema.js';
import { ArticuloKB } from '../../core/entities/ArticuloKB.js';
import { Evento, type RespuestaInvitacion, RESPUESTAS_INVITACION } from '../../core/entities/Evento.js';
import { Cotizacion, type EstadoCotizacion } from '../../core/entities/Cotizacion.js';
import type { EntradaBitacora } from '../../core/entities/EntradaBitacora.js';
import type { EventoTicket, NotaTicket } from '../../core/entities/NotaTicket.js';
import { PRIORIDADES, type Prioridad } from '../../core/entities/value-objects/Prioridad.js';
import type { EstadoFacturacion } from '../../core/entities/value-objects/EstadoFacturacion.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import { sanearAcercaDe } from '../../core/entities/AcercaDe.js';
import { CONFIG_TICKETS_POR_DEFECTO, type ConfiguracionTickets } from '../../core/entities/ConfiguracionTickets.js';
import { CONFIG_AVISOS_POR_DEFECTO, type ConfiguracionAvisos, type ContactoSoporte } from '../../core/entities/ConfiguracionAvisos.js';
import { CONTADOR_TICKETS } from '../tickets/constantes.js';
import { arr, hashId, slug, RE_DIACRITICOS } from './lib.js';
import type { Container } from '../../config/container.js';


/** Cómo se reporta el avance y si se escribe de verdad. */
export interface OpcionesImportacion {
  /** `true` = simulacro: se recorre y valida todo, pero no se escribe nada. */
  dryRun: boolean;
  /** Recibe cada línea de avance (la consola en el script, el resumen HTML en la UI). */
  log: (paso: string, msg: string) => void;
}

/**
 * Crea el juego de importadores atado a unas opciones. El closure es lo que permite que el
 * cuerpo de cada importador siga escribiendo `log(...)` y `DRY_RUN` como cuando esto vivía
 * en `scripts/migrate/` — sin globales de proceso, que en el worker no existen.
 */
export function crearImportadores({ dryRun: DRY_RUN, log }: OpcionesImportacion) {
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
  const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  /**
   * Reparte los correos de uno o varios campos del respaldo en principal y alternativo, como
   * los maneja el CRM viejo. Un campo puede traer varios separados por coma: el primero válido
   * es el principal, el segundo el alternativo, y lo que sobre (o no parezca correo) vuelve en
   * `sobrantes` para dejarlo en las notas y que no se pierda.
   */
  const repartirCorreos = (
    ...campos: unknown[]
  ): { principal: string; alternativo: string; sobrantes: string[] } => {
    const todos = [...new Set(campos.flatMap((v) => s(v).split(/[,;\s]+/)).map((x) => x.trim().toLowerCase()).filter(Boolean))];
    const validos = todos.filter((x) => RE_CORREO.test(x));
    return {
      principal: validos[0] ?? '',
      alternativo: validos[1] ?? '',
      sobrantes: [...validos.slice(2), ...todos.filter((x) => !RE_CORREO.test(x))],
    };
  };

  /** Entero positivo de un campo opcional del respaldo; `null` si viene vacío o no es número. */
  const entero = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
  };

  /**
   * Id del registro nuevo: se respeta el del respaldo cuando es utilizable como id de
   * documento (`ev_1730madeup`, `cot_...`), y si no se deriva uno determinista de sus campos.
   * Respetarlo es lo que hace que reimportar el mismo respaldo no duplique nada.
   */
  const idEstable = async (prefijo: string, idOriginal: string, ...partes: string[]): Promise<string> =>
    /^[A-Za-z0-9_-]{1,120}$/.test(idOriginal) ? idOriginal : hashId(prefijo, ...partes);

  /** `fecha` (YYYY-MM-DD) + `hora` (HH:MM) del CRM viejo → un solo `Date`. */
  const fechaHoraDe = (dia: string, hora: string): Date => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return new Date();
    const d = new Date(`${dia}T${/^\d{2}:\d{2}$/.test(hora) ? hora : '09:00'}:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  /** Días entre la fecha de la cotización y su fecha de vigencia (`null` si no se puede). */
  const diasEntre = (desde: Date, hasta: string): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return null;
    const fin = new Date(`${hasta}T00:00:00`);
    if (Number.isNaN(fin.getTime())) return null;
    const dias = Math.round((fin.getTime() - desde.getTime()) / 86_400_000);
    return dias > 0 ? dias : null;
  };

  /** `"NO_ASISTIRA"` del CRM viejo → `'no_asistira'` del catálogo de ds-hd. */
  const respuestaInvitacionDe = (v: unknown): RespuestaInvitacion => {
    const t = s(v).toLowerCase();
    return (RESPUESTAS_INVITACION as readonly string[]).includes(t) ? (t as RespuestaInvitacion) : 'pendiente';
  };

  /** Estado de cotización del viejo, que ya usa el mismo catálogo textual que ds-hd. */
  const estadoCotizacionDe = (v: unknown): EstadoCotizacion => {
    const t = s(v).toLowerCase();
    const validos = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'];
    return validos.includes(t) ? (t as EstadoCotizacion) : 'borrador';
  };

  /**
   * Nombre de empresa del respaldo (minúsculas) → id que le tocará en ds-hd.
   *
   * El id sale del nombre, y dos nombres distintos pueden dar el mismo slug
   * ("NIUTEC (SERVICLIMAS)" y "NIUTEC - SERVICLIMAS" son los dos `niutec-serviclimas`): sin
   * desempatar, la segunda empresa pisaba a la primera y desaparecía de la lista. Al
   * repetido se le añade un sufijo, siempre en el orden del respaldo, para que el id de cada
   * una siga siendo el mismo en cada reimportación.
   */
  const mapaEmpresasPorNombre = (datos: Dato): Map<string, string> => {
    const porNombre = new Map<string, string>();
    const usados = new Set<string>();
    for (const d of arr(datos.clientes)) {
      const nombre = s(d.EMPRESA);
      if (!nombre) continue;
      const clave = nombre.toLowerCase();
      if (porNombre.has(clave)) continue;
      const base = slug(nombre);
      let id = base;
      for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
      usados.add(id);
      porNombre.set(clave, id);
    }
    return porNombre;
  };

  /**
   * Empresas (`clientes`, campos en MAYÚSCULAS)
   */
  async function importarEmpresas(c: Container, datos: Dato): Promise<{ ok: number; total: number }> {
    const repo = c.resolve('empresaRepo');
    // El contacto principal/alternativo lo fija la sección de contactos (o alguien a mano en
    // ds-hd); reimportar solo empresas no debe borrarlo.
    const yaMarcados = new Map((await repo.list()).map((e) => [e.id, e] as const));
    const items = arr(datos.clientes);
    const porNombre = mapaEmpresasPorNombre(datos);
    const porGuardar: Empresa[] = [];
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
      const id = porNombre.get(nombre.toLowerCase()) ?? slug(nombre);
      if (porGuardar.some((e) => e.id === id)) {
        // Mismo nombre repetido tal cual en el respaldo: es la misma empresa, y meterla dos
        // veces en el mismo lote hace que Firestore rechace la escritura entera.
        log('empresas', `repetida en el respaldo, se importa una sola vez: ${nombre}`);
        continue;
      }
      const telefonos = [s(d.TELEFONO_1), s(d.TELEFONO_2)].filter(Boolean);
      const correos = repartirCorreos(d.CORREO, d.CORREO_2);
      const notas = [
        s(d.CONTACTO) ? `Contacto original del CRM viejo: ${s(d.CONTACTO)}` : '',
        s(d.CONTACTO_2) ? `Contacto alternativo del CRM viejo: ${s(d.CONTACTO_2)}` : '',
        correos.sobrantes.length ? `Otros correos del CRM viejo: ${correos.sobrantes.join(', ')}` : '',
      ].filter(Boolean);
      try {
        const empresa = new Empresa({
          id,
          nombre,
          rfc: s(d.RFC) || null,
          telefono: telefonos[0] ?? null,
          telefonoAlternativo: telefonos[1] ?? null,
          email: correos.principal || null,
          emailAlternativo: correos.alternativo || null,
          sistemasContratados,
          vigencias,
          versionesInstaladas,
          contactoPrincipalId: yaMarcados.get(id)?.contactoPrincipalId ?? null,
          contactoAlternativoId: yaMarcados.get(id)?.contactoAlternativoId ?? null,
          // Se conservan las notas escritas en ds-hd; solo se agregan las líneas del respaldo que falten.
          notas:
            [yaMarcados.get(id)?.notas ?? '', ...notas.filter((l) => !(yaMarcados.get(id)?.notas ?? '').includes(l))]
              .filter(Boolean)
              .join('\n') || null,
        });
        porGuardar.push(empresa);
        ok++;
      } catch (err) {
        log('empresas', `ERROR con "${nombre}": ${err instanceof Error ? err.message : err}`);
      }
    }
    // Una sola escritura para todas: una por empresa son 120 peticiones HTTP y el worker tiene
    // un tope por request que la importación completa se comía entero.
    if (!DRY_RUN) await repo.guardarVarias(porGuardar);
    log('empresas', `${ok}/${items.length} importadas`);
    return { ok, total: items.length };
  }

  const EMPRESA_PLACEHOLDER_ID = 'sin-empresa-migracion';

  /**
   * Empresa "buzón" para los registros del respaldo cuyo nombre de empresa no emparejó con
   * ninguna empresa real: el dominio exige que contactos y cotizaciones cuelguen de una
   * empresa, así que se crea una vez y desde la UI se reasignan a mano.
   */
  async function crearEmpresaPlaceholder(repo: IEmpresaRepository): Promise<void> {
    if (await repo.findById(EMPRESA_PLACEHOLDER_ID)) return;
    await repo.save(
      new Empresa({
        id: EMPRESA_PLACEHOLDER_ID,
        nombre: 'Sin empresa (revisar tras migración)',
        notas: 'Registros migrados cuyo nombre de empresa en el respaldo viejo no emparejó con ninguna empresa real. Reasígnalos desde aquí.',
      }),
    );
  }

  /**
   * Borra la empresa buzón si ya no cuelga nadie de ella: es un apunte de trabajo de la
   * migración, no una empresa del negocio, y mientras exista se cuenta en la lista.
   */
  async function retirarPlaceholderVacio(c: Container): Promise<void> {
    const repo = c.resolve('empresaRepo');
    if (!(await repo.findById(EMPRESA_PLACEHOLDER_ID))) return;
    const ocupado =
      (await c.resolve('contactoRepo').list()).some((x) => x.empresaId === EMPRESA_PLACEHOLDER_ID) ||
      (await c.resolve('ticketQueries').listar({ soloAbiertos: false })).some(
        (t) => t.empresaId === EMPRESA_PLACEHOLDER_ID,
      ) ||
      (await c.resolve('cotizacionRepo').list()).some((x) => x.empresaId === EMPRESA_PLACEHOLDER_ID);
    if (ocupado) return;
    await repo.eliminar(EMPRESA_PLACEHOLDER_ID);
    log('contactos', 'la empresa "Sin empresa (revisar tras migración)" quedó vacía y se retiró');
  }

  /**
   * Contactos (empareja `empresa` de texto contra el nombre real de la empresa)
   */
  async function importarContactos(
    c: Container,
    datos: Dato,
  ): Promise<{ ok: number; sinEmpresa: string[]; total: number }> {
    const empresaRepo = c.resolve('empresaRepo');
    const contactoRepo = c.resolve('contactoRepo');
    // El mapa se arma desde el respaldo mismo (no con una lectura a Firestore tras importar
    // empresas) — así funciona igual en --dry-run que en la corrida real.
    const porNombre = mapaEmpresasPorNombre(datos);

    const items = [...arr(datos.contactos)];
    /**
     * El CRM viejo guarda en la empresa misma su contacto principal (CONTACTO/CORREO/
     * TELEFONO_1) y alternativo (CONTACTO_2/CORREO_2/TELEFONO_2), aparte de la lista de
     * contactos. Su botón "Sincronizar contactos desde empresas" los pasaba a la lista si no
     * estaban; aquí se hace lo mismo para que nadie se quede fuera, y se recuerda quién es
     * cuál para marcarlo en la empresa.
     */
    const claveRol = (empresa: string, nombre: string): string => `${empresa.toLowerCase()}|${nombre.toLowerCase()}`;
    const rolDe = new Map<string, 'principal' | 'alternativo'>();
    const enLista = new Set(items.map((d) => claveRol(s(d.empresa), s(d.nombre))));
    for (const e of arr(datos.clientes)) {
      const empresa = s(e.EMPRESA);
      if (!empresa) continue;
      const roles = [
        { rol: 'principal', nombre: s(e.CONTACTO), correo: s(e.CORREO), tel: s(e.TELEFONO_1) },
        { rol: 'alternativo', nombre: s(e.CONTACTO_2), correo: s(e.CORREO_2), tel: s(e.TELEFONO_2) },
      ] as const;
      for (const r of roles) {
        if (!r.nombre) continue;
        const clave = claveRol(empresa, r.nombre);
        if (!rolDe.has(clave)) rolDe.set(clave, r.rol);
        if (enLista.has(clave)) continue;
        enLista.add(clave);
        items.push({ empresa, nombre: r.nombre, correo: r.correo, telefono1: r.tel, telefono2: '' });
        log('contactos', `"${r.nombre}" era el contacto ${r.rol} de "${empresa}" y no estaba en la lista; se agrega`);
      }
    }
    /** empresaId → ids de su contacto principal y alternativo, según el respaldo. */
    const marcados = new Map<string, { principal?: string; alternativo?: string }>();
    const porGuardar: Contacto[] = [];
    let ok = 0;
    const sinEmpresa: string[] = [];
    let placeholderCreado = false;

    /**
     * Índice de lo que YA está en ds-hd, para reusar el id en vez de crear un contacto nuevo.
     *
     * El id se deriva de nombre+correo+empresa, así que basta con que en el CRM viejo le
     * corrijan el correo a alguien (o que cambie el nombre de su empresa) para que al
     * reimportar salga un id distinto y el contacto quede DUPLICADO. Emparejar primero contra
     * la base corta eso: la persona se reconoce por su correo, y si no lo trae, por su nombre
     * dentro de su empresa.
     */
    const existentes = await contactoRepo.list();
    const norm = (v: string): string =>
      v
        .normalize('NFD')
        .replace(RE_DIACRITICOS, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    // Las dos claves llevan la empresa: un correo compartido (el del despacho contable, el
    // genérico de la oficina) lo usan personas DISTINTAS de empresas distintas, y emparejar
    // solo por correo las fundía en una sola — se perdían contactos al importar.
    const porCorreo = new Map<string, string>();
    const porNombreEmpresa = new Map<string, string>();
    /** Id de documento → identidad (empresa + nombre) que lo reclamó en ESTA corrida. */
    const duenoDeId = new Map<string, string>();
    // Las notas que alguien escribió en ds-hd no vienen en el respaldo: al reimportar se conservan.
    const notasPrevias = new Map(existentes.map((c) => [c.id, c.notas ?? '']));
    const notasCon = (previas: string, sobrantes: string[]): string | null => {
      const faltan = sobrantes.filter((x) => !previas.includes(x));
      return [previas, faltan.length ? `Otros correos del CRM viejo: ${faltan.join(', ')}` : ''].filter(Boolean).join('\n') || null;
    };
    for (const c of existentes) {
      if (c.email) porCorreo.set(`${c.empresaId}|${norm(c.email)}`, c.id);
      porNombreEmpresa.set(`${c.empresaId}|${norm(c.nombre)}`, c.id);
    }

    /**
     * La MISMA persona, vista desde un renglón del respaldo que sí tiene empresa real.
     *
     * Al borrar una empresa en el CRM viejo sus contactos se quedan apuntando al nombre que
     * ya no existe, y esos caían al buzón — que aparece en la lista como una empresa de más.
     * Cuando el respaldo trae a esa misma persona (mismo nombre Y mismo correo) colgando de
     * una empresa que sí existe, y de una sola, se le devuelve esa: es ella, no un registro
     * huérfano que revisar a mano. Si hay varias candidatas no se adivina, va al buzón.
     */
    const empresasDeLaPersona = new Map<string, Set<string>>();
    for (const d of items) {
      const empresaId = porNombre.get(s(d.empresa).toLowerCase());
      if (!empresaId) continue;
      const correo = primerCorreo(d.correo);
      if (!correo) continue;
      const clave = `${norm(s(d.nombre))}|${norm(correo)}`;
      empresasDeLaPersona.set(clave, (empresasDeLaPersona.get(clave) ?? new Set()).add(empresaId));
    }

    for (const d of items) {
      const nombre = s(d.nombre) || 'Sin nombre';
      const empresaNombre = s(d.empresa);
      let empresaId = porNombre.get(empresaNombre.toLowerCase()) ?? null;
      if (!empresaId) {
        const correoDe = primerCorreo(d.correo);
        const candidatas = correoDe ? empresasDeLaPersona.get(`${norm(nombre)}|${norm(correoDe)}`) : undefined;
        if (candidatas?.size === 1) {
          empresaId = [...candidatas][0]!;
          log(
            'contactos',
            `"${nombre}" nombraba la empresa "${empresaNombre}", que ya no está en el respaldo; ` +
              `se reconoce por su correo y se queda en la empresa donde el respaldo ya lo tiene`,
          );
        }
      }
      if (!empresaId) {
        sinEmpresa.push(`${nombre} (empresa del respaldo: "${empresaNombre}")`);
        empresaId = EMPRESA_PLACEHOLDER_ID;
        // El dominio exige que todo contacto tenga una empresa real — se crea una sola vez
        // como "buzón" para revisar y reasignar los que no emparejaron, desde la propia UI.
        if (!placeholderCreado && !DRY_RUN) {
          await crearEmpresaPlaceholder(empresaRepo);
          placeholderCreado = true;
        }
      }
      try {
        const correos = repartirCorreos(d.correo);
        const correo = correos.principal;
        // Se reusa el id del contacto que ya exista (mismo correo, o mismo nombre dentro de la
        // misma empresa); solo cuando no hay contra qué emparejar se genera uno nuevo.
        const identidad = `${empresaId}|${norm(nombre)}`;
        let id =
          (correo ? porCorreo.get(`${empresaId}|${norm(correo)}`) : undefined) ??
          porNombreEmpresa.get(identidad) ??
          (await hashId('con', nombre, s(d.correo), empresaNombre));
        // Dos personas DISTINTAS no pueden acabar en el mismo documento: la segunda escritura
        // pisaba a la primera y se perdía un contacto en silencio. Pasa con dos personas del
        // mismo nombre y correo en empresas distintas: a una el hash le da el id que la otra ya
        // ocupa. Se compara por identidad (empresa + nombre), no por id: si quien ya reclamó
        // ese documento es la MISMA persona —el respaldo la trae capturada dos veces— se
        // comparte a propósito; si es otra, se desempata.
        for (let i = 1; (duenoDeId.get(id) ?? identidad) !== identidad; i++) {
          id = await hashId('con', nombre, s(d.correo), empresaNombre, empresaId, String(i));
        }
        duenoDeId.set(id, identidad);
        const contacto = new Contacto({
          id,
          nombre,
          empresaId,
          email: correo || null,
          emailAlternativo: correos.alternativo || null,
          telefono: s(d.telefono1) || null,
          celular: s(d.telefono2) || null,
          notas: notasCon(notasPrevias.get(id) ?? '', correos.sobrantes),
        });
        const rol = rolDe.get(claveRol(empresaNombre, nombre));
        if (rol && empresaId !== EMPRESA_PLACEHOLDER_ID) {
          const m = marcados.get(empresaId) ?? {};
          m[rol] ??= id;
          marcados.set(empresaId, m);
        }
        porGuardar.push(contacto);
        // El recién importado también entra al índice: si el mismo respaldo trae dos renglones
        // de la misma persona (pasa cuando la capturaron dos veces), el segundo actualiza al
        // primero en vez de sumar otro duplicado.
        if (correo) porCorreo.set(`${empresaId}|${norm(correo)}`, id);
        porNombreEmpresa.set(`${empresaId}|${norm(nombre)}`, id);
        ok++;
      } catch (err) {
        log('contactos', `ERROR con "${nombre}": ${err instanceof Error ? err.message : err}`);
      }
    }
    if (!DRY_RUN) await contactoRepo.guardarVarios(porGuardar);
    // Se marca en cada empresa quién es su principal y su alternativo, como en el CRM viejo.
    const empresasMarcadas: Empresa[] = [];
    for (const e of await empresaRepo.list()) {
      const m = marcados.get(e.id);
      if (!m) continue;
      e.contactoPrincipalId = m.principal ?? e.contactoPrincipalId;
      e.contactoAlternativoId = m.alternativo ?? e.contactoAlternativoId;
      empresasMarcadas.push(e);
    }
    if (!DRY_RUN && empresasMarcadas.length) await empresaRepo.guardarVarias(empresasMarcadas);
    log('contactos', `${empresasMarcadas.length} empresas con contacto principal/alternativo marcado`);
    // El buzón de una corrida anterior, ya vacío, seguía saliendo en la lista como una empresa
    // de más que no existe en el CRM viejo. Si nadie quedó dentro, se retira solo.
    if (!DRY_RUN && !sinEmpresa.length) await retirarPlaceholderVacio(c);
    log('contactos', `${ok}/${items.length} importados, ${sinEmpresa.length} sin empresa emparejada`);
    return { ok, sinEmpresa, total: items.length };
  }

  /**
   * Tickets (activos + los 5 de "papelera", que se marcan archivado:true)
   */
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

  /** Guarda una tanda de tickets ya numerados, con sus notas, actividad y nota interna. */
  async function importarListaTickets(
    c: Container,
    items: { d: Dato; numero: number; archivado: boolean }[],
  ): Promise<number> {
    const repo = c.resolve('ticketRepo');
    // Se acumulan TODOS y se escriben juntos al final: un commit por ticket ya eran 56
    // peticiones con el respaldo real, por encima del tope de subpeticiones de un worker.
    const porGuardar: { ticket: Ticket; notas: NotaTicket[]; eventos: EventoTicket[] }[] = [];
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
          // Notas y eventos se juntan y se escriben CON el ticket en una sola llamada: uno por
          // documento eran cientos de peticiones HTTP y la importación moría a medias contra el
          // tope de subpeticiones del worker (ver `guardarConDetalle`).
          const notas: NotaTicket[] = [];
          const eventos: EventoTicket[] = [];
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
            notas.push({
              id: await hashId('nota-interna', ticket.id),
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
            notas.push({
              id: await hashId('nota', ticket.id, cuerpo, s(n.fecha)),
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
            eventos.push({
              id: await hashId('evt', ticket.id, texto, s(a.fecha)),
              tipo: 'nota',
              resumen: texto,
              actorUid: null,
              actorNombre: s(a.usuario) || 'Migración',
              at: fecha(a.fecha),
            });
          }
          porGuardar.push({ ticket, notas, eventos });
        }
        ok++;
      } catch (err) {
        log('tickets', `ERROR con #${numero} "${asunto}": ${err instanceof Error ? err.message : err}`);
      }
    }
    if (!DRY_RUN) await repo.guardarVariosConDetalle(porGuardar);
    return ok;
  }

  /** Tickets activos + los de "papelera" (que entran con `archivado: true`), resolviendo
   * antes las colisiones de folio contra lo que ya existe en ds-hd. */
  async function importarTickets(c: Container, datos: Dato): Promise<{ ok: number; total: number }> {
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
    const sinFolio: string[] = [];
    const asignar = (d: Dato, archivado: boolean) => {
      const original = Number(d.numero ?? 0);
      if (!original) {
        // Sin folio no hay forma de darle identidad estable al ticket (el id es `tic-<folio>`),
        // así que se omite — pero se dice cuál, que antes desaparecía sin dejar rastro.
        sinFolio.push(`${s(d.asunto) || 'sin asunto'} (${s(d.empresa) || 'sin empresa'})`);
        return null;
      }
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
    if (sinFolio.length) {
      log('tickets', `${sinFolio.length} OMITIDOS por no traer folio en el respaldo:`);
      for (const linea of sinFolio) log('tickets', `  - ${linea}`);
    }
    const perdidos = total - ok;
    if (perdidos > 0) {
      log(
        'tickets',
        `ATENCIÓN: ${perdidos} de ${total} no se importaron (ver las líneas de arriba: sin folio o con ERROR).`,
      );
    }
    return { ok, total };
  }

  /**
   * Versiones de sistemas (`versionesMercado` + `cartasTecnicas`, dos dicts sistema→valor)
   */
  async function importarVersiones(c: Container, datos: Dato): Promise<number> {
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

  /**
   * Base de conocimiento (`knowledge_base`, ya trae `_id`)
   */
  async function importarKB(c: Container, datos: Dato): Promise<number> {
    const repo = c.resolve('knowledgeRepo');
    const items = arr(datos.knowledge_base);
    let n = 0;
    for (const d of items) {
      const titulo = s(d.title) || 'Sin título';
      try {
        if (!DRY_RUN) {
          await repo.save(
            new ArticuloKB({
              id: s(d._id) || (await hashId('kb', titulo)),
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

  /**
   * Bitácora (histórico de texto libre — no tiene la estructura módulo/entidad del nuevo)
   */
  async function importarBitacora(c: Container, datos: Dato): Promise<number> {
    const repo = c.resolve('bitacoraRepo');
    const items = arr(datos.bitacora);
    const porGuardar: EntradaBitacora[] = [];
    let n = 0;
    for (const d of items) {
      const msg = s(d.msg);
      if (!msg) continue;
      const entrada: EntradaBitacora = {
        id: await hashId('bit', msg, s(d.fecha), s(d.usuario)),
        at: fecha(d.fecha),
        actorUid: null,
        actorNombre: s(d.usuario) || null,
        accion: 'migracion',
        modulo: 'migracion',
        entidadTipo: 'HistorialCrmViejo',
        entidadId: 'n/a',
        resumen: s(d.icon) ? `${d.icon} ${msg}` : msg,
      };
      porGuardar.push(entrada);
      n++;
    }
    // 670 entradas = 670 peticiones si se guardan una a una; agrupadas son dos.
    if (!DRY_RUN) await repo.registrarVarias(porGuardar);
    log('bitacora', `${n}/${items.length} entradas históricas`);
    return n;
  }

  /**
   * Configuración de tickets real (reemplaza los valores por defecto)
   */
  async function importarConfiguracionTickets(c: Container, datos: Dato): Promise<boolean> {
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

  /**
   * Plantillas de aviso de Versiones/Licencias (`plantillaMensaje`, `plantillaLicencias`,
   * contactos de soporte dentro de `configTickets`) — comparten el nombre de comodines que ya
   * usaba el viejo (`[contacto]`, `[empresa]`, `[sistemas_pendientes]`, `[contacto_soporte]`).
   */
  function contactosDe(v: unknown): ContactoSoporte[] {
    return arr(v as Dato[])
      .map((c) => ({ nombre: s(c.nombre), telefono: s(c.telefono) }))
      .filter((c) => c.nombre || c.telefono);
  }

  /** Plantillas de aviso de Versiones/Licencias y sus contactos de soporte. */
  async function importarConfiguracionAvisos(c: Container, datos: Dato): Promise<boolean> {
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

  /**
   * "Acerca de" (`acercaDe: { version, fecha, notas }` en el respaldo del CRM viejo)
   */
  async function importarAcercaDe(c: Container, datos: Dato): Promise<boolean> {
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
  async function importarUsuarios(c: Container, datos: Dato): Promise<number> {
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


  /**
   * Eventos (`eventos`: los del módulo de invitaciones del CRM viejo, con su lista de empresas
   * invitadas y sus invitados externos "extras").
   *
   * Entran SIEMPRE como borrador: publicar abre el registro público de ds-hd, que el CRM viejo
   * no tenía, y eso no puede pasar como efecto colateral de una importación. Las inscripciones
   * no vienen en el respaldo (viven en otra colección del Firestore viejo), solo las
   * invitaciones dirigidas — que es justo el seguimiento que se quiere conservar.
   */
  async function importarEventos(c: Container, datos: Dato): Promise<{ ok: number; total: number }> {
    const repo = c.resolve('eventoRepo');
    const items = arr(datos.eventos);
    const porNombre = mapaEmpresasPorNombre(datos);
    let ok = 0;
    for (const d of items) {
      const nombre = s(d.nombre) || s(d.titulo);
      try {
        const id = await idEstable('evt', s(d.id), nombre);
        const evento = new Evento({
          id,
          titulo: nombre,
          descripcion: s(d.notas) || null,
          fechaHora: fechaHoraDe(s(d.fecha), s(d.hora)),
          estado: 'borrador',
          urlWebinar: s(d.link) || null,
          horasRecordatorio: entero(d.horasRecordatorio) ?? 24,
          horasSeguimiento: entero(d.horasSeguimiento),
          limiteRegistrosPorIp: entero(d.limiteRegistrosPorIp),
          sistema: s(d.sistema) || null,
          contactoNombre: s(d.contactoNombre) || null,
          contactoWhatsapp: s(d.contactoWhatsapp) || null,
          plantilla: s(d.plantilla) || null,
          mensajeSeguimiento: s(d.mensajeSeguimiento) || null,
          invitaciones: await Promise.all(
            arr(d.empresas).map(async (e) => {
              const empresaNombre = s(e.nombre);
              return {
                id: await hashId('inv', id, empresaNombre),
                empresaId: porNombre.get(empresaNombre.toLowerCase()) ?? null,
                empresaNombre,
                sistemas: s(e.sistema) ? [s(e.sistema)] : [],
                invitadoPor: s(e.invitadoPor) || s(e.invitadoPorManual) || null,
                contactado: e.invitado === true,
                respuesta: respuestaInvitacionDe(e.respuesta),
                notas: s(e.notas) || null,
              };
            }),
          ),
          invitadosExternos: await Promise.all(
            arr(d.extras).map(async (x, i) => ({
              id: await hashId('ext', id, s(x.nombre), String(i)),
              nombre: s(x.nombre),
              fuente: s(x.fuente) || null,
              contactado: x.invitado === true,
              respuesta: respuestaInvitacionDe(x.respuesta),
              notas: s(x.notas) || null,
            })),
          ),
        });
        if (!DRY_RUN) await repo.save(evento);
        ok++;
      } catch (err) {
        log('eventos', `ERROR con "${nombre || '(sin nombre)'}": ${err instanceof Error ? err.message : err}`);
      }
    }
    log('eventos', `${ok}/${items.length} importados (todos como BORRADOR — publícalos a mano para abrir el registro)`);
    return { ok, total: items.length };
  }

  /**
   * Cotizaciones (`cotizaciones`), conservando el folio original (`numero`, p. ej.
   * "COT-2026-007") — el mismo criterio que con los folios de tickets.
   *
   * El CRM viejo marcaba el IVA por renglón (`tieneIVA`) y ds-hd lleva una sola tasa por
   * cotización: si ningún renglón llevaba IVA la cotización queda con tasa 0, y si el archivo
   * mezcla renglones con y sin IVA se avisa por bitácora para revisarla a mano.
   */
  async function importarCotizaciones(
    c: Container,
    datos: Dato,
  ): Promise<{ ok: number; total: number; sinEmpresa: string[] }> {
    const repo = c.resolve('cotizacionRepo');
    const empresaRepo = c.resolve('empresaRepo');
    const items = arr(datos.cotizaciones);
    const porNombre = mapaEmpresasPorNombre(datos);
    const sinEmpresa: string[] = [];
    // Folio más alto por año, para dejar el contador de ds-hd por encima de lo importado y que
    // la siguiente cotización nueva no reutilice un folio que ya existe. Se arranca con lo que
    // YA hay en ds-hd (igual que el contador de tickets): un respaldo viejo con folios más
    // bajos no debe hacer retroceder el consecutivo.
    const maxPorAnio = new Map<string, number>();
    const anotarFolio = (folio: string): void => {
      const m = /^COT-(\d{4})-(\d+)$/.exec(folio);
      if (m) maxPorAnio.set(m[1]!, Math.max(maxPorAnio.get(m[1]!) ?? 0, Number(m[2])));
    };
    for (const existente of await repo.list()) anotarFolio(existente.folio);
    let ok = 0;
    let placeholderCreado = false;
    for (const d of items) {
      const folio = s(d.numero) || s(d.folio);
      const empresaNombre = s(d.empresaNombre);
      try {
        if (!folio) {
          log('cotizaciones', `omitida sin folio: ${empresaNombre || JSON.stringify(d).slice(0, 60)}`);
          continue;
        }
        let empresaId = porNombre.get(empresaNombre.toLowerCase()) ?? null;
        if (!empresaId) {
          sinEmpresa.push(`${folio} (empresa del respaldo: "${empresaNombre}")`);
          empresaId = EMPRESA_PLACEHOLDER_ID;
          if (!placeholderCreado && !DRY_RUN) {
            await crearEmpresaPlaceholder(empresaRepo);
            placeholderCreado = true;
          }
        }
        const conceptos = arr(d.conceptos).map((x) => ({
          descripcion: s(x.descripcion),
          cantidad: Number(x.cantidad) || 0,
          precioUnitario: Number(x.precioUnitario) || 0,
          descuento: Number(x.descuento) || 0,
          importe: 0, // lo recalcula la entidad
        }));
        const conIva = arr(d.conceptos).filter((x) => x.tieneIVA !== false).length;
        if (conIva && conIva !== conceptos.length) {
          log(
            'cotizaciones',
            `${folio}: ${conceptos.length - conIva} de ${conceptos.length} renglones venían sin IVA; ` +
              'ds-hd usa una sola tasa por cotización, quedó con IVA — revísala a mano.',
          );
        }
        const creada = fecha(d.fechaCreacion);
        const cotizacion = new Cotizacion({
          id: await idEstable('cot', s(d.id), folio),
          folio,
          empresaId,
          empresaNombre: empresaNombre || null,
          fecha: creada,
          vigenciaDias: diasEntre(creada, s(d.fechaVigencia)) ?? 15,
          estado: estadoCotizacionDe(d.estado),
          ivaTasa: conIva ? 0.16 : 0,
          conceptos,
          notas: s(d.notas) || null,
          emisorNombre: s(d.emisorNombre) || null,
          emisorCargo: s(d.emisorCargo) || null,
          emisorTelefono: s(d.emisorTel ?? d.emisorTelefono) || null,
          emisorCorreo: s(d.emisorCorreo) || null,
          rfc: s(d.empresaRFC) || null,
          contactoNombre: s(d.empresaContacto) || null,
          contactoCorreo: primerCorreo(d.empresaCorreo) || null,
          ticketNumero: Number(d.ticketNumero) || null,
          createdAt: creada,
        });
        if (!DRY_RUN) await repo.save(cotizacion);
        anotarFolio(folio);
        ok++;
      } catch (err) {
        log('cotizaciones', `ERROR con "${folio || empresaNombre}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const [anio, max] of maxPorAnio) {
      const clave = `cotizaciones-${anio}`;
      if (!DRY_RUN) await c.resolve('contadorRepo').fijar(clave, max);
      log('cotizaciones', `folio más alto de ${anio}: ${max}, contador "${clave}" fijado ahí`);
    }
    log('cotizaciones', `${ok}/${items.length} importadas, ${sinEmpresa.length} sin empresa emparejada`);
    return { ok, total: items.length, sinEmpresa };
  }

  return {
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
  };
}
