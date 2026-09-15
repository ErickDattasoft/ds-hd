import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';

const ADMIN = { uid: 'u-a', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };
const LECTURA = { uid: 'u-l', email: 'l@d.com', password: 'lectura1234', nombre: 'Lec', rol: 'lectura' as const };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

async function solicitarAcceso(app: ReturnType<typeof makeTestApp>['app'], datos: { email: string; nombre: string }) {
  const anon = request.agent(app);
  const page = await anon.get('/solicitar-acceso');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  return anon.post('/solicitar-acceso').type('form').send({ _csrf: csrf, ...datos });
}

describe('solicitudes de acceso — revisión de staff', () => {
  it('una solicitud pública queda pendiente y un admin la puede aprobar (abre el alta de usuario precargada)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const envio = await solicitarAcceso(t.app, { email: 'nueva@empresa.com', nombre: 'Persona Nueva' });
    expect(envio.status).toBe(200);
    expect((await t.solicitudAccesoRepo.listPendientes()).map((s) => s.email)).toEqual(['nueva@empresa.com']);

    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const lista = await agent.get('/app/solicitudes-acceso');
    expect(lista.status).toBe(200);
    expect(lista.text).toContain('Persona Nueva');
    expect(lista.text).toContain('nueva@empresa.com');

    const id = (await t.solicitudAccesoRepo.listPendientes())[0]!.id;
    const aprobar = await agent.post(`/app/solicitudes-acceso/${id}/aprobar`).type('form').send({ _csrf: csrf });
    expect(aprobar.status).toBe(302);
    const location = String(aprobar.headers.location);
    expect(location).toBe('/app/usuarios/nuevo?email=nueva%40empresa.com&nombre=Persona%20Nueva');
    expect(await t.solicitudAccesoRepo.listPendientes()).toHaveLength(0);

    const formUsuario = await agent.get(location);
    expect(formUsuario.text).toContain('value="nueva@empresa.com"');
    expect(formUsuario.text).toContain('value="Persona Nueva"');
  });

  it('rechazar quita la solicitud de pendientes', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    await solicitarAcceso(t.app, { email: 'spam@x.com', nombre: 'Spam' });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const id = (await t.solicitudAccesoRepo.listPendientes())[0]!.id;

    const rechazar = await agent.post(`/app/solicitudes-acceso/${id}/rechazar`).type('form').send({ _csrf: csrf });
    expect(rechazar.status).toBe(302);
    expect(await t.solicitudAccesoRepo.listPendientes()).toHaveLength(0);
  });

  it('un rol sin usuarios:gestionar no puede ver ni aprobar solicitudes', async () => {
    const t = makeTestApp({ usuarios: [LECTURA] });
    await solicitarAcceso(t.app, { email: 'x@x.com', nombre: 'Equis' });
    const { agent, csrf } = await login(t.app, LECTURA.email, LECTURA.password);

    const lista = await agent.get('/app/solicitudes-acceso');
    expect(lista.status).toBe(403);

    const id = (await t.solicitudAccesoRepo.listPendientes())[0]!.id;
    const aprobar = await agent.post(`/app/solicitudes-acceso/${id}/aprobar`).type('form').send({ _csrf: csrf });
    expect(aprobar.status).toBe(403);
  });

  it('el sidebar del admin muestra el badge de solicitudes pendientes', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    await solicitarAcceso(t.app, { email: 'a@a.com', nombre: 'Ana' });
    await solicitarAcceso(t.app, { email: 'b@b.com', nombre: 'Beto' });
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const dash = await agent.get('/app');
    expect(dash.text).toContain('Solicitudes de acceso');
    expect(dash.text).toMatch(/Solicitudes de acceso[\s\S]{0,80}2/);
  });
});
