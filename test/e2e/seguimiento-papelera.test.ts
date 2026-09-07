import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';
import { Empresa } from '../../src/core/entities/Empresa.js';

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

    const tarea = await agent.post('/app/tareas').type('form').send({
      _csrf: csrf, titulo: 'Enviar propuesta a ACME', asignadoAUid: ADMIN.uid, vence: '2026-09-05',
    });
    expect(tarea.status).toBe(302);
    const [tar] = [...t.tareaRepo.items.values()];
    expect(tar!.titulo).toBe('Enviar propuesta a ACME');

    // marcar completada
    await agent.post(`/app/tareas/${tar!.id}/marcar`).type('form').send({ _csrf: csrf, completada: 'true' });
    expect((await t.tareaRepo.findById(tar!.id))?.completada).toBe(true);

    const mias = await agent.get('/app/tareas');
    expect(mias.text).toContain('Enviar propuesta a ACME');
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
