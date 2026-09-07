import { beforeEach, describe, expect, it } from 'vitest';
import { BitacoraService, BITACORA_RETENCION_DIAS } from '../../src/application/shared/BitacoraService.js';
import { InMemoryBitacoraRepository } from '../fakes/crm.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

const HOY = new Date('2026-09-07T12:00:00Z');
let n = 0;
const ids = { newId: () => `id-${++n}`, newToken: () => `tok-${++n}` };

describe('BitacoraService', () => {
  let repo: InMemoryBitacoraRepository;
  let clock: FixedClock;
  let service: BitacoraService;

  beforeEach(async () => {
    n = 0;
    repo = new InMemoryBitacoraRepository();
    clock = new FixedClock(HOY);
    service = new BitacoraService(repo, ids, clock, silentLogger);
    // Entradas a 90, 40 y 1 días de antigüedad.
    for (const [dias, modulo, actor] of [
      [90, 'tickets', 'u1'],
      [40, 'empresas', 'u2'],
      [1, 'tickets', 'u1'],
    ] as const) {
      repo.entradas.push({
        id: `e-${dias}`,
        at: new Date(HOY.getTime() - dias * 86_400_000),
        actorUid: actor,
        actorNombre: actor.toUpperCase(),
        accion: 'editar',
        modulo,
        entidadTipo: modulo,
        entidadId: 'x',
        resumen: `cambio en ${modulo}`,
      });
    }
  });

  it('filtra por rango de fechas', async () => {
    const desde = new Date(HOY.getTime() - 50 * 86_400_000);
    const r = await service.listar({ desde });
    expect(r.map((e) => e.id).sort()).toEqual(['e-1', 'e-40']);
  });

  it('aplicarRetencion borra lo anterior a la ventana de retención', async () => {
    expect(BITACORA_RETENCION_DIAS).toBe(60);
    const r = await service.aplicarRetencion();
    expect(r.borradas).toBe(1); // solo la de 90 días
    expect((await service.listar()).map((e) => e.id).sort()).toEqual(['e-1', 'e-40']);
  });

  it('purgar respeta la fecha de corte indicada', async () => {
    const corte = new Date(HOY.getTime() - 20 * 86_400_000);
    const r = await service.purgar(corte);
    expect(r.borradas).toBe(2); // 90 y 40 días
    expect((await service.listar()).map((e) => e.id)).toEqual(['e-1']);
  });

  it('exportarCsv arma cabecera + una fila por entrada, con escape', async () => {
    repo.entradas.push({
      id: 'e-coma',
      at: HOY,
      actorUid: 'u3',
      actorNombre: 'Pérez, Ana',
      accion: 'crear',
      modulo: 'kb',
      entidadTipo: 'articulo',
      entidadId: '7',
      resumen: 'Título con "comillas"',
    });
    const csv = await service.exportarCsv();
    const lineas = csv.split('\r\n');
    expect(lineas[0]).toBe('Fecha,Módulo,Acción,Entidad,Resumen,Usuario');
    expect(lineas).toHaveLength(5); // cabecera + 4 entradas
    expect(csv).toContain('"Pérez, Ana"');
    expect(csv).toContain('"Título con ""comillas"""');
  });
});
