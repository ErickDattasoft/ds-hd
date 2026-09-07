import type { IEmpresaRepository, ListarEmpresasFiltro } from '../../src/core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository, ListarContactosFiltro } from '../../src/core/ports/repositories/IContactoRepository.js';
import type { IBitacoraRepository, FiltroBitacora } from '../../src/core/ports/repositories/IBitacoraRepository.js';
import type { Empresa } from '../../src/core/entities/Empresa.js';
import type { Contacto } from '../../src/core/entities/Contacto.js';
import type { EntradaBitacora } from '../../src/core/entities/EntradaBitacora.js';

export class InMemoryEmpresaRepository implements IEmpresaRepository {
  readonly items = new Map<string, Empresa>();
  constructor(seed: Empresa[] = []) {
    for (const e of seed) this.items.set(e.id, e);
  }
  async findById(id: string): Promise<Empresa | null> {
    return this.items.get(id) ?? null;
  }
  async list(f: ListarEmpresasFiltro = {}): Promise<Empresa[]> {
    let out = [...this.items.values()];
    if (f.activa !== undefined) out = out.filter((e) => e.activa === f.activa);
    if (f.texto) {
      const t = f.texto.toLowerCase();
      out = out.filter((e) => e.nombre.toLowerCase().includes(t) || (e.rfc ?? '').toLowerCase().includes(t));
    }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
  async save(e: Empresa): Promise<void> {
    this.items.set(e.id, e);
  }
  async existePorNombre(nombre: string, exceptoId?: string): Promise<boolean> {
    return [...this.items.values()].some(
      (e) => e.nombre.toLowerCase() === nombre.trim().toLowerCase() && e.id !== exceptoId,
    );
  }
}

export class InMemoryContactoRepository implements IContactoRepository {
  readonly items = new Map<string, Contacto>();
  async findById(id: string): Promise<Contacto | null> {
    return this.items.get(id) ?? null;
  }
  async findByUid(uid: string): Promise<Contacto | null> {
    return [...this.items.values()].find((c) => c.uid === uid) ?? null;
  }
  async findByEmail(email: string): Promise<Contacto | null> {
    return [...this.items.values()].find((c) => c.email === email.trim().toLowerCase()) ?? null;
  }
  async list(f: ListarContactosFiltro = {}): Promise<Contacto[]> {
    let out = [...this.items.values()];
    if (f.empresaId) out = out.filter((c) => c.empresaId === f.empresaId);
    if (f.activo !== undefined) out = out.filter((c) => c.activo === f.activo);
    if (f.esPortal !== undefined) out = out.filter((c) => c.esPortal === f.esPortal);
    if (f.texto) {
      const t = f.texto.toLowerCase();
      out = out.filter((c) => c.nombre.toLowerCase().includes(t) || (c.email ?? '').includes(t));
    }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
  async save(c: Contacto): Promise<void> {
    this.items.set(c.id, c);
  }
  async contarPorEmpresa(empresaId: string): Promise<number> {
    return [...this.items.values()].filter((c) => c.empresaId === empresaId).length;
  }
}

export class InMemoryBitacoraRepository implements IBitacoraRepository {
  readonly entradas: EntradaBitacora[] = [];
  async registrar(e: EntradaBitacora): Promise<void> {
    this.entradas.push(e);
  }
  async listar(f: FiltroBitacora = {}): Promise<EntradaBitacora[]> {
    let out = [...this.entradas].sort((a, b) => b.at.getTime() - a.at.getTime());
    if (f.modulo) out = out.filter((e) => e.modulo === f.modulo);
    if (f.actorUid) out = out.filter((e) => e.actorUid === f.actorUid);
    if (f.entidadId) out = out.filter((e) => e.entidadId === f.entidadId);
    if (f.desde) out = out.filter((e) => e.at.getTime() >= f.desde!.getTime());
    if (f.hasta) out = out.filter((e) => e.at.getTime() <= f.hasta!.getTime());
    return out.slice(0, f.limite ?? 200);
  }
  async purgar(fecha: Date, maxBorrar = 5000): Promise<{ borradas: number; hayMas: boolean }> {
    const viejas = this.entradas
      .filter((e) => e.at.getTime() < fecha.getTime())
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    const aBorrar = viejas.slice(0, maxBorrar);
    const ids = new Set(aBorrar.map((e) => e.id));
    for (let i = this.entradas.length - 1; i >= 0; i--) {
      if (ids.has(this.entradas[i]!.id)) this.entradas.splice(i, 1);
    }
    return { borradas: aBorrar.length, hayMas: viejas.length > maxBorrar };
  }
}
