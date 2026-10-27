import type { IKnowledgeRepository, ListarKBFiltro } from '../../core/ports/repositories/IKnowledgeRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { zipSync, strToU8 } from 'fflate';
import {
  ArticuloKB,
  adivinarCategoriaKB,
  claveRutaKB,
  normalizarRutaKB,
  slugify,
  type CarpetaKB,
} from '../../core/entities/ArticuloKB.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Un archivo leído de la carpeta local al indexar. */
export interface ArchivoIndexado {
  /** Ruta dentro de la carpeta elegida, con la carpeta raíz (`EMPRESAS/ACME/notas.md`). */
  ruta: string;
  contenido: string;
}

/** Lo que el navegador necesita para saber qué cambió sin volver a subir todo. */
export interface EntradaIndiceKB {
  id: string;
  /** `claveRutaKB` de la ruta: sin la carpeta raíz y en minúsculas. */
  clave: string;
  titulo: string;
  /** SHA-256 (hex) del contenido guardado. */
  huella: string;
}

/** Resumen de una tanda del indexado. */
export interface ResultadoIndexado {
  creados: number;
  actualizados: number;
  sinCambios: number;
  /** Archivos que no se guardaron, con el motivo. */
  omitidos: string[];
}

/** Firestore no acepta documentos de más de 1 MiB; se deja margen para los demás campos. */
const MAX_CONTENIDO = 900_000;

/** SHA-256 en hex del texto (UTF-8). Es el mismo cálculo que hace el navegador al indexar. */
export async function huellaKB(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Base de conocimiento. Quién entra lo decide el propietario (ver `ConfiguracionKB`), no el rol;
 * los artículos son de solo lectura: el contenido solo cambia al reindexar las carpetas, y eso
 * (igual que borrar o exportar) es exclusivo del propietario.
 */
export class KnowledgeService {
  constructor(
    private readonly repo: IKnowledgeRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly bitacora: BitacoraService,
  ) {}

  private exigir(actor: SessionUser, permiso: 'kb:leer' | 'kb:escribir' | 'kb:publicar'): void {
    if (actor.permisos.includes(permiso)) return;
    throw new ForbiddenError(
      permiso === 'kb:leer'
        ? 'No tienes acceso a la base de conocimiento'
        : 'Solo el propietario de la base de conocimiento puede hacer esto',
    );
  }

  async listar(actor: SessionUser, filtro: ListarKBFiltro = {}): Promise<ArticuloKB[]> {
    this.exigir(actor, 'kb:leer');
    return this.repo.list(filtro);
  }

  async ver(actor: SessionUser, idOSlug: string): Promise<ArticuloKB> {
    this.exigir(actor, 'kb:leer');
    const articulo = (await this.repo.findById(idOSlug)) ?? (await this.repo.findBySlug(idOSlug));
    if (!articulo) throw new NotFoundError('Artículo', idOSlug);
    return articulo;
  }

  /**
   * «Ver también»: otros de la misma carpeta que comparten tags o, si no hay tags, la misma
   * subcarpeta (p. ej. los demás documentos de la misma empresa).
   */
  async relacionados(actor: SessionUser, articulo: ArticuloKB, limite = 5): Promise<ArticuloKB[]> {
    const candidatos = (await this.listar(actor)).filter((a) => a.id !== articulo.id && a.carpeta === articulo.carpeta);
    const puntaje = (a: ArticuloKB): number =>
      a.tags.filter((t) => articulo.tags.includes(t)).length * 2 +
      (articulo.subcarpeta && a.subcarpeta === articulo.subcarpeta ? 1 : 0);
    return candidatos
      .map((a) => ({ a, p: puntaje(a) }))
      .filter((x) => x.p > 0)
      .sort((x, y) => y.p - x.p || x.a.titulo.localeCompare(y.a.titulo, 'es', { numeric: true }))
      .slice(0, limite)
      .map((x) => x.a);
  }

  /** Huella de cada archivo ya indexado en la carpeta, para mandar solo lo nuevo o cambiado. */
  async indice(actor: SessionUser, carpeta: CarpetaKB): Promise<EntradaIndiceKB[]> {
    this.exigir(actor, 'kb:escribir');
    const articulos = (await this.repo.list()).filter((a) => a.carpeta === carpeta && a.rutaDestino);
    return Promise.all(
      articulos.map(async (a) => ({
        id: a.id,
        clave: claveRutaKB(a.rutaDestino!),
        titulo: a.titulo,
        huella: await huellaKB(a.cuerpoMarkdown),
      })),
    );
  }

  /**
   * «🔄 Indexar»: crea los archivos nuevos y actualiza los que cambiaron, reconociendo cada uno
   * por su ruta dentro de la carpeta (sin la raíz), así nunca se duplica. Si un archivo ya estaba
   * pero en la otra carpeta con la MISMA ruta completa, se mueve a esta.
   */
  async indexar(actor: SessionUser, carpeta: CarpetaKB, archivos: ArchivoIndexado[]): Promise<ResultadoIndexado> {
    this.exigir(actor, 'kb:escribir');
    const resultado: ResultadoIndexado = { creados: 0, actualizados: 0, sinCambios: 0, omitidos: [] };
    const ahora = this.clock.now();

    const porClave = new Map<string, ArticuloKB>();
    const porRuta = new Map<string, ArticuloKB>();
    for (const a of await this.repo.list()) {
      if (!a.rutaDestino) continue;
      if (a.carpeta === carpeta) porClave.set(claveRutaKB(a.rutaDestino), a);
      porRuta.set(normalizarRutaKB(a.rutaDestino), a);
    }

    const porGuardar = new Map<string, ArticuloKB>();
    for (const archivo of archivos) {
      const ruta = archivo.ruta.replace(/\\/g, '/').replace(/^\/+/, '').trim();
      const nombre = ruta.split('/').pop() ?? '';
      if (!nombre) continue;
      if (!archivo.contenido.trim()) {
        resultado.omitidos.push(`${ruta}: vacío`);
        continue;
      }
      if (archivo.contenido.length > MAX_CONTENIDO) {
        resultado.omitidos.push(`${ruta}: muy grande (más de ${Math.round(MAX_CONTENIDO / 1000)} mil caracteres)`);
        continue;
      }
      const titulo = (nombre.replace(/\.[^.]+$/, '') || nombre).slice(0, 160);
      const adivinada = adivinarCategoriaKB(nombre);
      const categoria = adivinada === 'script' ? 'script' : carpeta === 'empresas' ? 'empresa' : adivinada;
      const existente = porClave.get(claveRutaKB(ruta)) ?? porRuta.get(normalizarRutaKB(ruta));
      if (existente) {
        const cambio =
          existente.cuerpoMarkdown !== archivo.contenido ||
          existente.carpeta !== carpeta ||
          existente.rutaDestino !== ruta ||
          existente.titulo !== titulo;
        if (!cambio) {
          resultado.sinCambios += 1;
          continue;
        }
        existente.cuerpoMarkdown = archivo.contenido;
        existente.carpeta = carpeta;
        existente.rutaDestino = ruta;
        existente.titulo = titulo;
        existente.updatedAt = ahora;
        if (!porGuardar.has(existente.id)) resultado.actualizados += 1;
        porGuardar.set(existente.id, existente);
        continue;
      }
      const nuevo = new ArticuloKB({
        id: this.ids.newId(),
        titulo,
        carpeta,
        categoria,
        cuerpoMarkdown: archivo.contenido,
        rutaDestino: ruta,
        autorUid: actor.uid,
        autorNombre: actor.nombre,
        createdAt: ahora,
        updatedAt: ahora,
      });
      // Dos veces el mismo archivo en la misma tanda: el segundo actualiza al primero.
      porClave.set(claveRutaKB(ruta), nuevo);
      porRuta.set(normalizarRutaKB(ruta), nuevo);
      porGuardar.set(nuevo.id, nuevo);
      resultado.creados += 1;
    }

    if (porGuardar.size) {
      await this.repo.guardarVarios([...porGuardar.values()]);
      await this.bitacora.registrar({
        actor,
        accion: 'indexar',
        modulo: 'kb',
        entidadTipo: 'ArticuloKB',
        entidadId: carpeta,
        resumen: `Indexado ${carpeta === 'empresas' ? 'Empresas' : 'Soporte y licencias'}: ${resultado.creados} nuevo(s), ${resultado.actualizados} actualizado(s)`,
      });
    }
    return resultado;
  }

  /** Quita del CRM artículos de una carpeta (los que ya no existen en la carpeta de Windows). */
  async quitar(actor: SessionUser, carpeta: CarpetaKB, idsAQuitar: string[]): Promise<number> {
    this.exigir(actor, 'kb:publicar');
    const pedidos = new Set(idsAQuitar);
    const borrar = (await this.repo.list()).filter((a) => a.carpeta === carpeta && pedidos.has(a.id));
    if (!borrar.length) return 0;
    await this.repo.eliminarVarios(borrar.map((a) => a.id));
    await this.bitacora.registrar({
      actor,
      accion: 'eliminar',
      modulo: 'kb',
      entidadTipo: 'ArticuloKB',
      entidadId: carpeta,
      resumen: `Quitados ${borrar.length} archivo(s) que ya no están en la carpeta: ${borrar.slice(0, 5).map((a) => a.titulo).join(', ')}${borrar.length > 5 ? '…' : ''}`,
    });
    return borrar.length;
  }

  /** Respaldo: los artículos (de una carpeta o todos) como `.zip`, con su ruta original. */
  async exportarZip(actor: SessionUser, filtro: { carpeta?: CarpetaKB; desde?: Date } = {}): Promise<Buffer> {
    this.exigir(actor, 'kb:publicar');
    const articulos = await this.repo.list();
    const usados = new Set<string>();
    const entradas: Record<string, Uint8Array> = {};
    for (const a of articulos) {
      if (filtro.carpeta && a.carpeta !== filtro.carpeta) continue;
      if (filtro.desde && a.updatedAt < filtro.desde) continue;
      let ruta = (a.rutaDestino || `${a.slug || slugify(a.titulo)}.md`).replace(/\\/g, '/').replace(/^\/+/, '');
      if (usados.has(ruta)) {
        const m = ruta.match(/^(.*?)(\.[^.]+)?$/)!;
        ruta = `${m[1]}-${a.id.slice(0, 6)}${m[2] ?? ''}`;
      }
      usados.add(ruta);
      entradas[ruta] = strToU8(a.cuerpoMarkdown);
    }
    return Buffer.from(zipSync(entradas));
  }

  async eliminar(actor: SessionUser, id: string): Promise<void> {
    this.exigir(actor, 'kb:publicar');
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundError('Artículo', id);
    await this.repo.eliminar(id);
    await this.bitacora.registrar({
      actor,
      accion: 'eliminar',
      modulo: 'kb',
      entidadTipo: 'ArticuloKB',
      entidadId: id,
      resumen: `Eliminado: ${a.titulo}`,
    });
  }
}
