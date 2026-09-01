import { beforeEach, describe, expect, it } from 'vitest';
import type { ITicketRepository } from '../../src/core/ports/repositories/ITicketRepository.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { InMemoryTicketStore, InMemoryTicketRepository } from '../fakes/tickets.js';

/** Contrato de {@link ITicketRepository}: mismas garantías para InMemory y Firestore. */
function contrato(nombre: string, crear: () => Promise<{ repo: ITicketRepository; limpiar: () => Promise<void> }>): void {
  describe(`ITicketRepository — ${nombre}`, () => {
    let repo: ITicketRepository;
    let limpiar: () => Promise<void>;

    beforeEach(async () => {
      ({ repo, limpiar } = await crear());
      await limpiar();
    });

    const nuevo = (id: string, numero: number) =>
      Ticket.crear({
        id,
        numero,
        asunto: `Ticket ${numero}`,
        descripcion: 'descripción de prueba',
        tipo: 'General',
        prioridad: 'Media',
        estadoInicial: 'Abierto',
        canal: 'interno',
        ahora: new Date('2026-09-01T09:00:00Z'),
      });

    it('null si no existe; upsert por id', async () => {
      expect(await repo.findById('nope')).toBeNull();
      const t = nuevo('t1', 1);
      await repo.save(t);
      expect((await repo.findById('t1'))?.numero).toBe(1);
      t.asunto = 'Renombrado';
      await repo.save(t);
      expect((await repo.findById('t1'))?.asunto).toBe('Renombrado');
    });

    it('busca por número', async () => {
      await repo.save(nuevo('t9', 9));
      expect((await repo.findByNumero(9))?.id).toBe('t9');
      expect(await repo.findByNumero(123)).toBeNull();
    });

    it('notas y eventos se guardan y se leen ordenados', async () => {
      await repo.save(nuevo('t1', 1));
      await repo.agregarNota('t1', { id: 'n1', tipo: 'publica', cuerpo: 'hola', autorUid: 'u', autorNombre: 'U', createdAt: new Date('2026-09-01T10:00:00Z') });
      await repo.agregarNota('t1', { id: 'n2', tipo: 'interna', cuerpo: 'ojo', autorUid: 'u', autorNombre: 'U', createdAt: new Date('2026-09-01T11:00:00Z') });
      const notas = await repo.listarNotas('t1');
      expect(notas.map((n) => n.id)).toEqual(['n1', 'n2']);

      await repo.registrarEvento('t1', { id: 'e1', tipo: 'creacion', resumen: 'creado', actorUid: null, actorNombre: null, at: new Date('2026-09-01T09:00:00Z') });
      expect(await repo.listarEventos('t1')).toHaveLength(1);
    });
  });
}

contrato('InMemory', async () => {
  const store = new InMemoryTicketStore();
  return {
    repo: new InMemoryTicketRepository(store),
    limpiar: async () => {
      store.tickets.clear();
      store.notas.clear();
      store.eventos.clear();
    },
  };
});

const emulador = process.env.FIRESTORE_EMULATOR_HOST;
if (emulador) {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { FirestoreTicketRepository } = await import(
    '../../src/infrastructure/firestore/FirestoreTicketRepository.js'
  );
  const app = getApps()[0] ?? initializeApp({ projectId: 'ds-hd-test' });
  const db = getFirestore(app);
  contrato('Firestore (emulador)', async () => ({
    repo: new FirestoreTicketRepository(db),
    limpiar: async () => {
      const snap = await db.collection('tickets').get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    },
  }));
}
