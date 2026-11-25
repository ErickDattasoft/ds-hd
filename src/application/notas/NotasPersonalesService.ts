import type { INotaPersonalRepository } from '../../core/ports/repositories/INotaPersonalRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import {
  DIAS_PAPELERA_NOTAS,
  MAX_IMAGENES_NOTA,
  MAX_NOTAS,
  TIPOS_IMAGEN_NOTA,
  esColorNota,
  esDiaRecordatorio,
  validarTamanoNotas,
  validarTextoNota,
  type ColorNota,
  type NotaPersonal,
  type ImagenDeNota,
  type NotaImagen,
  type TicketDeNota,
} from '../../core/entities/NotaPersonal.js';
import { MAX_ADJUNTO_BYTES } from '../../core/entities/AdjuntoTicket.js';
import type { INotaImagenRepository } from '../../core/ports/repositories/INotaImagenRepository.js';
import { NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';

/** Quién usa sus notas (las notas son de esa persona). */
export interface PersonaNotas {
  uid: string;
  nombre: string;
}

/** Lo que se puede cambiar de una nota desde la página. */
export interface CambiosNota {
  id?: string;
  texto?: string;
  color?: string;
  fijada?: boolean;
  /** «AAAA-MM-DD» o null para quitar el recordatorio. */
  recordarEn?: string | null;
}

/** Las notas de una persona, ya repartidas como se muestran. */
export interface NotasDePersona {
  /** Activas sin ticket: 📌 fijadas primero, luego la última que se tocó. */
  activas: NotaPersonal[];
  /** Activas de las que ya salió algún ticket (🎫), aparte para no capturarlas dos veces. */
  conTicket: NotaPersonal[];
  /** 🗑️ Borradas hace menos de {@link DIAS_PAPELERA_NOTAS} días, la más reciente primero. */
  papelera: NotaPersonal[];
}

const porFijadaYFecha = (a: NotaPersonal, b: NotaPersonal): number =>
  Number(b.fijada) - Number(a.fijada) || b.actualizadaEn.getTime() - a.actualizadaEn.getTime();

/** Notas personales tipo Sticky Notes (cada quien ve solo las suyas). */
export class NotasPersonalesService {
  constructor(
    private readonly repo: INotaPersonalRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly bitacora?: BitacoraService,
    private readonly imagenes?: INotaImagenRepository,
  ) {}

  /** Deja rastro en la bitácora SIN el texto de la nota (las notas son privadas). */
  private async anotar(persona: PersonaNotas, accion: string, id: string, resumen: string): Promise<void> {
    await this.bitacora?.registrar({ actor: persona, accion, modulo: 'notas', entidadTipo: 'nota', entidadId: id, resumen });
  }

  /** Quita de la papelera lo que ya cumplió sus días (se hace en cada guardado, sin costo extra). */
  private purgar(notas: NotaPersonal[], ahora: Date): NotaPersonal[] {
    const limite = ahora.getTime() - DIAS_PAPELERA_NOTAS * 86_400_000;
    return notas.filter((n) => !n.eliminadaEn || n.eliminadaEn.getTime() > limite);
  }

  /**
   * Lee, cambia y guarda en una transacción, purgando la papelera de paso. Las imágenes que se
   * quedan sin nota (quitadas, o de notas borradas para siempre o purgadas) se borran después.
   */
  private async modificar<T>(uid: string, cambiar: (notas: NotaPersonal[], ahora: Date) => T): Promise<T> {
    const ahora = this.clock.now();
    let huerfanas: string[] = [];
    const resultado = await this.repo.modificar(uid, (todas) => {
      const antes = todas.flatMap((n) => n.imagenes.map((i) => i.id));
      const notas = this.purgar(todas, ahora);
      const r = cambiar(notas, ahora);
      validarTamanoNotas(notas);
      const quedan = new Set(notas.flatMap((n) => n.imagenes.map((i) => i.id)));
      huerfanas = antes.filter((id) => !quedan.has(id));
      return { notas, resultado: r };
    });
    if (huerfanas.length && this.imagenes) await this.imagenes.eliminarVarias(huerfanas).catch(() => undefined);
    return resultado;
  }

  /** Las notas de la persona repartidas en activas, con ticket y papelera (1 lectura). */
  async listarTodo(uid: string): Promise<NotasDePersona> {
    const notas = this.purgar(await this.repo.obtener(uid), this.clock.now());
    const vivas = notas.filter((n) => !n.eliminadaEn).sort(porFijadaYFecha);
    return {
      activas: vivas.filter((n) => !n.tickets.length),
      conTicket: vivas.filter((n) => n.tickets.length),
      papelera: notas
        .filter((n) => n.eliminadaEn)
        .sort((a, b) => b.eliminadaEn!.getTime() - a.eliminadaEn!.getTime()),
    };
  }

  /** Las notas activas (sin papelera), 📌 fijadas primero. */
  async listar(uid: string): Promise<NotaPersonal[]> {
    const t = await this.listarTodo(uid);
    return [...t.activas, ...t.conTicket].sort(porFijadaYFecha);
  }

  /** ⏰ Notas con recordatorio para hoy o atrasado (`hoy` = «AAAA-MM-DD» de México). */
  async recordatorios(uid: string, hoy: string): Promise<NotaPersonal[]> {
    return (await this.listar(uid))
      .filter((n) => n.recordarEn && n.recordarEn <= hoy)
      .sort((a, b) => a.recordarEn!.localeCompare(b.recordarEn!));
  }

  /**
   * Crea (sin `id`) o actualiza una nota. Devuelve la nota guardada. Va en transacción: si la
   * página manda el texto y el color al mismo tiempo, ninguno borra al otro.
   */
  async guardar(persona: PersonaNotas, datos: CambiosNota): Promise<NotaPersonal> {
    const color: ColorNota | undefined = esColorNota(datos.color) ? datos.color : undefined;
    const texto = datos.texto !== undefined ? validarTextoNota(datos.texto) : undefined;
    if (datos.recordarEn !== undefined && datos.recordarEn !== null && !esDiaRecordatorio(datos.recordarEn)) {
      throw new ValidationError('La fecha del recordatorio no es válida', { recordarEn: 'Fecha no válida' });
    }
    const idNueva = datos.id ? undefined : this.ids.newId();
    const nota = await this.modificar(persona.uid, (notas, ahora) => {
      let nota = datos.id ? notas.find((n) => n.id === datos.id) : undefined;
      if (datos.id && !nota) throw new NotFoundError('La nota ya no existe (¿la borraste en otra pestaña?)');
      if (nota?.eliminadaEn) throw new NotFoundError('La nota está en la papelera: restáurala para editarla');
      if (!nota) {
        if (notas.filter((n) => !n.eliminadaEn).length >= MAX_NOTAS) {
          throw new ValidationError(`Ya tienes ${MAX_NOTAS} notas: borra algunas para hacer nuevas`);
        }
        nota = {
          id: idNueva!,
          texto: '',
          color: color ?? 'amarillo',
          creadaEn: ahora,
          actualizadaEn: ahora,
          fijada: false,
          recordarEn: null,
          eliminadaEn: null,
          tickets: [],
          imagenes: [],
        };
        notas.push(nota);
      }
      if (texto !== undefined) nota.texto = texto;
      if (color) nota.color = color;
      if (datos.fijada !== undefined) nota.fijada = datos.fijada;
      if (datos.recordarEn !== undefined) nota.recordarEn = datos.recordarEn;
      nota.actualizadaEn = ahora;
      return { ...nota };
    });
    if (idNueva) await this.anotar(persona, 'crear', nota.id, '🗒️ Creó una nota');
    return nota;
  }

  /** Manda la nota a la 🗑️ papelera (se puede restaurar durante {@link DIAS_PAPELERA_NOTAS} días). */
  async eliminar(persona: PersonaNotas, id: string): Promise<void> {
    const cambio = await this.modificar(persona.uid, (notas, ahora) => {
      const nota = notas.find((n) => n.id === id);
      if (!nota || nota.eliminadaEn) return false;
      nota.eliminadaEn = ahora;
      return true;
    });
    if (cambio) await this.anotar(persona, 'archivar', id, '🗑️ Mandó una nota a la papelera');
  }

  /** Saca la nota de la papelera. */
  async restaurar(persona: PersonaNotas, id: string): Promise<NotaPersonal> {
    const nota = await this.modificar(persona.uid, (notas) => {
      const n = notas.find((x) => x.id === id);
      if (!n) throw new NotFoundError('La nota ya no está en la papelera');
      n.eliminadaEn = null;
      return { ...n };
    });
    await this.anotar(persona, 'restaurar', id, '↩ Restauró una nota de la papelera');
    return nota;
  }

  /** Borra la nota para siempre (solo desde la papelera). */
  async borrarDefinitivo(persona: PersonaNotas, id: string): Promise<void> {
    const borrada = await this.modificar(persona.uid, (notas) => {
      const i = notas.findIndex((n) => n.id === id && n.eliminadaEn);
      if (i >= 0) notas.splice(i, 1);
      return i >= 0;
    });
    if (borrada) await this.anotar(persona, 'eliminar_definitivo', id, '❌ Borró una nota para siempre');
  }

  /**
   * 🎫 Anota en la nota el ticket que salió de ella (si la nota ya no existe, no pasa nada).
   * Devuelve las imágenes de la nota si es su PRIMER ticket (para adjuntárselas sin repetirlas
   * en cada ticket que salga de la misma nota); si no, una lista vacía.
   */
  async marcarTicket(persona: PersonaNotas, id: string, ticket: TicketDeNota): Promise<ImagenDeNota[]> {
    const r = await this.modificar(persona.uid, (notas) => {
      const nota = notas.find((n) => n.id === id);
      if (!nota || nota.tickets.some((t) => t.id === ticket.id)) return null;
      const primero = nota.tickets.length === 0;
      nota.tickets.push({ id: ticket.id, numero: ticket.numero });
      return primero ? nota.imagenes.map((i) => ({ ...i })) : [];
    });
    if (r) await this.anotar(persona, 'convertir', id, `🎫 Convirtió una nota en el ticket #${ticket.numero}`);
    return r ?? [];
  }

  /** 🖼 Agrega una imagen a la nota (pegada o elegida). Se guarda aparte; la nota solo la apunta. */
  async agregarImagen(
    persona: PersonaNotas,
    notaId: string,
    archivo: { nombre: string; contentType: string; base64: string },
  ): Promise<ImagenDeNota> {
    if (!this.imagenes) throw new ValidationError('Las imágenes en notas no están disponibles');
    const contentType = archivo.contentType.trim().toLowerCase();
    if (!TIPOS_IMAGEN_NOTA.includes(contentType)) {
      throw new ValidationError('Solo se pueden pegar imágenes (PNG, JPG, GIF o WEBP)', { archivo: 'Tipo no válido' });
    }
    const base64 = archivo.base64.replace(/\s/g, '');
    const tamano = Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    if (!base64 || tamano <= 0) throw new ValidationError('La imagen llegó vacía', { archivo: 'Vacía' });
    if (tamano > MAX_ADJUNTO_BYTES) {
      throw new ValidationError(`La imagen pesa más de ${Math.round(MAX_ADJUNTO_BYTES / 1024)} KB`, { archivo: 'Muy pesada' });
    }
    const ref: ImagenDeNota = {
      id: this.ids.newId(),
      nombre: (archivo.nombre || 'imagen').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120),
    };
    const imagen: NotaImagen = {
      ...ref,
      uid: persona.uid,
      notaId,
      contentType,
      tamano,
      data: `data:${contentType};base64,${base64}`,
      creadaEn: this.clock.now(),
    };
    // Primero el contenido y luego la nota: si la nota ya no se puede (borrada, llena), se quita.
    await this.imagenes.crear(imagen);
    try {
      await this.modificar(persona.uid, (notas) => {
        const nota = notas.find((n) => n.id === notaId && !n.eliminadaEn);
        if (!nota) throw new NotFoundError('La nota ya no existe');
        if (nota.imagenes.length >= MAX_IMAGENES_NOTA) {
          throw new ValidationError(`Máximo ${MAX_IMAGENES_NOTA} imágenes por nota`, { archivo: 'Límite alcanzado' });
        }
        nota.imagenes.push(ref);
      });
    } catch (err) {
      await this.imagenes.eliminarVarias([ref.id]).catch(() => undefined);
      throw err;
    }
    return ref;
  }

  /** La imagen con su contenido, solo si es de esta persona (si no, como si no existiera). */
  async imagen(uid: string, imagenId: string): Promise<NotaImagen> {
    const img = this.imagenes ? await this.imagenes.obtener(imagenId) : null;
    if (!img || img.uid !== uid) throw new NotFoundError('La imagen no existe');
    return img;
  }

  /** Quita una imagen de la nota (y la borra). */
  async quitarImagen(persona: PersonaNotas, notaId: string, imagenId: string): Promise<void> {
    await this.modificar(persona.uid, (notas) => {
      const nota = notas.find((n) => n.id === notaId);
      if (nota) nota.imagenes = nota.imagenes.filter((i) => i.id !== imagenId);
    });
  }
}
