import type { ICotizacionRepository, ListarCotizacionesFiltro } from '../../src/core/ports/repositories/ICotizacionRepository.js';
import type { Cotizacion } from '../../src/core/entities/Cotizacion.js';

export class InMemoryCotizacionRepository implements ICotizacionRepository {
  readonly items = new Map<string, Cotizacion>();
  async findById(id: string): Promise<Cotizacion | null> {
    return this.items.get(id) ?? null;
  }
  async list(f: ListarCotizacionesFiltro = {}): Promise<Cotizacion[]> {
    let out = [...this.items.values()];
    if (f.empresaId) out = out.filter((c) => c.empresaId === f.empresaId);
    if (f.estado) out = out.filter((c) => c.estado === f.estado);
    if (f.texto) {
      const t = f.texto.toLowerCase();
      out = out.filter((c) => c.folio.toLowerCase().includes(t) || (c.empresaNombre ?? '').toLowerCase().includes(t));
    }
    out.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    return f.limite ? out.slice(0, f.limite) : out;
  }
  async save(c: Cotizacion): Promise<void> {
    this.items.set(c.id, c);
  }
  async contarPorEstado(): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const c of this.items.values()) out[c.estado] = (out[c.estado] ?? 0) + 1;
    return out;
  }
}
