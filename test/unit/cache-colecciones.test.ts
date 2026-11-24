import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import {
  CacheColecciones,
  conSelloDeCambios,
  cumpleIgualdades,
} from '../../src/infrastructure/firestore/CacheColecciones.js';
import { FirestoreTicketQueries } from '../../src/infrastructure/firestore/FirestoreTicketQueries.js';

/** Firestore de mentira, compartido por varias «instancias del Worker», que cuenta lecturas. */
function firestoreFalso() {
  const colecciones = new Map<string, Map<string, Record<string, unknown>>>();
  const lecturas = { total: 0, sello: 0 };
  const col = (nombre: string) => {
    if (!colecciones.has(nombre)) colecciones.set(nombre, new Map());
    return colecciones.get(nombre)!;
  };
  const db = {
    collection: (nombre: string) => ({
      get: async () => {
        const docs = [...col(nombre).entries()].map(([id, data]) => ({ id, data: () => data }));
        lecturas.total += docs.length;
        return { docs };
      },
      doc: (id: string) => ({
        get: async () => {
          lecturas.total++;
          if (nombre === 'sistema') lecturas.sello++;
          const data = col(nombre).get(id);
          return { exists: !!data, data: () => data };
        },
        set: async (datos: Record<string, unknown>, opt?: { merge?: boolean }) => {
          col(nombre).set(id, opt?.merge ? { ...(col(nombre).get(id) ?? {}), ...datos } : datos);
        },
      }),
    }),
  };
  return { db: db as unknown as Firestore, col, lecturas };
}

describe('CacheColecciones (copia en memoria con sello de cambios)', () => {
  it('la segunda consulta solo lee el sello; tras un cambio en OTRA instancia vuelve a leer todo', async () => {
    const f = firestoreFalso();
    for (let i = 1; i <= 50; i++) f.col('tickets').set(`t${i}`, { numero: i });
    const instanciaA = new CacheColecciones(f.db);
    const instanciaB = new CacheColecciones(f.db);

    expect(await instanciaA.todos('tickets')).toHaveLength(50);
    const trasPrimera = f.lecturas.total;
    expect(trasPrimera).toBe(51); // 50 tickets + el sello

    await instanciaA.todos('tickets');
    await instanciaA.todos('tickets');
    expect(f.lecturas.total - trasPrimera).toBe(2); // solo el sello, dos veces

    await instanciaB.todos('tickets');
    // B guarda un ticket y pone sello nuevo: A lo ve en su siguiente consulta.
    f.col('tickets').set('t51', { numero: 51 });
    await instanciaB.marcarCambio('tickets');
    expect(await instanciaA.todos('tickets')).toHaveLength(51);
  });

  it('entrega copias: modificar lo recibido no cambia lo guardado', async () => {
    const f = firestoreFalso();
    f.col('tickets').set('t1', { cc: ['a@x.mx'], sla: { horas: 8 } });
    const cache = new CacheColecciones(f.db);
    const [uno] = await cache.todos('tickets');
    (uno!.data.cc as string[]).push('b@x.mx');
    (uno!.data.sla as { horas: number }).horas = 99;
    const [otra] = await cache.todos('tickets');
    expect(otra!.data).toEqual({ cc: ['a@x.mx'], sla: { horas: 8 } });
  });

  it('las igualdades se comportan como el where de Firestore (campo ausente ≠ null)', () => {
    expect(cumpleIgualdades({ agenteAsignadoUid: null }, [['agenteAsignadoUid', null]])).toBe(true);
    expect(cumpleIgualdades({}, [['agenteAsignadoUid', null]])).toBe(false);
    expect(cumpleIgualdades({ abierto: true, estado: 'Abierto' }, [['abierto', true], ['estado', 'Abierto']])).toBe(true);
    expect(cumpleIgualdades({ abierto: false }, [['abierto', true]])).toBe(false);
  });

  it('conSelloDeCambios pone sello después de escribir, aunque la escritura falle', async () => {
    const f = firestoreFalso();
    const cache = new CacheColecciones(f.db);
    const repo = {
      guardado: 0,
      async save() {
        this.guardado++;
      },
      async falla() {
        throw new Error('se cayó');
      },
      async leer() {
        return 'sin sello';
      },
    };
    const envuelto = conSelloDeCambios(repo, cache, ['empresas'], ['save', 'falla']);
    await envuelto.save();
    expect(repo.guardado).toBe(1);
    const sello1 = f.col('sistema').get('sellos_colecciones')?.empresas;
    expect(sello1).toBeTruthy();
    await expect(envuelto.falla()).rejects.toThrow('se cayó');
    expect(f.col('sistema').get('sellos_colecciones')?.empresas).not.toBe(sello1);
    expect(await envuelto.leer()).toBe('sin sello');
  });

  it('FirestoreTicketQueries con la copia filtra igual (abiertos, sin asignar, por empresa) y cuenta sin releer', async () => {
    const f = firestoreFalso();
    const base = { asunto: 'X', estado: 'Abierto', prioridad: 'Media', tipo: 'Soporte', archivado: false };
    f.col('tickets').set('a', { ...base, numero: 1, abierto: true, agenteAsignadoUid: null, empresaId: 'e1' });
    f.col('tickets').set('b', { ...base, numero: 2, abierto: true, agenteAsignadoUid: 'u1', empresaId: 'e1' });
    f.col('tickets').set('c', { ...base, numero: 3, abierto: false, estado: 'Cerrado', agenteAsignadoUid: null, empresaId: 'e2' });
    const q = new FirestoreTicketQueries(f.db, new CacheColecciones(f.db));
    expect((await q.listar({ soloAbiertos: true })).map((t) => t.numero)).toEqual([2, 1]);
    expect((await q.listar({ empresaId: 'e1', agenteAsignadoUid: 'u1' })).map((t) => t.numero)).toEqual([2]);
    expect((await q.listar({ archivado: false, limite: 1 })).map((t) => t.numero)).toEqual([3]);
    const antes = f.lecturas.total;
    expect(await q.contar({ soloAbiertos: true, archivado: false })).toBe(2);
    expect(f.lecturas.total - antes).toBe(1); // solo el sello
  });
});
