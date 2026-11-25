import type { INotaPersonalRepository } from '../../core/ports/repositories/INotaPersonalRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import {
  DIAS_PAPELERA_NOTAS,
  MAX_NOTAS,
  esColorNota,
  esDiaRecordatorio,
  validarTamanoNotas,
  validarTextoNota,
  type ColorNota,
  type NotaPersonal,
  type TicketDeNota,
} from '../../core/entities/NotaPersonal.js';
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

  /** Lee, cambia y guarda en una transacción, purgando la papelera de paso. */
  private modificar<T>(uid: string, cambiar: (notas: NotaPersonal[], ahora: Date) => T): Promise<T> {
    const ahora = this.clock.now();
    return this.repo.modificar(uid, (todas) => {
      const notas = this.purgar(todas, ahora);
      const resultado = cambiar(notas, ahora);
      validarTamanoNotas(notas);
      return { notas, resultado };
    });
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

  /** 🎫 Anota en la nota el ticket que salió de ella (si la nota ya no existe, no pasa nada). */
  async marcarTicket(persona: PersonaNotas, id: string, ticket: TicketDeNota): Promise<void> {
    const marcada = await this.modificar(persona.uid, (notas) => {
      const nota = notas.find((n) => n.id === id);
      if (!nota || nota.tickets.some((t) => t.id === ticket.id)) return false;
      nota.tickets.push({ id: ticket.id, numero: ticket.numero });
      return true;
    });
    if (marcada) await this.anotar(persona, 'convertir', id, `🎫 Convirtió una nota en el ticket #${ticket.numero}`);
  }
}
