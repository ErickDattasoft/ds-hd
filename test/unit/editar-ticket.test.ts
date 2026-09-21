import { describe, expect, it } from 'vitest';
import { EditarTicketService } from '../../src/application/tickets/EditarTicketService.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryTicketRepository, InMemoryTicketStore, InMemoryConfiguracionRepository } from '../fakes/tickets.js';
import { InMemoryAdjuntoTicketRepository } from '../fakes/InMemoryAdjuntoTicketRepository.js';
import { FixedClock } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };
const actor = {
  uid: 'u1', nombre: 'Erick', permisos: ['tickets:editar', 'tickets:leer_todos', 'tickets:ver_notas_internas'],
} as unknown as SessionUser;

describe('editar un ticket ya creado', () => {
  it('cambia los datos, conserva las imágenes que ya eran adjuntos y anota qué cambió', async () => {
    const store = new InMemoryTicketStore();
    const repo = new InMemoryTicketRepository(store);
    const adjuntos = new InMemoryAdjuntoTicketRepository();
    const config = new InMemoryConfiguracionRepository();
    const cfg = await config.obtenerTickets();
    await repo.save(
      new Ticket({
        id: 'tic-1059', numero: 1059, asunto: 'Actualizar estatus', tipo: cfg.tipos[0]!, estado: 'Abierto',
        prioridad: 'Baja', canal: 'interno',
        descripcion: '<p>Adjunto pantallas.</p><p><img data-adj-id="rJyuf4QGqbHXQtaA0Fku"></p>',
      }),
    );
    const svc = new EditarTicketService(repo, config, adjuntos, ids, new FixedClock(new Date()));
    await svc.ejecutar({
      actor, ticketId: 'tic-1059', asunto: 'Actualizar estatus de complemento', tipo: cfg.tipos[0]!, prioridad: 'Alta',
      // Así llega del editor: la imagen existente con su referencia (sin src) y una nueva pegada.
      descripcion:
        '<p>Adjunto pantallas.</p><p><img data-adj-id="rJyuf4QGqbHXQtaA0Fku"><img src="data:image/png;base64,iVBORw0KGgo="></p>',
      sistema: null, grupo: 'Soporte', empresaId: null, empresaNombre: 'ACME', contactoNombre: 'Ahmad',
      contactoCorreo: 'A@acme.mx', cc: ['b@acme.mx'], cco: [], solicitadoPor: 'AHMAD SOLTANI', canalizadoA: '',
    });
    const t = (await repo.findById('tic-1059'))!;
    expect(t).toMatchObject({ asunto: 'Actualizar estatus de complemento', prioridad: 'Alta', empresaNombre: 'ACME', contactoCorreo: 'a@acme.mx', cc: ['b@acme.mx'], solicitadoPor: 'AHMAD SOLTANI' });
    expect(t.descripcion).toContain('data-adj-id="rJyuf4QGqbHXQtaA0Fku"');
    expect([...adjuntos.docs.values()]).toHaveLength(1);
    const eventos = await repo.listarEventos('tic-1059');
    expect(eventos.at(-1)!.resumen).toMatch(/^Editó: asunto, descripción, prioridad/);
  });

  it('no deja editar el marcador de un folio eliminado', async () => {
    const repo = new InMemoryTicketRepository(new InMemoryTicketStore());
    const original = new Ticket({ id: 't', numero: 5, asunto: 'x x x', descripcion: 'algo largo', tipo: 'General', estado: 'Abierto', prioridad: 'Media', canal: 'interno' });
    await repo.save(Ticket.marcadorDe(original, new Date()));
    const svc = new EditarTicketService(repo, new InMemoryConfiguracionRepository(), new InMemoryAdjuntoTicketRepository(), ids, new FixedClock(new Date()));
    await expect(
      svc.ejecutar({ actor, ticketId: 't-eliminado', asunto: 'Nuevo', descripcion: 'descripcion', tipo: 'General', prioridad: 'Media', sistema: null, grupo: null, empresaId: null, empresaNombre: null, contactoNombre: null, contactoCorreo: null, cc: [], cco: [], solicitadoPor: '', canalizadoA: '' }),
    ).rejects.toThrow(/eliminado/);
  });
});
