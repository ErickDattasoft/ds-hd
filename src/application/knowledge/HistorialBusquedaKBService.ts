import type { IBusquedaKBRepository } from '../../core/ports/repositories/IBusquedaKBRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { MAX_BUSQUEDAS_KB_POR_USUARIO } from '../../core/entities/BusquedaKB.js';
import type { BusquedaKB } from '../../core/entities/BusquedaKB.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Historial personal de búsquedas en la base de conocimiento (para volver a aplicarlas). */
export class HistorialBusquedaKBService {
  constructor(
    private readonly repo: IBusquedaKBRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  listar(actor: SessionUser): Promise<BusquedaKB[]> {
    return this.repo.listar(actor.uid);
  }

  /** Registra una búsqueda, salvo que repita la más reciente. Recorta al máximo permitido. */
  async registrar(actor: SessionUser, texto: string): Promise<void> {
    const limpio = texto.trim();
    if (limpio.length < 2) return;
    const existentes = await this.repo.listar(actor.uid);
    if (existentes[0]?.texto.toLowerCase() === limpio.toLowerCase()) return;

    await this.repo.guardar({ id: this.ids.newId(), uid: actor.uid, texto: limpio, creadoEn: this.clock.now() });
    const sobrantes = existentes.slice(MAX_BUSQUEDAS_KB_POR_USUARIO - 1);
    await Promise.all(sobrantes.map((b) => this.repo.eliminar(b.id)));
  }

  limpiar(actor: SessionUser): Promise<void> {
    return this.repo.limpiar(actor.uid);
  }
}
