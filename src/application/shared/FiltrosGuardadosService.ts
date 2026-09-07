import type { IFiltroGuardadoRepository } from '../../core/ports/repositories/IFiltroGuardadoRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { MAX_FILTROS_POR_MODULO, type FiltroGuardado } from '../../core/entities/FiltroGuardado.js';
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from './SessionUser.js';

const MODULOS = new Set(['empresas', 'tickets', 'cotizaciones', 'contactos', 'eventos']);

/** Normaliza una query string: quita `?`, campos vacíos y `volver`/`_csrf`, ordena. */
function normalizarQuery(raw: string): string {
  const p = new URLSearchParams(raw.replace(/^\?/, ''));
  p.delete('volver');
  p.delete('_csrf');
  const pares = [...p.entries()].filter(([, v]) => v !== '').sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(pares).toString();
}

/** Búsquedas frecuentes personales, reaplicables con un clic. */
export class FiltrosGuardadosService {
  constructor(
    private readonly repo: IFiltroGuardadoRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  listar(actor: SessionUser, modulo: string): Promise<FiltroGuardado[]> {
    return this.repo.listar(actor.uid, modulo);
  }

  async guardar(
    actor: SessionUser,
    datos: { nombre: string; modulo: string; query: string },
  ): Promise<FiltroGuardado> {
    const nombre = datos.nombre.trim();
    if (nombre.length < 2) {
      throw new ValidationError('Ponle un nombre al filtro', { nombre: 'Requerido' });
    }
    if (!MODULOS.has(datos.modulo)) {
      throw new ValidationError(`Módulo no válido: ${datos.modulo}`);
    }
    const query = normalizarQuery(datos.query);
    if (!query) throw new ValidationError('No hay filtros que guardar');

    const existentes = await this.repo.listar(actor.uid, datos.modulo);
    // Reemplaza uno con el mismo nombre (case-insensitive) en vez de duplicar.
    const previo = existentes.find((f) => f.nombre.toLowerCase() === nombre.toLowerCase());
    if (!previo && existentes.length >= MAX_FILTROS_POR_MODULO) {
      throw new ValidationError(
        `Llegaste al máximo de ${MAX_FILTROS_POR_MODULO} filtros guardados para ${datos.modulo}. Borra alguno.`,
      );
    }

    const filtro: FiltroGuardado = {
      id: previo?.id ?? this.ids.newId(),
      uid: actor.uid,
      nombre,
      modulo: datos.modulo,
      query,
      creadoEn: previo?.creadoEn ?? this.clock.now(),
    };
    await this.repo.guardar(filtro);
    return filtro;
  }

  async eliminar(actor: SessionUser, id: string): Promise<void> {
    const filtro = await this.repo.findById(id);
    if (!filtro) return;
    if (filtro.uid !== actor.uid) {
      throw new ForbiddenError('Ese filtro no es tuyo');
    }
    await this.repo.eliminar(id);
  }
}
