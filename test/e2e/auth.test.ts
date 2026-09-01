import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';

const ADMIN = { uid: 'u-admin', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };
const CLIENTE = { uid: 'u-cli', email: 'cli@empresa.com', password: 'cliente123', nombre: 'Cli', rol: 'cliente' as const, empresaId: 'e1' };

/**
 * Hace login y devuelve el agente de supertest con la cookie de sesión puesta y el token
 * CSRF vigente (la cookie `x-csrf-token` persiste en el agente para toda la sesión).
 */
async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  const res = await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, res, csrf };
}

describe('autenticación y áreas', () => {
  it('muestra el login', async () => {
    const { app } = makeTestApp();
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Iniciar sesión');
  });

  it('rechaza el POST de login sin token CSRF', async () => {
    const { app } = makeTestApp({ usuarios: [ADMIN] });
    const res = await request(app).post('/login').type('form').send({ email: ADMIN.email, password: ADMIN.password });
    expect(res.status).toBe(403);
  });

  it('login incorrecto devuelve 401', async () => {
    const { app } = makeTestApp({ usuarios: [ADMIN] });
    const { res } = await login(app, ADMIN.email, 'malísima');
    expect(res.status).toBe(401);
    expect(res.text).toContain('incorrect');
  });

  it('login correcto pone cookie de sesión y redirige a /app', async () => {
    const { app } = makeTestApp({ usuarios: [ADMIN] });
    const { res } = await login(app, ADMIN.email, ADMIN.password);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/app');
    expect(cookieValor(res.headers['set-cookie'] as unknown as string[], '__session')).toBeTruthy();
  });

  it('admin entra al back-office y ve la sección Usuarios', async () => {
    const { app } = makeTestApp({ usuarios: [ADMIN] });
    const { agent } = await login(app, ADMIN.email, ADMIN.password);
    const dash = await agent.get('/app');
    expect(dash.status).toBe(200);
    const usuarios = await agent.get('/app/usuarios');
    expect(usuarios.status).toBe(200);
    expect(usuarios.text).toContain('Usuarios');
  });

  it('sin sesión, /app redirige al login', async () => {
    const { app } = makeTestApp();
    const res = await request(app).get('/app');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login');
  });

  it('un cliente va a /portal y tiene prohibido /app', async () => {
    const { app } = makeTestApp({ usuarios: [CLIENTE] });
    const { agent, res } = await login(app, CLIENTE.email, CLIENTE.password);
    expect(res.headers.location).toBe('/portal');

    const portal = await agent.get('/portal');
    expect(portal.status).toBe(200);

    const backoffice = await agent.get('/app');
    expect(backoffice.status).toBe(403);
  });

  it('logout borra la sesión', async () => {
    const { app } = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(app, ADMIN.email, ADMIN.password);
    await agent.post('/logout').type('form').send({ _csrf: csrf });
    const after = await agent.get('/app');
    expect(after.status).toBe(302);
  });
});

describe('gestión de usuarios (admin)', () => {
  it('crea un agente y genera invitación por correo', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent
      .post('/app/usuarios')
      .type('form')
      .send({ _csrf: csrf, nombre: 'Nuevo Agente', email: 'agente@dattasoft.mx', rol: 'agente' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('invitación');
    expect(t.emailSender.enviados).toHaveLength(1);
    const creado = await t.usuarioRepo.findByEmail('agente@dattasoft.mx');
    expect(creado?.rol).toBe('agente');
    expect(creado?.activo).toBe(true);
  });

  it('acepta la invitación y permite iniciar sesión', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent
      .post('/app/usuarios')
      .type('form')
      .send({ _csrf: csrf, nombre: 'Beto', email: 'beto@dattasoft.mx', rol: 'agente' });

    const [token] = [...t.invitacionRepo.porToken.keys()];
    const anon = request.agent(t.app);
    const invPage = await anon.get(`/invitacion/${token}`);
    const invCsrf = cookieValor(invPage.headers['set-cookie'] as unknown as string[], 'x-csrf-token');
    const setPass = await anon
      .post(`/invitacion/${token}`)
      .type('form')
      .send({ _csrf: invCsrf, password: 'nueva-clave-1', passwordConfirmacion: 'nueva-clave-1' });
    expect(setPass.status).toBe(200);

    const { res } = await login(t.app, 'beto@dattasoft.mx', 'nueva-clave-1');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/app');
  });
});
