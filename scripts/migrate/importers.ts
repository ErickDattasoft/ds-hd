/**
 * Importadores por entidad. Cada uno mapea un array top-level del export viejo a las
 * colecciones nuevas mediante los repositorios Firestore (proyecto NUEVO). Idempotentes:
 * usan el id viejo cuando existe; `set(..., {merge:true})`.
 *
 * NOTA: el CRM viejo guardaba todo con nombres de campo poco consistentes. Donde el mapeo
 * es incierto se deja el valor y un TODO; ajusta según el `agenda-datos.json` real.
 */
import { Empresa } from '../../src/core/entities/Empresa.js';
import { Contacto } from '../../src/core/entities/Contacto.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { Cotizacion } from '../../src/core/entities/Cotizacion.js';
import { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import { ArticuloKB } from '../../src/core/entities/ArticuloKB.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { parseRol } from '../../src/core/entities/value-objects/Rol.js';
import { arr, DRY_RUN, fechaDe, log } from './lib.js';
import type { Container } from '../../src/config/container.js';

type Dato = Record<string, unknown>;
const s = (v: unknown): string => (v == null ? '' : String(v));
const idDe = (d: Dato, prefijo: string): string => s(d._id ?? d.id) || `${prefijo}-${s(d.numero ?? Math.random())}`;

export async function importarEmpresas(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('empresaRepo');
  const items = arr(datos.clientes ?? datos.empresas);
  for (const d of items) {
    const empresa = new Empresa({
      id: idDe(d, 'emp'),
      nombre: s(d.nombre ?? d.empresa ?? d.razonSocial ?? 'Sin nombre'),
      rfc: s(d.rfc) || null,
      razonSocial: s(d.razonSocial) || null,
      direccion: s(d.direccion) || null,
      telefono: s(d.telefono ?? d.tel) || null,
      email: s(d.email ?? d.correo) || null,
      sistemasContratados: arr(d.sistemas).map((x) => s(x.nombre ?? x)),
      notas: s(d.notas) || null,
      createdAt: fechaDe(d.fechaCreacion ?? d.createdAt),
    });
    if (!DRY_RUN) await repo.save(empresa);
  }
  log('empresas', `${items.length} procesadas`);
  return items.length;
}

export async function importarContactos(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('contactoRepo');
  const items = arr(datos.contactos);
  let ok = 0;
  for (const d of items) {
    const empresaId = s(d.empresaId ?? d.clienteId);
    if (!empresaId) continue; // sin empresa no se puede migrar como contacto
    if (!DRY_RUN) {
      await repo.save(
        new Contacto({
          id: idDe(d, 'con'),
          nombre: s(d.nombre ?? 'Sin nombre'),
          empresaId,
          puesto: s(d.puesto) || null,
          email: s(d.email ?? d.correo) || null,
          telefono: s(d.telefono) || null,
          celular: s(d.celular) || null,
          createdAt: fechaDe(d.fechaCreacion),
        }),
      );
    }
    ok++;
  }
  log('contactos', `${ok}/${items.length} con empresa`);
  return ok;
}

export async function importarTickets(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('ticketRepo');
  const contador = c.resolve('contadorRepo');
  const items = arr(datos.tickets);
  let maxNum = 0;
  for (const d of items) {
    const numero = Number(d.numero ?? 0);
    maxNum = Math.max(maxNum, numero);
    const ticket = new Ticket({
      id: idDe(d, 'tic'),
      numero,
      asunto: s(d.asunto ?? 'Sin asunto'),
      descripcion: s(d.descripcion ?? ''),
      tipo: s(d.tipo ?? 'General'),
      sistema: s(d.sistema) || null,
      estado: s(d.estado ?? 'Abierto'),
      prioridad: (s(d.prioridad) || 'Media') as never,
      grupo: s(d.grupo) || null,
      canal: (s(d.canal) || 'interno') as never,
      empresaNombre: s(d.empresa) || null,
      contactoNombre: s(d.contacto) || null,
      contactoCorreo: s(d.contactoCorreo) || null,
      agenteAsignadoNombre: s(d.agente) || null,
      abiertoEn: fechaDe(d.fechaCreacion),
      createdAt: fechaDe(d.fechaCreacion),
      updatedAt: fechaDe(d.fechaActualizacion),
    });
    if (!DRY_RUN) {
      await repo.save(ticket);
      for (const n of arr(d.notas)) {
        await repo.agregarNota(ticket.id, {
          id: s(n.id) || `n-${Math.random().toString(36).slice(2)}`,
          tipo: n.interna ? 'interna' : 'publica',
          cuerpo: s(n.texto ?? n.cuerpo),
          autorUid: s(n.autorUid) || 'migracion',
          autorNombre: s(n.autor) || 'Migración',
          createdAt: fechaDe(n.fecha),
        });
      }
    }
  }
  if (!DRY_RUN) await contador.fijar('tickets', maxNum);
  log('tickets', `${items.length} procesados, contador = ${maxNum}`);
  return items.length;
}

export async function importarCotizaciones(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('cotizacionRepo');
  const items = arr(datos.cotizaciones);
  for (const d of items) {
    if (DRY_RUN) continue;
    await repo.save(
      new Cotizacion({
        id: idDe(d, 'cot'),
        folio: s(d.folio ?? d.numero ?? idDe(d, 'cot')),
        empresaId: s(d.empresaId ?? d.clienteId ?? 'desconocida'),
        empresaNombre: s(d.empresa) || null,
        fecha: fechaDe(d.fecha),
        estado: (s(d.estado) || 'borrador') as never,
        conceptos: arr(d.conceptos).map((x) => ({
          descripcion: s(x.descripcion),
          cantidad: Number(x.cantidad ?? 1),
          precioUnitario: Number(x.precioUnitario ?? x.precio ?? 0),
          importe: 0,
        })),
        notas: s(d.notas) || null,
        createdAt: fechaDe(d.fecha),
      }),
    );
  }
  log('cotizaciones', `${items.length} procesadas`);
  return items.length;
}

export async function importarVersiones(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('versionRepo');
  const items = arr(datos.versiones ?? datos.versionesSistemas);
  for (const d of items) {
    if (DRY_RUN) continue;
    await repo.save(
      new VersionSistema({
        id: idDe(d, 'ver'),
        sistema: s(d.sistema ?? 'Sistema'),
        versionActual: s(d.version ?? d.versionActual ?? '0'),
        fechaLiberacion: s(d.fechaLiberacion) || null,
        notasVersion: s(d.notas) || null,
        linkDescarga: s(d.link) || null,
      }),
    );
  }
  log('versiones', `${items.length} procesadas`);
  return items.length;
}

export async function importarKB(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('knowledgeRepo');
  const cols = (datos.__colecciones ?? {}) as Record<string, unknown>;
  const items = arr(cols.knowledge_base ?? datos.knowledgeBase);
  for (const d of items) {
    if (DRY_RUN) continue;
    await repo.save(
      new ArticuloKB({
        id: idDe(d, 'kb'),
        titulo: s(d.titulo ?? 'Sin título'),
        categoria: s(d.categoria) || null,
        cuerpoMarkdown: s(d.cuerpo ?? d.contenido ?? d.cuerpoMarkdown ?? '(sin contenido)'),
        tags: arr(d.tags).map(String),
        publicado: Boolean(d.publicado),
        visibilidad: (s(d.visibilidad) || 'staff') as never,
        createdAt: fechaDe(d.fechaCreacion),
      }),
    );
  }
  log('kb', `${items.length} procesados`);
  return items.length;
}

export async function importarUsuarios(c: Container, datos: Dato): Promise<number> {
  const repo = c.resolve('usuarioRepo');
  const cols = (datos.__colecciones ?? {}) as Record<string, unknown>;
  const staff = arr(cols.staff_aprobado);
  const usuariosApp = arr(datos.usuarios);
  const porEmail = new Map<string, Dato>();
  for (const u of usuariosApp) porEmail.set(s(u.email ?? u.authEmail).toLowerCase(), u);

  let n = 0;
  for (const sd of staff) {
    const email = s(sd._id ?? sd.email).toLowerCase();
    if (!email) continue;
    const app = porEmail.get(email);
    const rol = parseRol(s(app?.rol) === 'admin' ? 'admin' : 'agente');
    if (!DRY_RUN) {
      await repo.save(
        new Usuario({
          uid: s(app?.id ?? app?.uid) || email, // TODO: reemplazar por el uid real de Firebase Auth
          email,
          nombre: s(app?.nombre ?? email),
          rol,
        }),
      );
    }
    n++;
  }
  log('usuarios', `${n} de staff aprobado (revisa roles-override antes de producción)`);
  return n;
}
