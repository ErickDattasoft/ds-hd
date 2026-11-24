import type { INotaPersonalRepository } from '../../core/ports/repositories/INotaPersonalRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import {
  MAX_NOTAS,
  esColorNota,
  validarTextoNota,
  type ColorNota,
  type NotaPersonal,
} from '../../core/entities/NotaPersonal.js';
import { NotFoundError, ValidationError } from '../../core/errors/DomainError.js';

/** Notas personales tipo Sticky Notes (cada quien ve solo las suyas). */
export class NotasPersonalesService {
  constructor(
    private readonly repo: INotaPersonalRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  /** Las notas de la persona, la última que se tocó primero. */
  async listar(uid: string): Promise<NotaPersonal[]> {
    return (await this.repo.obtener(uid)).sort((a, b) => b.actualizadaEn.getTime() - a.actualizadaEn.getTime());
  }

  /** Crea (sin `id`) o actualiza una nota. Devuelve la nota guardada. */
  async guardar(uid: string, datos: { id?: string; texto?: string; color?: string }): Promise<NotaPersonal> {
    const notas = await this.repo.obtener(uid);
    const ahora = this.clock.now();
    const color: ColorNota | undefined = esColorNota(datos.color) ? datos.color : undefined;
    let nota = datos.id ? notas.find((n) => n.id === datos.id) : undefined;
    if (datos.id && !nota) throw new NotFoundError('La nota ya no existe (¿la borraste en otra pestaña?)');
    if (!nota) {
      if (notas.length >= MAX_NOTAS) {
        throw new ValidationError(`Ya tienes ${MAX_NOTAS} notas: borra algunas para hacer nuevas`);
      }
      nota = { id: this.ids.newId(), texto: '', color: color ?? 'amarillo', creadaEn: ahora, actualizadaEn: ahora };
      notas.push(nota);
    }
    if (datos.texto !== undefined) nota.texto = validarTextoNota(datos.texto);
    if (color) nota.color = color;
    nota.actualizadaEn = ahora;
    await this.repo.guardar(uid, notas);
    return nota;
  }

  /** Borra una nota (si ya no estaba, no pasa nada). */
  async eliminar(uid: string, id: string): Promise<void> {
    const notas = await this.repo.obtener(uid);
    const quedan = notas.filter((n) => n.id !== id);
    if (quedan.length !== notas.length) await this.repo.guardar(uid, quedan);
  }
}
