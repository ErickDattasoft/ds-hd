import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';

const ADMIN = { uid: 'u-a', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };
const AGENTE = { uid: 'u-g', email: 'ag@dattasoft.mx', password: 'agente12345', nombre: 'Agente', rol: 'agente' as const };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

describe('empresas y contactos', () => {
  it('admin crea empresa + contacto y quedan registrados en bitácora', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const crearEmp = await agent
      .post('/app/empresas')
      .type('form')
      .send({ _csrf: csrf, nombre: 'ACME SA de CV', rfc: 'acm010101abc', sistemasContratados: 'Contabilidad\nNóminas' });
    expect(crearEmp.status).toBe(302);
    const empId = String(crearEmp.headers.location).split('/').pop()!;
    const empresa = t.empresaRepo.items.get(empId)!;
    expect(empresa.rfc).toBe('ACM010101ABC');
    expect(empresa.sistemasContratados).toEqual(['Contabilidad', 'Nóminas']);

    const crearCon = await agent
      .post('/app/contactos')
      .type('form')
      .send({ _csrf: csrf, nombre: 'Juan Pérez', empresaId: empId, email: 'juan@acme.com', puesto: 'Contador' });
    expect(crearCon.status).toBe(302);
    expect(crearCon.headers.location).toBe(`/app/empresas/${empId}`);
    expect([...t.contactoRepo.items.values()][0]?.email).toBe('juan@acme.com');

    const bita = t.bitacoraRepo.entradas.map((e) => `${e.modulo}:${e.accion}`);
    expect(bita).toEqual(expect.arrayContaining(['empresas:crear', 'contactos:crear']));

    const verBitacora = await agent.get('/app/bitacora');
    expect(verBitacora.text).toContain('ACME SA de CV');
  });

  it('captura y muestra la vigencia de licencia por sistema', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const crear = await agent
      .post('/app/empresas')
      .type('form')
      .send({ _csrf: csrf, nombre: 'Vigencias SA', sistemasContratados: 'Contabilidad\nNóminas' });
    const empId = String(crear.headers.location).split('/').pop()!;

    // en el alta aún no hay vigencias; se cargan al editar
    const editar = await agent
      .post(`/app/empresas/${empId}`)
      .type('form')
      .send({
        _csrf: csrf,
        nombre: 'Vigencias SA',
        sistemasContratados: 'Contabilidad\nNóminas',
        'vigencia:Contabilidad': '2000-01-01',
        'vigencia:Nóminas': '',
      });
    expect(editar.status).toBe(302);
    expect(t.empresaRepo.items.get(empId)!.vigencias).toEqual({ Contabilidad: '2000-01-01' });

    const formEditar = await agent.get(`/app/empresas/${empId}/editar`);
    expect(formEditar.status).toBe(200);
    expect(formEditar.text).toContain('Vigencia de licencias');
    expect(formEditar.text).toContain('name="vigencia:Contabilidad"');
    expect(formEditar.text).toContain('value="2000-01-01"');

    const detalle = await agent.get(`/app/empresas/${empId}`);
    expect(detalle.text).toContain('Vencida'); // 2000-01-01 ya pasó

    const lista = await agent.get('/app/empresas');
    expect(lista.text).toContain('1 vencida');
  });

  it('rechaza contacto con empresa inexistente', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent
      .post('/app/contactos')
      .type('form')
      .send({ _csrf: csrf, nombre: 'Fantasma', empresaId: 'no-existe', email: 'x@y.com' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('No válida');
    expect(t.contactoRepo.items.size).toBe(0);
  });

  it('un agente puede ver empresas pero no crearlas', async () => {
    const t = makeTestApp({ usuarios: [AGENTE] });
    const { agent } = await login(t.app, AGENTE.email, AGENTE.password);
    expect((await agent.get('/app/empresas')).status).toBe(200);
    expect((await agent.get('/app/empresas/nueva')).status).toBe(403);
  });

  it('un agente no ve la Bitácora', async () => {
    const t = makeTestApp({ usuarios: [AGENTE] });
    const { agent } = await login(t.app, AGENTE.email, AGENTE.password);
    expect((await agent.get('/app/bitacora')).status).toBe(403);
  });
});
