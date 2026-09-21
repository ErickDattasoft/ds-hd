import { describe, expect, it } from 'vitest';
import { PapeleraService } from '../../src/application/papelera/PapeleraService.js';
import { ArchivarTicketService } from '../../src/application/tickets/ArchivarTicketService.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryTicketRepository, InMemoryTicketStore, InMemoryTicketQueries } from '../fakes/tickets.js';
import { InMemoryAdjuntoTicketRepository } from '../fakes/InMemoryAdjuntoTicketRepository.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

const admin = { uid: 'a', nombre: 'Admin', permisos: ['tickets:eliminar', 'papelera:gestionar'] } as unknown as SessionUser;
let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

function montar() {
  const store = new InMemoryTicketStore();
  const repo = new InMemoryTicketRepository(store);
  const queries = new InMemoryTicketQueries(store);
  const clock = new FixedClock(new Date('2026-09-21T12:00:00Z'));
  const archivar = new ArchivarTicketService(repo, ids, clock);
  const papelera = new PapeleraService(
    {} as never, {} as never, archivar, {} as never, {} as never, repo, queries,
    new InMemoryAdjuntoTicketRepository(), { registrar: async () => {} } as never, silentLogger, clock,
  );
  return { repo, queries, archivar, papelera };
}

const original = () =>
  new Ticket({
    id: 'tic-1004', numero: 1004, asunto: 'MAIL', descripcion: 'datos', tipo: 'Soporte', estado: 'Pendiente',
    prioridad: 'Alta', canal: 'interno', empresaNombre: 'ACME', createdAt: new Date('2026-07-03T00:00:00Z'),
  });

describe('folio de un ticket en la papelera (como el CRM viejo)', () => {
  it('al mandarlo a la papelera, un marcador ocupa su folio; al restaurarlo se quita', async () => {
    const { repo, queries, archivar } = montar();
    await repo.save(original());
    await archivar.ejecutar({ actor: admin, ticketId: 'tic-1004', archivar: true });

    const visibles = await queries.listar({ archivado: false });
    expect(visibles.map((t) => [t.numero, t.asunto])).toEqual([[1004, 'Ticket eliminado por administrador']]);
    expect(visibles[0]!.createdAt).toEqual(new Date('2026-07-03T00:00:00Z'));
    expect((await repo.findById('tic-1004'))!.archivado).toBe(true);
    expect((await repo.findByNumero(1004))!.id).toBe('tic-1004');
    await expect(archivar.ejecutar({ actor: admin, ticketId: 'tic-1004-eliminado', archivar: true })).rejects.toThrow(
      /ya está marcado como eliminado/,
    );

    await archivar.ejecutar({ actor: admin, ticketId: 'tic-1004', archivar: false });
    expect((await queries.listar({ archivado: false })).map((t) => t.asunto)).toEqual(['MAIL']);
    expect(await repo.findById('tic-1004-eliminado')).toBeNull();
  });

  it('borrarlo definitivamente deja el marcador y quita el ticket real con su contenido', async () => {
    const { repo, queries, archivar, papelera } = montar();
    await repo.save(original());
    await repo.agregarNota('tic-1004', { id: 'n1', tipo: 'publica', cuerpo: 'hola', autorUid: 'x', autorNombre: 'X', createdAt: new Date() });
    await archivar.ejecutar({ actor: admin, ticketId: 'tic-1004', archivar: true });
    expect(await papelera.eliminar(admin, 'tickets', ['tic-1004'])).toEqual({ ok: 1, errores: 0 });

    expect(await repo.findById('tic-1004')).toBeNull();
    expect(await repo.listarNotas('tic-1004')).toEqual([]);
    const lista = await queries.listar({});
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ numero: 1004, eliminadoPorAdmin: true, estado: 'Cerrado', archivado: false });
  });
});
