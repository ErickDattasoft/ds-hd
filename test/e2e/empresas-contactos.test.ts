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

    // Paso 1: pantalla para elegir qué licencias mencionar.
    const seleccion = await agent.post('/app/empresas/avisar').type('form').send({
      _csrf: csrf, accion: 'licencias-correo', empresaIds: 'e1',
    });
    expect(seleccion.status).toBe(200);
    expect(seleccion.text).toContain('Contabilidad');

    // Paso 2: envío con lo marcado.
    const res = await agent.post('/app/empresas/avisar/confirmar').type('form').send({
      _csrf: csrf, accion: 'licencias-correo', empresaIds: 'e1', sel_e1: 'Contabilidad',
    });
    expect(res.status).toBe(200);
    expect(res.text).toContain('correo');
    expect(res.text).toContain('Enviado');
    expect(t.emailSender.enviados).toHaveLength(1);
    expect(t.emailSender.enviados[0]!.para).toEqual([{ email: 'contacto@e1.com', nombre: 'Contacto Uno' }]);
  });

  it('crear empresa con su primer contacto en el mismo paso', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const crear = await agent.post('/app/empresas').type('form').send({
      _csrf: csrf,
      nombre: 'Con Contacto SA',
      contactoNombre: 'Ana López',
      contactoPuesto: 'Compras',
      contactoEmail: 'ana@concontacto.com',
    });
    expect(crear.status).toBe(302);
    const empId = String(crear.headers.location).split('/').pop()!;

    const contactos = [...t.contactoRepo.items.values()];
    expect(contactos).toHaveLength(1);
    expect(contactos[0]!.nombre).toBe('Ana López');
    expect(contactos[0]!.empresaId).toBe(empId);
    expect(contactos[0]!.email).toBe('ana@concontacto.com');
  });

  it('sin nombre de contacto, la empresa se crea sin contacto (campo opcional)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/empresas').type('form').send({ _csrf: csrf, nombre: 'Sin Contacto SA' });
    expect(crear.status).toBe(302);
    expect(t.contactoRepo.items.size).toBe(0);
  });

  it('el detalle de empresa muestra tareas embebidas y permite marcarlas/crearlas ahí mismo', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Con Tareas SA' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const crearTarea = await agent.post('/app/tareas').type('form').send({
      _csrf: csrf, titulo: 'Llamar para renovar', empresaId: 'e1', volverA: '/app/empresas/e1#tareas',
    });
    expect(crearTarea.status).toBe(302);
    expect(crearTarea.headers.location).toBe('/app/empresas/e1#tareas');

    const detalle = await agent.get('/app/empresas/e1');
    expect(detalle.text).toContain('Llamar para renovar');

    const tarea = [...t.tareaRepo.items.values()][0]!;
    const marcar = await agent.post(`/app/tareas/${tarea.id}/marcar`).type('form').send({
      _csrf: csrf, completada: 'true', volverA: '/app/empresas/e1#tareas',
    });
    expect(marcar.status).toBe(302);
    expect(marcar.headers.location).toBe('/app/empresas/e1#tareas');
    expect((await agent.get('/app/empresas/e1')).text).not.toContain('Llamar para renovar');
  });

  it('el historial de empresa combina interacciones y tickets, con filtro por fecha/tipo y resumen por estado', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Historial SA' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    await agent.post('/app/interacciones').type('form').send({
      _csrf: csrf, empresaId: 'e1', tipo: 'llamada', resumen: 'Se le llamó para dar seguimiento',
    });
    const crearTk = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Falla en el sistema', descripcion: 'No prende', tipo: 'Soporte Técnico',
      prioridad: 'Alta', empresaNombre: 'Historial SA',
    });
    expect(crearTk.status).toBe(302);
    const ticket = t.ticketStore.tickets.get(String(crearTk.headers.location).split('/').pop()!)!;
    expect(ticket.empresaId).toBe('e1'); // el nombre exacto debe resolver el id de la empresa

    const sinFiltro = await agent.get('/app/empresas/e1');
    expect(sinFiltro.text).toContain('Se le llamó para dar seguimiento');
    expect(sinFiltro.text).toContain('Falla en el sistema');

    // "Falla en el sistema" también aparece en la tabla aparte "Tickets recientes" — se acota
    // la aserción a la sección del historial (después de id="historial").
    const seccionHistorial = (html: string) => html.slice(html.indexOf('id="historial"'));

    const soloTickets = await agent.get('/app/empresas/e1?hTipo=ticket');
    expect(seccionHistorial(soloTickets.text)).toContain('Falla en el sistema');
    expect(seccionHistorial(soloTickets.text)).not.toContain('Se le llamó para dar seguimiento');
    expect(soloTickets.text).toContain('1'); // resumen por estado (1 Abierto o equivalente)

    const soloLlamadas = await agent.get('/app/empresas/e1?hTipo=llamada');
    expect(seccionHistorial(soloLlamadas.text)).toContain('Se le llamó para dar seguimiento');
    expect(seccionHistorial(soloLlamadas.text)).not.toContain('Falla en el sistema');

    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 1);
    const sinResultados = await agent.get(`/app/empresas/e1?hDesde=${futuro.toISOString().slice(0, 10)}`);
    expect(sinResultados.text).toContain('Sin resultados con ese filtro');
  });

  it('la búsqueda de contactos también encuentra por nombre de empresa (texto libre)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Refaccionaria del Centro' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/contactos').type('form').send({
      _csrf: csrf, nombre: 'Pedro Ruiz', empresaId: 'e1', email: 'pedro@nada.com',
    });

    const res = await agent.get('/app/contactos?q=Refaccionaria');
    expect(res.text).toContain('Pedro Ruiz');
  });

  it('la búsqueda de contactos también encuentra por puesto/cargo', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Comercial X' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/contactos').type('form').send({
      _csrf: csrf, nombre: 'Marta Solís', empresaId: 'e1', email: 'marta@x.com', puesto: 'Gerente de Compras',
    });

    const res = await agent.get('/app/contactos?q=Gerente de Compras');
    expect(res.text).toContain('Marta Solís');
  });
});
