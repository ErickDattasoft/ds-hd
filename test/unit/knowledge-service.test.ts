import { beforeEach, describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { KnowledgeService, huellaKB } from '../../src/application/knowledge/KnowledgeService.js';
import { BitacoraService } from '../../src/application/shared/BitacoraService.js';
import { ArticuloKB, claveRutaKB, coincideTexto, fragmentoKB } from '../../src/core/entities/ArticuloKB.js';
import { ForbiddenError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { aplicarAccesoKB } from '../../src/interfaces/http/rbac/policy.js';
import { InMemoryKnowledgeRepository } from '../fakes/kb.js';
import { InMemoryBitacoraRepository } from '../fakes/crm.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'u1',
  nombre: 'Erick',
  email: 'erick.casas@dattasoft.mx',
  roles: ['admin'],
  rol: 'admin',
  esTecnico: false,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['kb:leer', 'kb:escribir', 'kb:publicar'],
  ...over,
});
const lector = actor({ uid: 'u2', nombre: 'Gaby', permisos: ['kb:leer'] });

const art = (over: Partial<ConstructorParameters<typeof ArticuloKB>[0]> = {}) =>
  new ArticuloKB({ id: `a${++seq}`, titulo: 'Doc', cuerpoMarkdown: 'contenido del documento', ...over });

describe('KnowledgeService — indexar carpetas', () => {
  let repo: InMemoryKnowledgeRepository;
  let bitacora: InMemoryBitacoraRepository;
  let clock: FixedClock;
  let service: KnowledgeService;

  beforeEach(() => {
    seq = 0;
    repo = new InMemoryKnowledgeRepository();
    bitacora = new InMemoryBitacoraRepository();
    clock = new FixedClock(new Date('2026-10-05T12:00:00Z'));
    service = new KnowledgeService(repo, ids, clock, new BitacoraService(bitacora, ids, clock, silentLogger));
  });

  it('crea un artículo por archivo, en su carpeta, con categoría script y ruta', async () => {
    const r = await service.indexar(actor(), 'soporte', [
      { ruta: 'SOPORTE/scripts/respaldo.ps1', contenido: 'Write-Host "hola"' },
      { ruta: 'SOPORTE/Licencias/renovar.md', contenido: '# Renovar\nPasos.' },
      { ruta: 'SOPORTE/vacio.txt', contenido: '   ' },
    ]);
    expect(r).toMatchObject({ creados: 2, actualizados: 0, sinCambios: 0 });
    expect(r.omitidos).toEqual(['SOPORTE/vacio.txt: vacío']);
    const todos = await repo.list();
    const ps1 = todos.find((a) => a.titulo === 'respaldo')!;
    expect(ps1.carpeta).toBe('soporte');
    expect(ps1.esScript).toBe(true);
    expect(ps1.esMarkdown).toBe(false);
    expect(todos.find((a) => a.titulo === 'renovar')!.subcarpeta).toBe('Licencias');
    expect(bitacora.entradas).toHaveLength(1);
    expect(repo.guardados).toBe(1); // toda la tanda en una escritura agrupada
  });

  it('reindexar no duplica: actualiza lo cambiado, ignora lo igual, aunque la carpeta raíz se llame distinto', async () => {
    await service.indexar(actor(), 'empresas', [
      { ruta: 'EMPRESAS/ACME/notas.md', contenido: 'versión 1' },
      { ruta: 'EMPRESAS/ACME/accesos.txt', contenido: 'igual' },
    ]);
    const r = await service.indexar(actor(), 'empresas', [
      { ruta: 'Empresas 2026\\acme\\NOTAS.md', contenido: 'versión 2' },
      { ruta: 'Empresas 2026/ACME/accesos.txt', contenido: 'igual' },
    ]);
    // accesos.txt no cambió de contenido, pero sí su ruta (otra raíz): se guarda la ruta nueva.
    expect(r).toMatchObject({ creados: 0, actualizados: 2, sinCambios: 0 });
    const igual = await service.indexar(actor(), 'empresas', [{ ruta: 'Empresas 2026/ACME/accesos.txt', contenido: 'igual' }]);
    expect(igual).toMatchObject({ creados: 0, actualizados: 0, sinCambios: 1 });
    const todos = await repo.list();
    expect(todos).toHaveLength(2);
    const notas = todos.find((a) => a.titulo === 'NOTAS')!;
    expect(notas.cuerpoMarkdown).toBe('versión 2');
    expect(notas.carpeta).toBe('empresas');
    expect(notas.categoria).toBe('empresa');
  });

  it('el mismo nombre en las dos carpetas son archivos distintos', async () => {
    await service.indexar(actor(), 'empresas', [{ ruta: 'EMPRESAS/LEEME.md', contenido: 'de empresas' }]);
    await service.indexar(actor(), 'soporte', [{ ruta: 'SOPORTE/LEEME.md', contenido: 'de soporte' }]);
    const todos = await repo.list();
    expect(todos.map((a) => a.carpeta).sort()).toEqual(['empresas', 'soporte']);
  });

  it('el índice da la huella de cada archivo, igual a la que calcula el navegador', async () => {
    await service.indexar(actor(), 'soporte', [{ ruta: 'SOPORTE/a.md', contenido: 'ñandú á' }]);
    const indice = await service.indice(actor(), 'soporte');
    expect(indice).toEqual([{ id: expect.any(String), clave: 'a.md', titulo: 'a', huella: await huellaKB('ñandú á') }]);
    expect(await service.indice(actor(), 'empresas')).toEqual([]);
  });

  it('quitar borra solo los de esa carpeta', async () => {
    await service.indexar(actor(), 'soporte', [{ ruta: 'S/a.md', contenido: 'x' }]);
    await service.indexar(actor(), 'empresas', [{ ruta: 'E/b.md', contenido: 'y' }]);
    const [a, b] = [(await repo.list()).find((x) => x.titulo === 'a')!, (await repo.list()).find((x) => x.titulo === 'b')!];
    expect(await service.quitar(actor(), 'soporte', [a.id, b.id])).toBe(1);
    expect((await repo.list()).map((x) => x.titulo)).toEqual(['b']);
  });

  it('quien solo tiene acceso de lectura no indexa, no borra, no exporta', async () => {
    await expect(service.indexar(lector, 'soporte', [{ ruta: 'S/a.md', contenido: 'x' }])).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.indice(lector, 'soporte')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.quitar(lector, 'soporte', ['x'])).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.exportarZip(lector)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.listar(actor({ permisos: [] }))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.listar(lector)).resolves.toEqual([]);
  });

  it('exportarZip: un archivo por artículo, en su ruta; filtra por carpeta', async () => {
    await service.indexar(actor(), 'soporte', [{ ruta: 'SOPORTE/scripts/x.ps1', contenido: 'Get-Date' }]);
    await service.indexar(actor(), 'empresas', [{ ruta: 'EMPRESAS/y.md', contenido: 'empresa' }]);
    const zip = unzipSync(await service.exportarZip(actor(), { carpeta: 'soporte' }));
    expect(Object.keys(zip)).toEqual(['SOPORTE/scripts/x.ps1']);
    expect(strFromU8(zip['SOPORTE/scripts/x.ps1']!)).toBe('Get-Date');
  });

  it('relacionados: misma carpeta, por tags compartidos o misma subcarpeta', async () => {
    const base = art({ titulo: 'Base', carpeta: 'empresas', rutaDestino: 'E/ACME/base.md', tags: ['nomina'] });
    const mismaEmpresa = art({ titulo: 'Otra de ACME', carpeta: 'empresas', rutaDestino: 'E/ACME/otra.md' });
    const porTag = art({ titulo: 'Por tag', carpeta: 'empresas', rutaDestino: 'E/BETA/x.md', tags: ['nomina'] });
    const otraCarpeta = art({ titulo: 'Soporte', carpeta: 'soporte', rutaDestino: 'S/ACME/z.md', tags: ['nomina'] });
    for (const a of [base, mismaEmpresa, porTag, otraCarpeta]) await repo.save(a);
    const rel = await service.relacionados(lector, base);
    expect(rel.map((a) => a.titulo)).toEqual(['Por tag', 'Otra de ACME']);
  });
});

describe('Búsqueda en la base de conocimiento', () => {
  const doc = art({
    titulo: 'Configurar Nóminas',
    rutaDestino: 'EMPRESAS/Grupo ACME/configurar.md',
    cuerpoMarkdown: 'Para la versión 14.2.1 de CONTPAQi hay que reinstalar el servidor de licencias.',
    tags: ['contpaqi'],
  });

  it('busca en nombre, ruta (empresa) y contenido, sin acentos ni mayúsculas', () => {
    expect(coincideTexto(doc, 'nominas', false)).toBe(true);
    expect(coincideTexto(doc, 'acme', false)).toBe(true);
    expect(coincideTexto(doc, '14.2.1', false)).toBe(true);
    expect(coincideTexto(doc, 'VERSION licencias', false)).toBe(true);
    expect(coincideTexto(doc, 'licencias versión', true)).toBe(false);
    expect(coincideTexto(doc, 'servidor de licencias', true)).toBe(true);
    expect(coincideTexto(doc, 'inexistente', false)).toBe(false);
  });

  it('el fragmento muestra dónde coincidió, con el texto original', () => {
    const f = fragmentoKB(doc, 'version 14', 3)!;
    expect(f.coincidencia).toBe('versión 14');
    expect(f.antes.startsWith('…')).toBe(true);
    expect(fragmentoKB(doc, 'nominas')).toBeNull(); // solo coincidió el nombre
  });

  it('la clave de ruta ignora la carpeta raíz, las diagonales y mayúsculas', () => {
    expect(claveRutaKB('EMPRESAS\\ACME\\Notas.md')).toBe('acme/notas.md');
    expect(claveRutaKB('/otra raíz//acme/notas.md/')).toBe('acme/notas.md');
  });

  it('carpeta: los artículos de antes se reparten por categoría', () => {
    expect(art({ categoria: 'empresa' }).carpeta).toBe('empresas');
    expect(art({ categoria: 'solucion' }).carpeta).toBe('soporte');
    expect(art({}).carpeta).toBe('soporte');
  });
});

describe('Acceso a la KB (no depende del rol)', () => {
  it('se quitan los kb:* del rol; el marcado solo lee; el propietario hace todo', () => {
    const delRol = ['tickets:leer', 'kb:leer', 'kb:escribir'] as const;
    expect(aplicarAccesoKB([...delRol], { esPropietario: false, marcado: false })).toEqual(['tickets:leer']);
    expect(aplicarAccesoKB([...delRol], { esPropietario: false, marcado: true })).toEqual(['tickets:leer', 'kb:leer']);
    expect(aplicarAccesoKB(['tickets:leer'], { esPropietario: true, marcado: false })).toEqual([
      'tickets:leer',
      'kb:leer',
      'kb:escribir',
      'kb:publicar',
    ]);
  });
});
