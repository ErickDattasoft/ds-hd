import type {
  IInvitacionRepository,
  Invitacion,
} from '../../src/core/ports/repositories/IInvitacionRepository.js';
import type {
  ISolicitudAccesoRepository,
  SolicitudAcceso,
} from '../../src/core/ports/repositories/ISolicitudAccesoRepository.js';

export class InMemoryInvitacionRepository implements IInvitacionRepository {
  readonly porToken = new Map<string, Invitacion>();

  async create(data: Omit<Invitacion, 'usadaEn'>): Promise<void> {
    this.porToken.set(data.token, { ...data, usadaEn: null });
  }
  async findByToken(token: string): Promise<Invitacion | null> {
    return this.porToken.get(token) ?? null;
  }
  async marcarUsada(token: string, cuando: Date): Promise<void> {
    const inv = this.porToken.get(token);
    if (inv) inv.usadaEn = cuando;
  }
}

export class InMemorySolicitudAccesoRepository implements ISolicitudAccesoRepository {
  private readonly items: SolicitudAcceso[] = [];
  private seq = 0;

  async create(
    data: Omit<SolicitudAcceso, 'id' | 'estado' | 'createdAt'>,
  ): Promise<SolicitudAcceso> {
    const s: SolicitudAcceso = {
      id: `sol-${++this.seq}`,
      ...data,
      estado: 'pendiente',
      createdAt: new Date(),
    };
    this.items.push(s);
    return s;
  }
  async findByEmail(email: string): Promise<SolicitudAcceso | null> {
    return (
      this.items.find((s) => s.email === email.toLowerCase() && s.estado === 'pendiente') ?? null
    );
  }
  async listPendientes(): Promise<SolicitudAcceso[]> {
    return this.items.filter((s) => s.estado === 'pendiente');
  }
  async updateEstado(id: string, estado: SolicitudAcceso['estado']): Promise<void> {
    const s = this.items.find((x) => x.id === id);
    if (s) s.estado = estado;
  }
}
