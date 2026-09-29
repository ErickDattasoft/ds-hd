import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { Contacto } from '../../src/core/entities/Contacto.js';

const ADMIN = { uid: 'u-a', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

describe('seguimiento comercial', () => {
  it('registra una interacción en una empresa y una tarea', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const inter = await agent.post('/app/interacciones').type('form').send({
      _csrf: csrf, empresaId: 'e1', tipo: 'llamada', fecha: '2026-09-01', resumen: 'Llamada de seguimiento por renovación',
    });
    expect(inter.status).toBe(302);
    expect(t.interaccionRepo.items[0]?.tipo).toBe('llamada');

    const formTarea = await agent.get('/app/tareas');
    expect(formTarea.text).toContain('ACME'); // el <select> de empresa lista la cartera

    const tarea = await agent.post('/app/tareas').type('form').send({
      _csrf: csrf, titulo: 'Enviar propuesta a ACME', empresaId: 'e1', asignadoAUid: ADMIN.uid, vence: '2026-09-05',
    });
    expect(tarea.status).toBe(302);
    const [tar] = [...t.tareaRepo.items.values()];
    expect(tar!.titulo).toBe('Enviar propuesta a ACME');
    expect(tar!.empresaId).toBe('e1');

    // marcar completada
    await agent.post(`/app/tareas/${tar!.id}/marcar`).type('form').send({ _csrf: csrf, completada: 'true' });
    expect((await t.tareaRepo.findById(tar!.id))?.completada).toBe(true);

    const mias = await agent.get('/app/tareas');
    expect(mias.text).toContain('Enviar propuesta a ACME');
    expect(mias.text).toContain('href="/app/empresas/e1"');
  });
});

describe('papelera', () => {
  it('muestra empresas archivadas y permite restaurarlas', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Vieja SA', activa: false }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const pap = await agent.get('/app/papelera');
    expect(pap.text).toContain('Vieja SA');

    await agent.post('/app/empresas/e1/archivar').type('form').send({ _csrf: csrf, archivar: 'false' });
    expect(t.empresaRepo.items.get('e1')?.activa).toBe(true);
  });

  it('restaura varias empresas a la vez', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Una SA', activa: false }));
    t.empresaRepo.items.set('e2', new Empresa({ id: 'e2', nombre: 'Dos SA', activa: false }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const r = await agent
      .post('/app/papelera/restaurar')
      .type('form')
      .send({ _csrf: csrf, tipo: 'empresas', ids: ['e1', 'e2'] });
    expect(r.status).toBe(302);
    expect(t.empresaRepo.items.get('e1')?.activa).toBe(true);
    expect(t.empresaRepo.items.get('e2')?.activa).toBe(true);
  });

  it('elimina definitivamente y vacía la papelera', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Borrar SA', activa: false }));
    t.empresaRepo.items.set('e2', new Empresa({ id: 'e2', nombre: 'Borrar 2 SA', activa: false }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    await agent
      .post('/app/papelera/eliminar')
      .type('form')
      .send({ _csrf: csrf, tipo: 'empresas', ids: ['e1'] });
    expect(t.empresaRepo.items.has('e1')).toBe(false);
    expect(t.empresaRepo.items.has('e2')).toBe(true);

    await agent.post('/app/papelera/vaciar').type('form').send({ _csrf: csrf, tipo: 'empresas' });
    expect(t.empresaRepo.items.size).toBe(0);
  });

  it('no borra una empresa que no está archivada', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Activa SA', activa: true }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    await agent
      .post('/app/papelera/eliminar')
      .type('form')
      .send({ _csrf: csrf, tipo: 'empresas', ids: ['e1'] });
    expect(t.empresaRepo.items.has('e1')).toBe(true);
  });
});

describe('detalle de empresa (el drawer del CRM viejo)', () => {
  it('borra interacciones y tareas, asigna la tarea rápida y filtra tareas por vencimiento', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    await agent.post('/app/interacciones').type('form').send({
      _csrf: csrf, empresaId: 'e1', tipo: 'nota', fecha: '2026-09-01', resumen: 'Nota que sobra',
    });
    const inter = t.interaccionRepo.items[0]!;
    let det = await agent.get('/app/empresas/e1');
    expect(det.text).toContain(`/app/interacciones/${inter.id}/eliminar`);
    const borrada = await agent.post(`/app/interacciones/${inter.id}/eliminar`).type('form').send({ _csrf: csrf });
    expect(borrada.headers.location).toBe('/app/empresas/e1#historial');
    expect(t.interaccionRepo.items).toHaveLength(0);

    await agent.post('/app/tareas').type('form').send({
      _csrf: csrf, titulo: 'Llamar en octubre', empresaId: 'e1', asignadoAUid: ADMIN.uid, vence: '2026-10-15',
      descripcion: 'Renovación', volverA: '/app/empresas/e1#tareas',
    });
    await agent.post('/app/tareas').type('form').send({
      _csrf: csrf, titulo: 'Llamar en diciembre', empresaId: 'e1', asignadoAUid: ADMIN.uid, vence: '2026-12-01',
    });
    det = await agent.get('/app/empresas/e1');
    expect(det.text).toContain('name="asignadoAUid"');
    expect(det.text).toContain('Renovación');
    const filtrado = await agent.get('/app/empresas/e1?hDesde=2026-10-01&hHasta=2026-10-31');
    expect(filtrado.text).toContain('Llamar en octubre');
    expect(filtrado.text).not.toContain('Llamar en diciembre');

    const oct = [...t.tareaRepo.items.values()].find((x) => x.titulo === 'Llamar en octubre')!;
    await agent.post(`/app/tareas/${oct.id}/eliminar`).type('form').send({ _csrf: csrf, volverA: '/app/empresas/e1#tareas' });
    expect(t.tareaRepo.items.has(oct.id)).toBe(false);
  });
});

describe('papelera de empresas y contactos (paridad con el viejo)', () => {
  it('muestra fecha, empresa del contacto, botones por fila y el contador en las listas', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'VIEJA SA', activa: false }));
    await t.contactoRepo.save(new Contacto({ id: 'c1', empresaId: 'e1', nombre: 'Ana Pérez', email: 'ana@x.com' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const pap = await agent.get('/app/papelera');
    expect(pap.text).toContain('data-seleccionar-todo');
    expect(pap.text).toContain('form="uno-empresas"');
    expect(pap.text).toContain('En la papelera desde');

    // El contacto de una empresa archivada muestra su nombre, no el id interno.
    const contactos = await agent.get('/app/contactos');
    expect(contactos.text).toContain('VIEJA SA');
    const empresas = await agent.get('/app/empresas');
    expect(empresas.text).toMatch(/🗑️ Papelera <span class="badge">1<\/span>/);

    // Botón por fila: solo restaura esa.
    await agent.post('/app/papelera/restaurar').type('form').send({ _csrf: csrf, tipo: 'empresas', ids: 'e1' });
    expect(t.empresaRepo.items.get('e1')?.activa).toBe(true);
  });
});
