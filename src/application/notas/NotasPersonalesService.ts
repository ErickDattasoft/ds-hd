import type { INotaPersonalRepository } from '../../core/ports/repositories/INotaPersonalRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import {
  MAX_NOTAS,
  esColorNota,
  validarTamanoNotas,
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

  /**
   * Crea (sin `id`) o actualiza una nota. Devuelve la nota guardada. Va en transacción: si la
   * página manda el texto y el color al mismo tiempo, ninguno borra al otro.
   */
  async guardar(uid: string, datos: { id?: string; texto?: string; color?: string }): Promise<NotaPersonal> {
    const ahora = this.clock.now();
    const color: ColorNota | undefined = esColorNota(datos.color) ? datos.color : undefined;
    const texto = datos.texto !== undefined ? validarTextoNota(datos.texto) : undefined;
    const idNueva = datos.id ? undefined : this.ids.newId();
    return this.repo.modificar(uid, (notas) => {
      let nota = datos.id ? notas.find((n) => n.id === datos.id) : undefined;
      if (datos.id && !nota) throw new NotFoundError('La nota ya no existe (¿la borraste en otra pestaña?)');
      if (!nota) {
        if (notas.length >= MAX_NOTAS) {
          throw new ValidationError(`Ya tienes ${MAX_NOTAS} notas: borra algunas para hacer nuevas`);
        }
        nota = { id: idNueva!, texto: '', color: color ?? 'amarillo', creadaEn: ahora, actualizadaEn: ahora };
        notas.push(nota);
      }
      if (texto !== undefined) nota.texto = texto;
      if (color) nota.color = color;
      nota.actualizadaEn = ahora;
      validarTamanoNotas(notas);
      return { notas, resultado: { ...nota } };
    });
  }

  /** Borra una nota (si ya no estaba, no pasa nada). */
  async eliminar(uid: string, id: string): Promise<void> {
    await this.repo.modificar(uid, (notas) => ({ notas: notas.filter((n) => n.id !== id), resultado: undefined }));
  }
}
