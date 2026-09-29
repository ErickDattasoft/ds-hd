import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';

const ADMIN = { uid: 'u-a', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };
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
    expect(res.status).toBe(200);
    const registradas = await t.versionRepo.list();
    expect(registradas.map((v) => v.sistema).sort()).toEqual(['Bancos', 'Contabilidad']); // Nóminas vacío → no se crea
    expect(registradas.find((v) => v.sistema === 'Contabilidad')?.linkCartaTecnica).toBe('https://ct/cont');
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

describe('base de conocimiento — visibilidad', () => {
  it('Soporte lo ven admin y soporte; Administrador solo admin; clientes y público ya no tienen KB', async () => {
    const SOP = { uid: 'u-sop', email: 'sop@dattasoft.mx', password: 'soporte1234', nombre: 'Sofi', rol: 'soporte' as const };
    const AGT = { uid: 'u-agt', email: 'agt@dattasoft.mx', password: 'agente1234', nombre: 'Agus', rol: 'agente' as const };
    const t = makeTestApp({ usuarios: [ADMIN, CLI, SOP, AGT] });
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    await admin.agent.post('/app/kb').type('form').send({
      _csrf: admin.csrf, titulo: 'Como resetear el servicio', cuerpoMarkdown: 'Ve a **Servicios** y reinicia *CONTPAQi*.', visibilidad: 'soporte',
    });
    await admin.agent.post('/app/kb').type('form').send({
      _csrf: admin.csrf, titulo: 'Claves del servidor', cuerpoMarkdown: 'Solo para administradores del equipo.', visibilidad: 'admin',
    });

    const adminKb = await admin.agent.get('/app/kb');
    expect(adminKb.text).toContain('Como resetear el servicio');
    expect(adminKb.text).toContain('Claves del servidor');

    const sop = await login(t.app, SOP.email, SOP.password);
    const sopKb = await sop.agent.get('/app/kb');
    expect(sopKb.text).toContain('Como resetear el servicio');
    expect(sopKb.text).not.toContain('Claves del servidor');
    const soporteArt = [...t.knowledgeRepo.items.values()].find((a) => a.visibilidad === 'soporte')!;
    const art = await sop.agent.get(`/app/kb/${soporteArt.slug}`);
    expect(art.text).toContain('<strong>Servicios</strong>'); // el markdown se renderiza

    const agt = await login(t.app, AGT.email, AGT.password);
    const agtKb = await agt.agent.get('/app/kb');
    expect(agtKb.text).not.toContain('Como resetear el servicio');

    // Clientes y público: sin base de conocimiento.
    const pub = await request(t.app).get('/kb');
    expect(pub.status).toBe(302);
    const cli = await login(t.app, CLI.email, CLI.password);
    const portalKb = await cli.agent.get('/portal/kb');
    expect(portalKb.status).toBe(302);
    expect(portalKb.headers.location).toBe('/portal');
  });

  it('subida en lote + export JSON/ZIP + filtro por categoría script', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const sub = await agent.post('/app/kb/subir').set('x-csrf-token', csrf).send({
      archivos: [
        { nombre: 'limpieza.ps1', contenido: 'Remove-Item C:\\temp\\* -Recurse -Force', rutaRelativa: 'ps/limpieza.ps1' },
        { nombre: 'manual.md', contenido: '# Manual\nTexto de ayuda suficientemente largo.' },
      ],
      visibilidad: 'staff',
    });
    expect(sub.status).toBe(200);
    expect(sub.body).toMatchObject({ ok: true, creados: 2 });

    const gestion = await agent.get('/app/kb?categoria=script');
    expect(gestion.text).toContain('limpieza');
    expect(gestion.text).not.toContain('>manual<');

    const json = await agent.get('/app/kb/export.json?categoria=script');
    expect(json.status).toBe(200);
    const arr = JSON.parse(json.text);
    expect(arr).toHaveLength(1);
    expect(arr[0].rutaDestino).toBe('ps/limpieza.ps1');

    const zip = await agent.get('/app/kb/export.zip');
    expect(zip.status).toBe(200);
    expect(zip.headers['content-type']).toContain('zip');
  });

  it('un agente sin permiso de publicar no puede publicar', async () => {
    const AG = { uid: 'u-g', email: 'g@d.com', password: 'agente12345', nombre: 'Ag', rol: 'agente' as const };
    const t = makeTestApp({ usuarios: [AG] });
    const { agent, csrf } = await login(t.app, AG.email, AG.password);
    const res = await agent.post('/app/kb').type('form').send({
      _csrf: csrf, titulo: 'Intento de publicar', cuerpoMarkdown: 'contenido suficiente para pasar', publicado: 'on',
    });
    expect(res.status).toBe(422);
    expect(res.text).toContain('permiso');
  });
});

describe('base de conocimiento — descubrimiento (tags, ver también, comparar)', () => {
  it('nube de tags filtra la lista, y el detalle muestra "Ver también" por tags compartidos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/kb').type('form').send({
      _csrf: csrf, titulo: 'Reinicio de licencias', cuerpoMarkdown: 'Pasos para reiniciar el servicio de licencias.',
      tags: 'contpaqi, licencias', visibilidad: 'soporte',
    });
    await agent.post('/app/kb').type('form').send({
      _csrf: csrf, titulo: 'Backup de licencias', cuerpoMarkdown: 'Cómo respaldar el archivo de licencias.',
      tags: 'contpaqi', visibilidad: 'soporte',
    });
    await agent.post('/app/kb').type('form').send({
      _csrf: csrf, titulo: 'Nómina quincenal', cuerpoMarkdown: 'Proceso de nómina quincenal.',
      tags: 'nomina', visibilidad: 'soporte',
    });

    const lista = await agent.get('/app/kb');
    expect(lista.text).toContain('contpaqi (2)');

    const filtrada = await agent.get('/app/kb?tag=nomina');
    expect(filtrada.text).toContain('Nómina quincenal');
    expect(filtrada.text).not.toContain('Reinicio de licencias');

    const [reinicio] = [...t.knowledgeRepo.items.values()].filter((a) => a.titulo === 'Reinicio de licencias');
    const detalle = await agent.get(`/app/kb/${reinicio!.slug}`);
    expect(detalle.text).toContain('Ver también');
    expect(detalle.text).toContain('Backup de licencias');
    expect(detalle.text).not.toContain('Nómina quincenal');
  });

  it('vista dividida: sin "b" pide elegir; con "a" y "b" muestra ambos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/kb').type('form').send({
      _csrf: csrf, titulo: 'Documento Uno', cuerpoMarkdown: 'Contenido del documento uno.', visibilidad: 'soporte',
    });
    await agent.post('/app/kb').type('form').send({
      _csrf: csrf, titulo: 'Documento Dos', cuerpoMarkdown: 'Contenido del documento dos.', visibilidad: 'soporte',
    });
    const [uno, dos] = [...t.knowledgeRepo.items.values()].sort((a, b) => a.titulo.localeCompare(b.titulo));

    const soloA = await agent.get(`/app/kb/comparar?a=${uno!.slug}`);
    expect(soloA.text).toContain('Elige el segundo artículo');
    expect(soloA.text).toContain('Documento Dos');

    const ambos = await agent.get(`/app/kb/comparar?a=${uno!.slug}&b=${dos!.slug}`);
    expect(ambos.text).toContain('Contenido del documento uno.');
    expect(ambos.text).toContain('Contenido del documento dos.');
  });
});

describe('base de conocimiento — pizarra personal', () => {
  it('el equipo tiene su pizarra con autoguardado; el portal ya no', async () => {
    const t = makeTestApp({ usuarios: [ADMIN, CLI] });
    const admin = await login(t.app, ADMIN.email, ADMIN.password);

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
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    await agent.get('/app/kb?q=licencias');
    const conHistorial = await agent.get('/app/kb');
    expect(conHistorial.text).toContain('Búsquedas recientes');
    expect(conHistorial.text).toContain('licencias');
    expect(await t.busquedaKBRepo.listar(ADMIN.uid)).toHaveLength(1);

    await agent.post('/app/kb/historial/limpiar').type('form').send({ _csrf: csrf });
    expect(await t.busquedaKBRepo.listar(ADMIN.uid)).toHaveLength(0);
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

  it('el equipo busca en /app/kb (título o contenido), guarda historial y puede eliminar', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    await admin.agent.post('/app/kb').type('form').send({
      _csrf: admin.csrf, titulo: 'Error 254 al ejecutar póliza', cuerpoMarkdown: 'Reindexar la base de datos de contabilidad.', visibilidad: 'staff',
    });
    await admin.agent.post('/app/kb').type('form').send({
      _csrf: admin.csrf, titulo: 'Horario de soporte', cuerpoMarkdown: 'Atendemos de 9 a 18h.', visibilidad: 'staff',
    });
    const res = await admin.agent.get('/app/kb?q=reindexar');
    expect(res.text).toContain('Error 254 al ejecutar póliza');
    expect(res.text).not.toContain('Horario de soporte');
    expect(res.text).toContain('1 resultado');
    const otra = await admin.agent.get('/app/kb');
    expect(otra.text).toContain('Búsquedas recientes');
    expect(otra.text).toMatch(/\/app\/kb\/[^"]+\/eliminar/);
  });
});
