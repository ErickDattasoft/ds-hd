import { afterEach, describe, expect, it } from 'vitest';
import { diaDeCuota, inicioDiaCuota, reinicioCuota, horaMexicoDe } from '../../src/core/entities/value-objects/cuotaFirestore.js';
import { ConsumoFirestoreService } from '../../src/application/dashboard/ConsumoFirestoreService.js';
import { InMemoryConsumoFirestoreRepository } from '../fakes/InMemoryConsumoFirestoreRepository.js';
import { guardarConsumoSiToca, reiniciarMedidorParaPruebas } from '../../src/infrastructure/firestore-rest/medidorConsumo.js';
import { sumarLecturas } from '../../src/infrastructure/firestore-rest/lecturas.js';
import { FirestoreRestClient } from '../../src/infrastructure/firestore-rest/FirestoreRestClient.js';

const reloj = (iso: string) => ({ now: () => new Date(iso) });

describe('🔥 cuota de Firestore: el día se corta a medianoche del Pacífico', () => {
  it('en noviembre (sin horario de verano en EE. UU.) se reinicia a las 2:00 a.m. de Mérida', () => {
    // 25-nov 01:30 Mérida = 07:30 UTC = 24-nov 23:30 Pacífico: sigue siendo el día 24.
    expect(diaDeCuota(new Date('2026-11-25T07:30:00Z'))).toBe('2026-11-24');
    expect(diaDeCuota(new Date('2026-11-25T08:30:00Z'))).toBe('2026-11-25');
    expect(inicioDiaCuota(new Date('2026-11-25T18:00:00Z')).toISOString()).toBe('2026-11-25T08:00:00.000Z');
    expect(reinicioCuota(new Date('2026-11-25T18:00:00Z')).toISOString()).toBe('2026-11-26T08:00:00.000Z');
    expect(horaMexicoDe(new Date('2026-11-25T18:00:00Z'))).toBe('12');
  });

  it('en verano se reinicia a la 1:00 a.m. de Mérida', () => {
    expect(reinicioCuota(new Date('2026-07-10T18:00:00Z')).toISOString()).toBe('2026-07-11T07:00:00.000Z');
  });
});

describe('ConsumoFirestoreService', () => {
  it('porcentaje, nivel y aviso si a este ritmo se acaba antes del reinicio', async () => {
    const repo = new InMemoryConsumoFirestoreRepository();
    // 12:00 de Mérida; la hora anterior (11) gastó 4 mil.
    repo.dias.set('2026-11-25', { dia: '2026-11-25', lecturas: 41_000, porHora: { '09': 2_000, '11': 4_000, '12': 500 } });
    const r = await new ConsumoFirestoreService(repo, reloj('2026-11-25T18:00:00Z')).hoy();
    expect(r).toMatchObject({ lecturas: 41_000, porcentaje: 82, nivel: 'peligro', ritmoPorHora: 4_000, anchoBarra: 82 });
    expect(r.horasRestantes).toBe(2.3); // 9 mil que quedan / 4 mil por hora
    expect(r.seAcabaAntesDelReinicio).toBe(true);
    expect(r.reinicia).toMatch(/^2:00/);
    expect(r.horas.map((h) => h.hora)).toEqual(['09', '11', '12']);
    expect(r.horas[1]!.alto).toBe(100);
  });

  it('sin nada anotado: 0 % y verde', async () => {
    const r = await new ConsumoFirestoreService(new InMemoryConsumoFirestoreRepository(), reloj('2026-11-25T18:00:00Z')).hoy();
    expect(r).toMatchObject({ lecturas: 0, porcentaje: 0, nivel: 'ok', horasRestantes: null, seAcabaAntesDelReinicio: false });
  });
});

describe('medidor del Worker', () => {
  afterEach(() => reiniciarMedidorParaPruebas());

  it('junta las lecturas y las guarda como mucho una vez por minuto (con incremento, sin leer)', async () => {
    reiniciarMedidorParaPruebas();
    const llamadas: { path: string; campos: Record<string, number> }[] = [];
    const cliente = { incrementar: async (path: string, campos: Record<string, number>) => void llamadas.push({ path, campos }) };
    const t0 = new Date('2026-11-25T18:00:00Z');

    sumarLecturas(30);
    await guardarConsumoSiToca(cliente, { ahora: t0 });
    expect(llamadas).toEqual([{ path: 'consumo_firestore/2026-11-25', campos: { lecturas: 30, 'horas.12': 30 } }]);

    sumarLecturas(5);
    await guardarConsumoSiToca(cliente, { ahora: new Date(t0.getTime() + 20_000) }); // antes del minuto: espera
    sumarLecturas(5);
    await guardarConsumoSiToca(cliente, { ahora: new Date(t0.getTime() + 61_000) });
    expect(llamadas).toHaveLength(2);
    expect(llamadas[1]!.campos.lecturas).toBe(10);
  });

  it('si falla al guardar, las lecturas se conservan para la siguiente vuelta', async () => {
    reiniciarMedidorParaPruebas();
    let falla = true;
    const guardadas: number[] = [];
    const cliente = {
      incrementar: async (_p: string, c: Record<string, number>) => {
        if (falla) throw new Error('sin red');
        guardadas.push(c.lecturas!);
      },
    };
    sumarLecturas(12);
    await guardarConsumoSiToca(cliente, { forzar: true });
    falla = false;
    await guardarConsumoSiToca(cliente, { forzar: true });
    expect(guardadas).toEqual([12]);
  });

  it('el cliente REST manda el incremento al servidor (campo con número entre comillas invertidas)', async () => {
    const cuerpos: unknown[] = [];
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      cuerpos.push(JSON.parse(String(init?.body)));
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    const c = new FirestoreRestClient({ projectId: 'p', baseUrl: 'http://x/v1', fetchImpl });
    await c.incrementar('consumo_firestore/2026-11-25', { lecturas: 7, 'horas.08': 7 });
    expect(cuerpos[0]).toEqual({
      writes: [
        {
          update: { name: 'projects/p/databases/(default)/documents/consumo_firestore/2026-11-25', fields: {} },
          updateMask: { fieldPaths: [] },
          updateTransforms: [
            { fieldPath: 'lecturas', increment: { integerValue: '7' } },
            { fieldPath: 'horas.`08`', increment: { integerValue: '7' } },
          ],
        },
      ],
    });
  });
});
