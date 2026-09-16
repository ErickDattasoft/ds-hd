import { beforeEach, describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { KnowledgeService } from '../../src/application/knowledge/KnowledgeService.js';
import { BitacoraService } from '../../src/application/shared/BitacoraService.js';
import { ArticuloKB } from '../../src/core/entities/ArticuloKB.js';
import { ForbiddenError, ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryKnowledgeRepository } from '../fakes/kb.js';
import { InMemoryBitacoraRepository } from '../fakes/crm.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'u1',
  nombre: 'Admin',
  email: 'a@d.com',
  roles: ['admin'],
  rol: 'admin',
  esTecnico: false,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['kb:escribir', 'kb:publicar'],
  ...over,
});

const ctxStaff = { esStaff: true, esCliente: false, anonimo: false };

describe('KnowledgeService — lote y export', () => {
  let repo: InMemoryKnowledgeRepository;
  let bitacora: InMemoryBitacoraRepository;
  let clock: FixedClock;
  let service: KnowledgeService;

  beforeEach(() => {
    seq = 0;
    repo = new InMemoryKnowledgeRepository();
    bitacora = new InMemoryBitacoraRepository();
    clock = new FixedClock(new Date('2026-09-09T12:00:00Z'));
    service = new KnowledgeService(repo, ids, clock, new BitacoraService(bitacora, ids, clock, silentLogger));
  });

  it('crearLote: un artículo por archivo, adivina categoría script y guarda rutaDestino', async () => {
    const creados = await service.crearLote(actor(), [
      { nombre: 'respaldo.ps1', contenido: 'Write-Host "hola mundo desde powershell"', rutaRelativa: 'scripts/respaldo.ps1' },
      { nombre: 'guia.md', contenido: '# Guía\nContenido suficientemente largo.' },
      { nombre: 'vacio.txt', contenido: '   ' }, // se descarta
    ]);
    expect(creados).toHaveLength(2);
    const ps1 = creados.find((a) => a.titulo === 'respaldo')!;
    expect(ps1.categoria).toBe('script');
    expect(ps1.esScript).toBe(true);
    expect(ps1.rutaDestino).toBe('scripts/respaldo.ps1');
    expect(creados.find((a) => a.titulo === 'guia')!.categoria).toBe('solucion');
    expect(bitacora.entradas).toHaveLength(1);
  });

  it('crearLote sin permiso de publicar no puede publicar', async () => {
    await expect(
      service.crearLote(actor({ permisos: ['kb:escribir'] }), [{ nombre: 'x.md', contenido: 'contenido largo aquí' }], {
        publicado: true,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('crearLote sin archivos con contenido lanza ValidationError', async () => {
    await expect(service.crearLote(actor(), [{ nombre: 'x.txt', contenido: 'no' }])).rejects.toThrow(ValidationError);
  });

  it('exportarZip: un archivo por artículo, en su rutaDestino', async () => {
    await repo.save(
      new ArticuloKB({
        id: 'a1', titulo: 'Reinicio', cuerpoMarkdown: 'net stop / net start', categoria: 'script',
        rutaDestino: 'scripts/reinicio.bat', publicado: true, visibilidad: 'staff',
      }),
    );
    await repo.save(
      new ArticuloKB({ id: 'a2', titulo: 'Notas varias', cuerpoMarkdown: 'texto de notas largo', visibilidad: 'staff' }),
    );
    const zip = await service.exportarZip(ctxStaff, { categoria: 'script' });
    const archivos = unzipSync(new Uint8Array(zip));
    expect(Object.keys(archivos)).toEqual(['scripts/reinicio.bat']);
    expect(strFromU8(archivos['scripts/reinicio.bat']!)).toBe('net stop / net start');
  });

  it('relacionados: artículos visibles que comparten tags, más compartidos primero, excluye el propio', async () => {
    const base = { publicado: true, visibilidad: 'publico' as const };
    const a = new ArticuloKB({ id: 'a', titulo: 'Art A', cuerpoMarkdown: 'contenido suficiente', tags: ['contpaqi', 'nomina'], ...base });
    await repo.save(a);
    await repo.save(new ArticuloKB({ id: 'b', titulo: 'Art B', cuerpoMarkdown: 'contenido suficiente', tags: ['contpaqi'], ...base }));
    await repo.save(new ArticuloKB({ id: 'c', titulo: 'Art C', cuerpoMarkdown: 'contenido suficiente', tags: ['contpaqi', 'nomina'], ...base }));
    await repo.save(new ArticuloKB({ id: 'd', titulo: 'Art D', cuerpoMarkdown: 'contenido suficiente', tags: ['bancos'], ...base }));

    const relacionados = await service.relacionados(ctxStaff, a);
    expect(relacionados.map((r) => r.id)).toEqual(['c', 'b']);
  });

  it('relacionados: sin tags no hay nada que relacionar', async () => {
    const a = new ArticuloKB({ id: 'a', titulo: 'Art A', cuerpoMarkdown: 'contenido suficiente', publicado: true, visibilidad: 'publico' });
    expect(await service.relacionados(ctxStaff, a)).toEqual([]);
  });
});

describe('KnowledgeService — búsqueda: tag, frase exacta y cuerpo', () => {
  let repo: InMemoryKnowledgeRepository;
  let service: KnowledgeService;

  beforeEach(async () => {
    seq = 0;
    repo = new InMemoryKnowledgeRepository();
    const clock = new FixedClock(new Date('2026-09-16T12:00:00Z'));
    service = new KnowledgeService(
      repo,
      ids,
      clock,
      new BitacoraService(new InMemoryBitacoraRepository(), ids, clock, silentLogger),
    );
    await repo.save(
      new ArticuloKB({
        id: 'a1', titulo: 'Reinicio de servicio Contpaqi', cuerpoMarkdown: 'Detener y arrancar el servicio de licencias.',
        tags: ['contpaqi', 'licencias'], publicado: true, visibilidad: 'publico',
      }),
    );
    await repo.save(
      new ArticuloKB({
        id: 'a2', titulo: 'Backup de nómina', cuerpoMarkdown: 'Respaldo manual del módulo de nómina.',
        tags: ['nomina'], publicado: true, visibilidad: 'publico',
      }),
    );
  });

  const ctxPublico = { esStaff: false, esCliente: false, anonimo: true };

  it('filtro por tag exacto', async () => {
    const r = await service.listarVisibles(ctxPublico, { tag: 'nomina' });
    expect(r.map((a) => a.id)).toEqual(['a2']);
  });

  it('texto sin fraseExacta: busca cada palabra por separado, incluido el cuerpo', async () => {
    const r = await service.listarVisibles(ctxPublico, { texto: 'arrancar servicio' });
    expect(r.map((a) => a.id)).toEqual(['a1']);
  });

  it('fraseExacta: exige la frase completa contigua', async () => {
    const sinFrase = await service.listarVisibles(ctxPublico, { texto: 'servicio arrancar', fraseExacta: true });
    expect(sinFrase).toHaveLength(0);
    const conFrase = await service.listarVisibles(ctxPublico, { texto: 'arrancar el servicio', fraseExacta: true });
    expect(conFrase.map((a) => a.id)).toEqual(['a1']);
  });
});
