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
});
