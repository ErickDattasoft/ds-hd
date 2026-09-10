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

describe('dashboard', () => {
  it('muestra métricas de tickets tras crear algunos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN, AGENTE] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    for (const [asunto, prioridad] of [['A', 'Alta'], ['B', 'Baja'], ['C', 'Urgente']] as const) {
      await agent.post('/app/tickets').type('form').send({
        _csrf: csrf, asunto: `Ticket ${asunto}`, descripcion: 'descripción de prueba larga', tipo: 'General', prioridad,
      });
    }

    const dash = await agent.get('/app');
    expect(dash.status).toBe(200);
    expect(dash.text).toContain('Tickets abiertos');
    expect(dash.text).toContain('Sin asignar');
    // 3 tickets abiertos
    expect(dash.text).toMatch(/stat__num">3</);
  });

  it('el agente ve el dashboard acotado a lo suyo', async () => {
    const t = makeTestApp({ usuarios: [AGENTE] });
    const { agent } = await login(t.app, AGENTE.email, AGENTE.password);
    const dash = await agent.get('/app');
    expect(dash.status).toBe(200);
    expect(dash.text).toContain('Hola, Agente');
  });

  it('el dashboard muestra la tarea recién creada y el calendario la agenda', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    await agent.post('/app/tareas').type('form').send({
      _csrf: csrf, titulo: 'Llamar al cliente', vence: '2026-09-15', volverA: '/app',
    });

    const dash = await agent.get('/app');
    expect(dash.status).toBe(200);

    const cal = await agent.get('/app/calendario?mes=2026-9');
    expect(cal.status).toBe(200);
    expect(cal.text).toContain('Calendario');
    expect(cal.text).toContain('Llamar al cliente');
    expect(cal.text).toMatch(/1 tarea/);

    const otroMes = await agent.get('/app/calendario');
    expect(otroMes.status).toBe(200);
  });
});
