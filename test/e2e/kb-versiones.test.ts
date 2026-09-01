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
