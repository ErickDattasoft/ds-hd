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
  it('un borrador solo lo ve el staff; publicado "portal" lo ve el cliente; "publico" lo ve cualquiera', async () => {
    const t = makeTestApp({ usuarios: [ADMIN, CLI] });
    const admin = await login(t.app, ADMIN.email, ADMIN.password);

    // borrador (staff)
    await admin.agent.post('/app/kb').type('form').send({
      _csrf: admin.csrf, titulo: 'Guía interna', cuerpoMarkdown: '# Interno\nSolo para el equipo.', visibilidad: 'staff',
    });
    // publicado para portal
    await admin.agent.post('/app/kb').type('form').send({
      _csrf: admin.csrf, titulo: 'Como resetear tu contraseña', cuerpoMarkdown: 'Ve a **Ajustes** y da clic en *Resetear*.', visibilidad: 'portal', publicado: 'on',
    });
    // publicado público
    await admin.agent.post('/app/kb').type('form').send({
      _csrf: admin.csrf, titulo: 'Horario de soporte', cuerpoMarkdown: 'Atendemos de 9 a 18h.', visibilidad: 'publico', publicado: 'on',
    });

    // Público anónimo: solo el artículo público
    const pub = await request(t.app).get('/kb');
    expect(pub.text).toContain('Horario de soporte');
    expect(pub.text).not.toContain('Como resetear tu contraseña');
    expect(pub.text).not.toContain('Guía interna');

    // Cliente en el portal: público + portal, no el borrador
    const cli = await login(t.app, CLI.email, CLI.password);
    const portalKb = await cli.agent.get('/portal/kb');
    expect(portalKb.text).toContain('Como resetear tu contraseña');
    expect(portalKb.text).toContain('Horario de soporte');
    expect(portalKb.text).not.toContain('Guía interna');

    // Staff ve todo
    const staffKb = await admin.agent.get('/app/kb');
    expect(staffKb.text).toContain('Guía interna');

    // El markdown se renderiza a HTML
    const [publicoArt] = [...t.knowledgeRepo.items.values()].filter((a) => a.visibilidad === 'portal');
    const art = await cli.agent.get(`/portal/kb/${publicoArt!.slug}`);
    expect(art.text).toContain('<strong>Ajustes</strong>');
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
