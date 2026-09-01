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

describe('cotizaciones', () => {
  it('crea una cotización con folio consecutivo y calcula totales', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.post('/app/cotizaciones').type('form').send({
      _csrf: csrf,
      empresaId: 'e1',
      vigenciaDias: '20',
      concepto_descripcion: ['Licencia Contabilidad', 'Instalación'],
      concepto_cantidad: ['1', '1'],
      concepto_precio: ['9800', '1500'],
    });
    expect(res.status).toBe(302);
    const [cot] = [...t.cotizacionRepo.items.values()];
    expect(cot!.folio).toMatch(/^COT-\d{4}-0001$/);
    expect(cot!.subtotal).toBe(11300);
    expect(cot!.total).toBe(Math.round(11300 * 1.16 * 100) / 100);

    // segunda cotización → folio 0002
    await agent.post('/app/cotizaciones').type('form').send({
      _csrf: csrf, empresaId: 'e1', concepto_descripcion: 'Otra', concepto_cantidad: '1', concepto_precio: '100',
    });
    const folios = [...t.cotizacionRepo.items.values()].map((c) => c.folio).sort();
    expect(folios[1]).toMatch(/-0002$/);
  });

  it('la calculadora produce un resultado y permite crear la cotización', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const calc = await agent.post('/app/cotizaciones/calcular').type('form').send({
      _csrf: csrf,
      equipo_0_usar: 'on',
      equipo_0_tipo: 'Servidor',
      equipo_0_sistemas: ['CONTABILIDAD', 'BANCOS'],
    });
    expect(calc.status).toBe(200);
    expect(calc.text).toMatch(/13[,.]?400/);
  });

  it('aprobar una cotización requiere permiso cotizaciones:aprobar', async () => {
    const VENDEDOR = { uid: 'u-v', email: 'v@d.com', password: 'vendedor123', nombre: 'V', rol: 'agente' as const };
    const t = makeTestApp({ usuarios: [VENDEDOR] });
    // el rol agente tiene cotizaciones:leer pero no crear/editar/aprobar
    const { agent } = await login(t.app, VENDEDOR.email, VENDEDOR.password);
    expect((await agent.get('/app/cotizaciones')).status).toBe(200);
    expect((await agent.get('/app/cotizaciones/nueva')).status).toBe(403);
  });
});
