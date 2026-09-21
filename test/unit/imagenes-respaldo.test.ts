import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { ImagenesRespaldoService } from '../../src/application/configuracion/ImagenesRespaldoService.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryTicketQueries, InMemoryTicketStore } from '../fakes/tickets.js';
import { InMemoryAdjuntoTicketRepository } from '../fakes/InMemoryAdjuntoTicketRepository.js';

const admin = { permisos: ['configuracion:integraciones'] } as unknown as SessionUser;
const ticket = (id: string, numero: number) =>
  new Ticket({ id, numero, asunto: 'Asunto', descripcion: 'descripcion', tipo: 'General', estado: 'Abierto', prioridad: 'Media', canal: 'interno' });
const img = (id: string, ticketId: string, contentType: string, t: number) => ({
  id, ticketId, nombre: id, contentType, tamano: 3, data: `data:${contentType};base64,AAEC`,
  subidoPorUid: null, subidoPorNombre: null, createdAt: new Date(t),
});

describe('imágenes de los tickets al respaldar', () => {
  it('dice qué tickets tienen imágenes y las baja en un zip con el folio en el nombre', async () => {
    const store = new InMemoryTicketStore();
    store.tickets.set('tic-1059', ticket('tic-1059', 1059));
    store.tickets.set('tic-1033', ticket('tic-1033', 1033));
    const adj = new InMemoryAdjuntoTicketRepository();
    await adj.crear(img('b', 'tic-1059', 'image/png', 2));
    await adj.crear(img('a', 'tic-1059', 'image/jpeg', 1));
    await adj.crear(img('c', 'tic-1033', 'image/png', 1));
    await adj.crear({ ...img('pdf', 'tic-1033', 'application/pdf', 1) });
    const svc = new ImagenesRespaldoService(adj, new InMemoryTicketQueries(store));

    expect(await svc.resumen(admin)).toEqual({
      total: 3,
      tickets: [{ numero: 1033, imagenes: 1 }, { numero: 1059, imagenes: 2 }],
    });
    const zip = unzipSync(new Uint8Array(await svc.zip(admin)));
    expect(Object.keys(zip).sort()).toEqual(['ticket-1033-1.png', 'ticket-1059-1.jpg', 'ticket-1059-2.png']);
    expect([...zip['ticket-1059-1.jpg']!]).toEqual([0, 1, 2]);
  });

  it('sin permiso no deja bajar nada', async () => {
    const svc = new ImagenesRespaldoService(new InMemoryAdjuntoTicketRepository(), new InMemoryTicketQueries(new InMemoryTicketStore()));
    await expect(svc.resumen({ permisos: [] } as unknown as SessionUser)).rejects.toThrow();
  });
});
