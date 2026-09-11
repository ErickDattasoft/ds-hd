import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';
import { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import { Empresa } from '../../src/core/entities/Empresa.js';

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

  it('captura vigencia y versión instalada por sistema, y las compara con la oficial', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.versionRepo.items.set('v1', new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '16.3.1' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const crear = await agent
      .post('/app/empresas')
      .type('form')
      .send({ _csrf: csrf, nombre: 'Vigencias SA', sistemasContratados: 'Contabilidad\nNóminas' });
    const empId = String(crear.headers.location).split('/').pop()!;

    // en el alta aún no hay vigencias/versiones; se cargan al editar
    const editar = await agent
      .post(`/app/empresas/${empId}`)
      .type('form')
      .send({
        _csrf: csrf,
        nombre: 'Vigencias SA',
        sistemasContratados: 'Contabilidad\nNóminas',
        'vigencia:Contabilidad': '2000-01-01',
        'vigencia:Nóminas': '',
        'version:Contabilidad': '16.2.0',
      });
    expect(editar.status).toBe(302);
    const empresa = t.empresaRepo.items.get(empId)!;
    expect(empresa.vigencias).toEqual({ Contabilidad: '2000-01-01' });
    expect(empresa.versionesInstaladas).toEqual({ Contabilidad: '16.2.0' });

    const formEditar = await agent.get(`/app/empresas/${empId}/editar`);
    expect(formEditar.status).toBe(200);
    expect(formEditar.text).toContain('name="vigencia:Contabilidad"');
    expect(formEditar.text).toContain('name="version:Contabilidad"');
    expect(formEditar.text).toContain('value="16.2.0"');

    const detalle = await agent.get(`/app/empresas/${empId}`);
    expect(detalle.text).toContain('Vencida'); // 2000-01-01 ya pasó
    expect(detalle.text).toContain('Desactualizada'); // 16.2.0 < 16.3.1

    const lista = await agent.get('/app/empresas');
    expect(lista.text).toContain('1 vencida');
    expect(lista.text).toContain('1 desactualizada');
  });

  it('contacto con RFC y creando la empresa inline; campos extra en la empresa', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const crear = await agent
      .post('/app/contactos')
      .type('form')
      .send({ _csrf: csrf, nombre: 'Ana G', empresaNueva: 'Nueva Inline SA', rfc: 'aaa010101aaa', celular: '9998887766' });
    expect(crear.status).toBe(302);
    const empId = String(crear.headers.location).split('/').pop()!;
    const emp = t.empresaRepo.items.get(empId)!;
    expect(emp.nombre).toBe('Nueva Inline SA');
    const contacto = (await t.contactoRepo.list({ empresaId: empId }))[0]!;
    expect(contacto.rfc).toBe('AAA010101AAA');

    // campos extra al editar la empresa
    const edit = await agent
      .post(`/app/empresas/${empId}`)
      .type('form')
      .send({
        _csrf: csrf,
        nombre: 'Nueva Inline SA',
        campoExtraEtiqueta: ['Contrato', 'Vendedor'],
        campoExtraValor: ['C-2026-01', 'Beto'],
      });
    expect(edit.status).toBe(302);
    const upd = t.empresaRepo.items.get(empId)!;
    expect(upd.camposExtra).toEqual([
      { etiqueta: 'Contrato', valor: 'C-2026-01' },
      { etiqueta: 'Vendedor', valor: 'Beto' },
    ]);
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

  it('marca una empresa como favorita y la filtra', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Favorita SA' }));
    t.empresaRepo.items.set('e2', new Empresa({ id: 'e2', nombre: 'Normal SA' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const r = await agent
      .post('/app/empresas/e1/favorita')
      .type('form')
      .send({ _csrf: csrf, favorita: 'true', volver: '/app/empresas?favoritas=1' });
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe('/app/empresas?favoritas=1');
    expect(t.empresaRepo.items.get('e1')?.favorita).toBe(true);

    const lista = await agent.get('/app/empresas?favoritas=1');
    expect(lista.text).toContain('Favorita SA');
    expect(lista.text).not.toContain('Normal SA');
  });

  it('filtra empresas por sistema contratado', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Con Contpaqi', sistemasContratados: ['Contpaqi'] }));
    t.empresaRepo.items.set('e2', new Empresa({ id: 'e2', nombre: 'Con Compac', sistemasContratados: ['Compac'] }));
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const lista = await agent.get('/app/empresas?sistema=Contpaqi');
    expect(lista.text).toContain('Con Contpaqi');
    expect(lista.text).not.toContain('Con Compac');
  });

  it('guarda una búsqueda, la vuelve a aplicar y la borra', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Con Contpaqi', sistemasContratados: ['Contpaqi'] }));
    t.empresaRepo.items.set('e2', new Empresa({ id: 'e2', nombre: 'Con Compac', sistemasContratados: ['Compac'] }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const guardar = await agent.post('/app/filtros').type('form').send({
      _csrf: csrf,
      modulo: 'empresas',
      nombre: 'Solo Contpaqi',
      query: '?sistema=Contpaqi',
      volver: '/app/empresas',
    });
    expect(guardar.status).toBe(302);
    const [f] = [...t.filtroGuardadoRepo.items.values()];
    expect(f?.query).toBe('sistema=Contpaqi');

    const lista = await agent.get('/app/empresas');
    expect(lista.text).toContain('Solo Contpaqi');
    expect(lista.text).toContain('/app/empresas?sistema=Contpaqi');

    const borrar = await agent
      .post(`/app/filtros/${f!.id}/eliminar`)
      .type('form')
      .send({ _csrf: csrf, volver: '/app/empresas' });
    expect(borrar.status).toBe(302);
    expect(t.filtroGuardadoRepo.items.size).toBe(0);
  });

  it('avisa por correo a una empresa con licencia por vencer (botón "Avisar licencias")', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const empresa = new Empresa({
      id: 'e1',
      nombre: 'Con Licencia Vencida',
      sistemasContratados: ['Contabilidad'],
      vigencias: { Contabilidad: '2026-01-01' },
    });
    t.empresaRepo.items.set('e1', empresa);
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/contactos').type('form').send({
      _csrf: csrf, nombre: 'Contacto Uno', empresaId: 'e1', email: 'contacto@e1.com',
    });

    const res = await agent.post('/app/empresas/avisar').type('form').send({
      _csrf: csrf, accion: 'licencias-correo', empresaIds: 'e1',
    });
    expect(res.status).toBe(200);
    expect(res.text).toContain('correo');
    expect(res.text).toContain('Enviado');
    expect(t.emailSender.enviados).toHaveLength(1);
    expect(t.emailSender.enviados[0]!.para).toEqual([{ email: 'contacto@e1.com', nombre: 'Contacto Uno' }]);
  });
});
