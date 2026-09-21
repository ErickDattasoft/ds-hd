import { describe, expect, it } from 'vitest';
import { PapeleraService } from '../../src/application/papelera/PapeleraService.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryTicketRepository, InMemoryTicketStore, InMemoryTicketQueries } from '../fakes/tickets.js';
import { InMemoryAdjuntoTicketRepository } from '../fakes/InMemoryAdjuntoTicketRepository.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

describe('eliminar un ticket desde la papelera', () => {
  it('conserva su folio como "Ticket eliminado por administrador" y borra su contenido', async () => {
    const store = new InMemoryTicketStore();
    const repo = new InMemoryTicketRepository(store);
    const original = new Ticket({
      id: 't4', numero: 1004, asunto: 'MAIL', descripcion: 'datos del cliente', tipo: 'Soporte',
      estado: 'Pendiente', prioridad: 'Alta', canal: 'interno', empresaNombre: 'ACME', contactoCorreo: 'a@acme.mx',
      archivado: true,
    });
    await repo.save(original);
    await repo.agregarNota('t4', { id: 'n1', tipo: 'publica', cuerpo: 'hola', autorUid: 'x', autorNombre: 'X', createdAt: new Date() });
    const bitacora = { registrar: async () => {} };
    const svc = new PapeleraService(
      {} as never, {} as never, {} as never, {} as never, {} as never,
      repo, new InMemoryTicketQueries(store), new InMemoryAdjuntoTicketRepository(),
      bitacora as never, silentLogger, new FixedClock(new Date('2026-09-21T12:00:00Z')),
    );
    const res = await svc.eliminar({ permisos: ['papelera:gestionar'] } as unknown as SessionUser, 'tickets', ['t4']);
    expect(res).toEqual({ ok: 1, errores: 0 });

    const queda = await repo.findById('t4');
    expect(queda).not.toBeNull();
    expect(queda!).toMatchObject({
      numero: 1004, asunto: 'Ticket eliminado por administrador', estado: 'Cerrado',
      archivado: false, eliminadoPorAdmin: true, empresaNombre: null, contactoCorreo: null,
    });
    expect(await repo.listarNotas('t4')).toEqual([]);
  });
});
