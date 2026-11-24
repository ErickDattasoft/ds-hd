import type {
  IUnionEmpresasRepository,
  ReferenciasEmpresa,
} from '../../src/core/ports/repositories/IUnionEmpresasRepository.js';
import type { InMemoryContactoRepository } from './crm.js';
import type { InMemoryTicketStore } from './tickets.js';
import type { InMemoryCotizacionRepository } from './cotizaciones.js';
import type { InMemoryInteraccionRepository, InMemoryTareaRepository } from './seguimiento.js';
import type { InMemoryOportunidadRepository } from './InMemoryOportunidadRepository.js';
import type { InMemoryUsuarioRepository } from './InMemoryUsuarioRepository.js';
import type { InMemoryAvisoRepository } from './kb.js';

type ConEmpresa = { empresaId: string | null; empresaNombre?: string | null };

/** Fake en memoria de {@link IUnionEmpresasRepository}: recorre los fakes y cambia el id en sitio. */
export class InMemoryUnionEmpresasRepository implements IUnionEmpresasRepository {
  constructor(
    private readonly r: {
      contactos: InMemoryContactoRepository;
      tickets: InMemoryTicketStore;
      cotizaciones: InMemoryCotizacionRepository;
      tareas: InMemoryTareaRepository;
      interacciones: InMemoryInteraccionRepository;
      oportunidades: InMemoryOportunidadRepository;
      usuarios: InMemoryUsuarioRepository;
      avisos: InMemoryAvisoRepository;
    },
  ) {}

  private grupos(): { clave: Exclude<keyof ReferenciasEmpresa, 'usuarios'>; items: ConEmpresa[]; conNombre: boolean }[] {
    const r = this.r;
    return [
      { clave: 'contactos', items: [...r.contactos.items.values()], conNombre: false },
      { clave: 'tickets', items: [...r.tickets.tickets.values()], conNombre: true },
      { clave: 'cotizaciones', items: [...r.cotizaciones.items.values()], conNombre: true },
      { clave: 'tareas', items: [...r.tareas.items.values()], conNombre: false },
      { clave: 'interacciones', items: r.interacciones.items, conNombre: false },
      { clave: 'oportunidades', items: [...r.oportunidades.items.values()], conNombre: true },
      { clave: 'avisos', items: r.avisos.items, conNombre: false },
    ];
  }

  async contarReferencias(empresaId: string): Promise<ReferenciasEmpresa> {
    const out = { usuarios: (await this.r.usuarios.list()).filter((u) => u.empresaIds.includes(empresaId)).length } as ReferenciasEmpresa;
    for (const g of this.grupos()) out[g.clave] = g.items.filter((x) => x.empresaId === empresaId).length;
    return out;
  }

  async moverReferencias(deId: string, a: { id: string; nombre: string }): Promise<ReferenciasEmpresa> {
    const out = await this.contarReferencias(deId);
    for (const g of this.grupos()) {
      for (const x of g.items.filter((i) => i.empresaId === deId)) {
        (x as { empresaId: string }).empresaId = a.id;
        if (g.conNombre) x.empresaNombre = a.nombre;
      }
    }
    for (const u of await this.r.usuarios.list()) {
      if (!u.empresaIds.includes(deId)) continue;
      if (u.empresaId === deId) u.empresaId = a.id;
      u.empresasAdicionales = [...new Set(u.empresasAdicionales.map((x) => (x === deId ? a.id : x)))].filter(
        (x) => x !== u.empresaId,
      );
    }
    return out;
  }

  async moverReferenciasContacto(deId: string, aId: string): Promise<number> {
    const r = this.r;
    const todos: { contactoId: string | null }[] = [
      ...r.tickets.tickets.values(),
      ...r.cotizaciones.items.values(),
      ...r.tareas.items.values(),
      ...r.interacciones.items,
    ];
    let n = 0;
    for (const x of todos) {
      if (x.contactoId === deId) {
        (x as { contactoId: string }).contactoId = aId;
        n++;
      }
    }
    return n;
  }
}
