import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';

const ADMIN = { uid: 'u-a', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };
/** El propietario de la KB (KB_PROPIETARIO_EMAIL): el único que indexa y da acceso. */
const DUENO = { uid: 'u-e', email: 'erick.casas@dattasoft.mx', password: 'erick12345', nombre: 'Erick', rol: 'admin' as const };
const GABY = { uid: 'u-g', email: 'gaby@dattasoft.mx', password: 'gaby12345', nombre: 'Gaby', rol: 'soporte' as const };
const CLI = { uid: 'u-c', email: 'c@e.com', password: 'cliente123', nombre: 'Cli', rol: 'cliente' as const, empresaId: 'e1' };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

describe('versiones de sistemas', () => {
  it('admin registra una versión y aparece en la lista', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent
      .post('/app/versiones')
      .type('form')
      .send({ _csrf: csrf, sistema: 'CONTPAQi Contabilidad', versionActual: '16.1.1', fechaLiberacion: '2026-08-01' });
    expect(res.status).toBe(302);
    const lista = await agent.get('/app/versiones');
    expect(lista.text).toContain('CONTPAQi Contabilidad');
    expect(lista.text).toContain('16.1.1');
  });

  it('grid "versiones del mercado": guarda varias de un tiro (upsert por sistema)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.configuracionRepo.config.sistemas = ['Contabilidad', 'Bancos', 'Nóminas'];
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.post('/app/versiones/mercado').type('form').send({
      _csrf: csrf,
      sistema: ['Bancos', 'Contabilidad', 'Nóminas'],
      versionActual: ['14.0.0', '19.1.0', ''],
      fechaLiberacion: ['', '2026-08-01', ''],
      linkDescarga: ['', '', ''],
      linkCartaTecnica: ['', 'https://ct/cont', ''],
    });
    expect(res.status).toBe(302);
    const registradas = await t.versionRepo.list();
    expect(registradas.map((v) => v.sistema).sort()).toEqual(['Bancos', 'Contabilidad']); // Nóminas vacío → no se crea
    expect(registradas.find((v) => v.sistema === 'Contabilidad')?.linkCartaTecnica).toBe('https://ct/cont');
  });

  it('cada SP se guarda en su renglón con su descarga; la versión que se compara es versión + SP más alto', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.configuracionRepo.config.sistemas = ['COMERCIAL PREMIUM', 'NOMINAS'];
    const { VersionSistema } = await import('../../src/core/entities/VersionSistema.js');
    await t.versionRepo.save(new VersionSistema({ id: 'v1', sistema: 'NOMINAS', versionActual: '19.2.1 Sp 1' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    // Lo registrado a mano como "19.2.1 Sp 1" se ve separado: versión 19.2.1 y un renglón SP 1.
    const vista = await agent.get('/app/versiones/mercado');
    expect(vista.text).toContain('value="19.2.1"');
    expect(vista.text).toContain('name="spNumero" type="number" min="1" value="1"');

    const res = await agent.post('/app/versiones/mercado').type('form').send({
      _csrf: csrf,
      conSp: '1',
      sistema: ['COMERCIAL PREMIUM', 'NOMINAS'],
      versionActual: ['12.1.0', '19.2.1'],
      fechaLiberacion: ['2026-04-20', ''],
      linkDescarga: ['https://d/1210.zip', ''],
      linkCartaTecnica: ['', ''],
      spSistema: ['COMERCIAL PREMIUM', 'COMERCIAL PREMIUM', 'NOMINAS'],
      spNumero: ['1', '2', ''],
      spFecha: ['2026-06-22', '2026-08-11', ''],
      spDescarga: ['https://d/sp1.zip', 'https://d/sp2.zip', ''],
      spNota: ['', '', ''],
    });
    expect(res.status).toBe(302);
    const [premium, nominas] = await t.versionRepo.list();
    expect(premium!.versionActual).toBe('12.1.0 Sp 2');
    expect(premium!.linkDescarga).toBe('https://d/1210.zip');
    expect(premium!.servicePacks.map((p) => [p.numero, p.linkDescarga])).toEqual([
      [1, 'https://d/sp1.zip'],
      [2, 'https://d/sp2.zip'],
    ]);
    // Borrarle el número al SP lo quita.
    expect(nominas!.versionActual).toBe('19.2.1');
    expect(nominas!.servicePacks).toEqual([]);

    const lista = await agent.get('/app/versiones');
    expect(lista.text).toContain('https://d/sp2.zip');
  });

  it('«Traer de CONTPAQi» llena la tabla sin guardar; el menú y la lista avisan de la versión nueva', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.configuracionRepo.config.sistemas = ['NOMINAS', 'BANCOS', 'Varios'];
    const { VersionSistema } = await import('../../src/core/entities/VersionSistema.js');
    await t.versionRepo.save(new VersionSistema({ id: 'v1', sistema: 'NOMINAS', versionActual: '19.2.1 Sp 1' }));
    await t.versionRepo.save(new VersionSistema({ id: 'v2', sistema: 'BANCOS', versionActual: '19.3.1' }));
    t.descargasContpaqi.html = `
      <h2><span>Solución Fuera de Versión CONTPAQi Nóminas® 19.4.3</span></h2>
      <p>Versión: 19.4.3</p><p>Publicado: 2026-10-21</p><a href="https://descargas.contpaqi.com/SFV_Nominas_v1943.zip">Descargar</a>
      <h2><span>CONTPAQi Nóminas® 19.4.2</span></h2>
      <a href="https://conocimiento.blob.core.windows.net/CartasTecnicas/CT_Nominas_1942/portada.html">Carta</a>
      <p>Versión: 19.4.2</p><p>Publicado: 2026-10-19</p><a href="https://descargas.contpaqi.com/CTi_NOMINAS_1942.zip">Descargar</a>
      <h2><span>CONTPAQi® Contabilidad-Bancos 19.3.1</span></h2><p>Versión: 19.3.1</p><p>Publicado: 2026-08</p>`;
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const traida = await agent.get('/app/versiones/mercado?traer=1');
    expect(traida.status).toBe(200);
    // La versión en su cuadro y la SFV como SP 1 en su propio renglón, con su descarga.
    expect(traida.text).toContain('value="19.4.2"');
    expect(traida.text).toContain('name="spNumero" type="number" min="1" value="1"');
    expect(traida.text).toContain('CTi_NOMINAS_1942.zip');
    expect(traida.text).toContain('SFV_Nominas_v1943.zip');
    expect(traida.text).toContain('CT_Nominas_1942');
    expect(traida.text).toContain('Todavía no se guarda');
    expect(traida.text).toContain('fila--traida');
    // Lo que no es de CONTPAQi (y no tiene versión registrada) no sale en la tabla.
    expect(traida.text).not.toContain('value="Varios"');
    // BANCOS ya estaba en 19.3.1: solo se le completa la fecha que faltaba.
    expect(traida.text).toContain('value="2026-08-01"');
    expect(traida.text).toContain('se completó lo que faltaba');
    // Nada se guardó.
    expect((await t.versionRepo.findById('v1'))!.versionActual).toBe('19.2.1 Sp 1');

    const lista = await agent.get('/app/versiones');
    expect(lista.text).toContain('NOMINAS 19.2.1 Sp 1 → <strong>19.4.2 Sp 1</strong>');

    // El globo del menú (sus contadores se guardan 20 s, por eso en una app recién abierta).
    const t2 = makeTestApp({ usuarios: [ADMIN] });
    t2.configuracionRepo.versionesContpaqi = await t.configuracionRepo.obtenerVersionesContpaqi();
    await t2.versionRepo.save(new VersionSistema({ id: 'v1', sistema: 'NOMINAS', versionActual: '19.2.1 Sp 1' }));
    const { agent: agent2 } = await login(t2.app, ADMIN.email, ADMIN.password);
    expect((await agent2.get('/app/versiones')).text).toContain('title="Versión nueva publicada por CONTPAQi en 1 de tus sistemas"');

    // Si la página no se puede leer, la tabla queda como estaba y lo dice.
    t.descargasContpaqi.html = '<html>mantenimiento</html>';
    const falla = await agent.get('/app/versiones/mercado?traer=1');
    expect(falla.status).toBe(200);
    expect(falla.text).toContain('cambió de formato');
    expect(falla.text).toContain('value="19.2.1"');
  });

  it('reporte de desactualizadas: pantalla, Excel y filtro por empresa', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    await t.versionRepo.save(
      new (await import('../../src/core/entities/VersionSistema.js')).VersionSistema({
        id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0',
      }),
    );
    await t.empresaRepo.save(
      new (await import('../../src/core/entities/Empresa.js')).Empresa({
        id: 'e1', nombre: 'Rezagada SA', sistemasContratados: ['Contabilidad'],
        versionesInstaladas: { Contabilidad: '17.0.0' },
      }),
    );
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const rep = await agent.get('/app/versiones/reporte');
    expect(rep.status).toBe(200);
    expect(rep.text).toContain('Rezagada SA');
    expect(rep.text).toContain('17.0.0');

    const xlsx = await agent.get('/app/versiones/reporte.xlsx');
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers['content-disposition']).toContain('desactualizadas-');

    const imprimir = await agent.get('/app/versiones/reporte/imprimir');
    expect(imprimir.status).toBe(200);
    expect(imprimir.text).toContain('Rezagada SA');
    expect(imprimir.text).toContain('data-logo-img');

    // filtro a otra empresa → la fila de Rezagada (su versión 17.0.0) ya no sale
    // ("Rezagada SA" seguiría en el <select> de empresas, por eso comparamos la versión)
    const vacio = await agent.get('/app/versiones/reporte?empresa=otra');
    expect(vacio.text).not.toContain('17.0.0');
    expect(vacio.text).toContain('Ninguna empresa con sistemas o licencias desactualizadas');
  });
});

describe('base de conocimiento — pizarra personal', () => {
  it('el equipo tiene su pizarra con autoguardado; el portal ya no', async () => {
    const t = makeTestApp({ usuarios: [DUENO, CLI] });
    const admin = await login(t.app, DUENO.email, DUENO.password);

    const vacia = await admin.agent.get('/app/kb/pizarra');
    expect(vacia.status).toBe(200);

    const guardar = await admin.agent
      .post('/app/kb/pizarra')
      .set('x-csrf-token', admin.csrf)
      .send({ contenido: 'Nota del admin' });
    expect(guardar.body).toMatchObject({ ok: true });
    expect(guardar.body.actualizadoEn).toBeTruthy();

    const releida = await admin.agent.get('/app/kb/pizarra');
    expect(releida.text).toContain('Nota del admin');

    // El portal ya no tiene base de conocimiento (ni pizarra): regresa al inicio del portal.
    const cli = await login(t.app, CLI.email, CLI.password);
    const portal = await cli.agent.get('/portal/kb/pizarra');
    expect(portal.status).toBe(302);
    expect(portal.headers.location).toBe('/portal');
  });
});

describe('base de conocimiento — historial de búsquedas (equipo)', () => {
  it('registra las búsquedas, las muestra, y se pueden borrar', async () => {
    const t = makeTestApp({ usuarios: [DUENO] });
    const { agent, csrf } = await login(t.app, DUENO.email, DUENO.password);

    await agent.get('/app/kb?q=licencias');
    const conHistorial = await agent.get('/app/kb');
    expect(conHistorial.text).toContain('Búsquedas recientes');
    expect(conHistorial.text).toContain('licencias');
    expect(await t.busquedaKBRepo.listar(DUENO.uid)).toHaveLength(1);

    await agent.post('/app/kb/historial/limpiar').type('form').send({ _csrf: csrf });
    expect(await t.busquedaKBRepo.listar(DUENO.uid)).toHaveLength(0);
    expect((await agent.get('/app/kb')).text).not.toContain('Búsquedas recientes');
  });
});

describe('versiones — historial de avisos enviados', () => {
  const aviso = (over: Record<string, unknown> = {}) => ({
    id: 'a1',
    empresaId: 'e1',
    empresaNombre: 'Empresa Alfa',
    sistema: 'Contabilidad',
    tipo: 'sistema' as const,
    versionInstalada: '18.0.0',
    versionOficial: '19.1.0',
    fechaVencimiento: null,
    canal: 'correo' as const,
    destino: 'cliente@alfa.mx',
    enviadoPorUid: 'u-a',
    enviadoPorNombre: 'Admin',
    createdAt: new Date('2026-09-20T15:00:00Z'),
    ...over,
  });

  it('muestra el detalle por sistema, el canal y quién lo envió', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    await t.avisoRepo.registrar([aviso()]);
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.get('/app/versiones/historial');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Empresa Alfa');
    expect(res.text).toContain('Contabilidad');
    expect(res.text).toContain('18.0.0');
    expect(res.text).toContain('19.1.0');
    expect(res.text).toContain('Correo');
    expect(res.text).toContain('Admin');
  });

  it('filtra por empresa', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    await t.avisoRepo.registrar([aviso(), aviso({ id: 'a2', empresaNombre: 'Empresa Beta' })]);
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.get('/app/versiones/historial?empresa=beta');
    expect(res.text).toContain('Empresa Beta');
    expect(res.text).not.toContain('Empresa Alfa');
  });

  it('una licencia muestra su fecha de vencimiento en vez de versiones', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    await t.avisoRepo.registrar([
      aviso({ tipo: 'licencia', versionInstalada: null, versionOficial: null, fechaVencimiento: '2026-10-15' }),
    ]);
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.get('/app/versiones/historial');
    expect(res.text).toContain('Licencia');
    expect(res.text).toContain('Vence:');
  });

  it('exporta el historial a .xlsx', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    await t.avisoRepo.registrar([aviso()]);
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.get('/app/versiones/historial.xlsx').responseType('blob');
    expect(res.status).toBe(200);
    expect(res.body.subarray(0, 2).toString()).toBe('PK');
  });

  it('sin avisos, explica de dónde salen en vez de dejar la tabla muda', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.get('/app/versiones/historial');
    expect(res.text).toContain('Sin avisos registrados todavía');
  });
});

describe('base de conocimiento — acceso por persona, solo lectura e indexado', () => {
  const indexar = (agent: request.Agent, csrf: string, carpeta: string, archivos: { ruta: string; contenido: string }[]) =>
    agent.post('/app/kb/indexar').set('x-csrf-token', csrf).set('accept', 'application/json').send({ carpeta, archivos });

  it('solo ve la KB quien el propietario marca — aunque sea administrador', async () => {
    const t = makeTestApp({ usuarios: [DUENO, ADMIN, GABY] });
    const dueno = await login(t.app, DUENO.email, DUENO.password);
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    const gaby = await login(t.app, GABY.email, GABY.password);

    expect((await dueno.agent.get('/app/kb')).status).toBe(200);
    expect((await admin.agent.get('/app/kb')).status).toBe(403);
    expect((await gaby.agent.get('/app/kb')).status).toBe(403);
    expect((await admin.agent.get('/app/kb/acceso')).status).toBe(403);
    expect((await admin.agent.get('/app')).text).not.toContain('href="/app/kb"');

    const panel = await dueno.agent.get('/app/kb/acceso');
    expect(panel.text).toContain('Gaby');
    expect(panel.text).toContain('Admin');
    const res = await dueno.agent.post('/app/kb/acceso').type('form').send({
      _csrf: dueno.csrf, acceso: [GABY.uid], rutaEmpresas: 'D:\\KB\\EMPRESAS', rutaSoporte: '',
    });
    expect(res.status).toBe(302);
    expect(t.configuracionRepo.kb.acceso).toEqual([GABY.uid]);

    expect((await gaby.agent.get('/app/kb')).status).toBe(200);
    expect((await admin.agent.get('/app/kb')).status).toBe(403);
    // Gaby solo lee: no indexa, no da acceso, no exporta, no borra.
    expect((await indexar(gaby.agent, gaby.csrf, 'soporte', [{ ruta: 'S/a.md', contenido: 'x' }])).status).toBe(403);
    expect((await gaby.agent.get('/app/kb/acceso')).status).toBe(403);
    expect((await gaby.agent.get('/app/kb/export.zip')).status).toBe(403);
    expect((await gaby.agent.get('/app/kb')).text).not.toContain('Indexar');
  });

  it('indexar: sube, reindexa sin duplicar y el índice dice qué ya está', async () => {
    const t = makeTestApp({ usuarios: [DUENO] });
    const { agent, csrf } = await login(t.app, DUENO.email, DUENO.password);

    const r1 = await indexar(agent, csrf, 'empresas', [
      { ruta: 'EMPRESAS/ACME/accesos.md', contenido: '# ACME\nServidor 10.0.0.5, CONTPAQi 14.2.1' },
      { ruta: 'EMPRESAS/BETA/notas.txt', contenido: 'Nada especial' },
    ]);
    expect(r1.body).toMatchObject({ ok: true, creados: 2, actualizados: 0 });
    const r2 = await indexar(agent, csrf, 'empresas', [{ ruta: 'EMPRESAS/ACME/accesos.md', contenido: '# ACME\nServidor 10.0.0.9' }]);
    expect(r2.body).toMatchObject({ ok: true, creados: 0, actualizados: 1 });
    expect(await t.knowledgeRepo.list()).toHaveLength(2);

    const idx = await agent.get('/app/kb/indice.json?carpeta=empresas').set('accept', 'application/json');
    expect(idx.body.indice.map((e: { clave: string }) => e.clave).sort()).toEqual(['acme/accesos.md', 'beta/notas.txt']);

    const mala = await indexar(agent, csrf, 'otra', []);
    expect(mala.status).toBe(422);

    // Quitar los que ya no están en la carpeta.
    const beta = idx.body.indice.find((e: { clave: string }) => e.clave === 'beta/notas.txt');
    const q = await agent.post('/app/kb/quitar').set('x-csrf-token', csrf).send({ carpeta: 'empresas', ids: [beta.id] });
    expect(q.body).toMatchObject({ ok: true, quitados: 1 });
  });

  it('busca por nombre, empresa y contenido (sin acentos), separa carpetas y muestra el fragmento', async () => {
    const t = makeTestApp({ usuarios: [DUENO] });
    const { agent, csrf } = await login(t.app, DUENO.email, DUENO.password);
    await indexar(agent, csrf, 'empresas', [{ ruta: 'EMPRESAS/Grupo ACME/Nóminas.md', contenido: 'Usan la versión 14.2.1 en el servidor.' }]);
    await indexar(agent, csrf, 'soporte', [{ ruta: 'SOPORTE/Licencias/renovar.md', contenido: 'Renovar la licencia anual.' }]);

    const porVersion = await agent.get('/app/kb?q=14.2.1');
    expect(porVersion.text).toContain('Nóminas');
    expect(porVersion.text).toContain('<mark>14.2.1</mark>');
    expect(porVersion.text).not.toContain('renovar');

    expect((await agent.get('/app/kb?q=nominas')).text).toContain('Nóminas');
    expect((await agent.get('/app/kb?q=acme')).text).toContain('Nóminas');

    const soloSoporte = await agent.get('/app/kb?carpeta=soporte');
    expect(soloSoporte.text).toContain('renovar');
    expect(soloSoporte.text).not.toContain('Nóminas');
  });

  it('el documento es de solo lectura: se copia, sin editar ni descargar', async () => {
    const t = makeTestApp({ usuarios: [DUENO] });
    const { agent, csrf } = await login(t.app, DUENO.email, DUENO.password);
    await indexar(agent, csrf, 'soporte', [{ ruta: 'SOPORTE/script.ps1', contenido: 'Write-Host "<hola>"' }]);
    const [a] = await t.knowledgeRepo.list();
    const doc = await agent.get(`/app/kb/${a!.id}`);
    expect(doc.text).toContain('data-kb-copiar');
    expect(doc.text).not.toContain('data-kb-descargar');
    expect(doc.text).not.toContain('/editar');
    // Los scripts se muestran tal cual (escapados), no como Markdown.
    expect(doc.text).toContain('Write-Host &quot;&lt;hola&gt;&quot;');
    // Ya no existen alta ni edición a mano.
    expect((await agent.get('/app/kb/nuevo')).status).toBe(404);
    expect((await agent.post(`/app/kb/${a!.id}`).type('form').send({ _csrf: csrf, titulo: 'x' })).status).toBe(404);
  });

  it('A→Z por defecto con orden natural; Z→A disponible', async () => {
    const t = makeTestApp({ usuarios: [DUENO] });
    const { agent, csrf } = await login(t.app, DUENO.email, DUENO.password);
    await indexar(agent, csrf, 'soporte', ['Error 10 al timbrar', 'banco no concilia', 'Error 2 al abrir', 'Álbum de scripts'].map((n) => ({
      ruta: `SOPORTE/${n}.md`, contenido: 'contenido',
    })));
    const pos = (html: string, x: string) => html.indexOf(x);
    const az = (await agent.get('/app/kb')).text;
    const orden = ['Álbum de scripts', 'banco no concilia', 'Error 2 al abrir', 'Error 10 al timbrar'].map((x) => pos(az, x));
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
    const za = (await agent.get('/app/kb?orden=za')).text;
    expect(pos(za, 'Error 10 al timbrar')).toBeLessThan(pos(za, 'Álbum de scripts'));
  });
});
