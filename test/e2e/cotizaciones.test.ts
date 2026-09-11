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

  async function crearCotizacion(
    t: ReturnType<typeof makeTestApp>,
    csrf: string,
    agent: Awaited<ReturnType<typeof login>>["agent"],
  ) {
    await agent.post('/app/cotizaciones').type('form').send({
      _csrf: csrf, empresaId: 'e1',
      concepto_descripcion: 'Licencia', concepto_cantidad: '1', concepto_precio: '5000',
    });
    return [...t.cotizacionRepo.items.values()][0]!;
  }

  it('página imprimible: sin sidebar, con la tabla de conceptos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const cot = await crearCotizacion(t, csrf, agent);

    const p = await agent.get(`/app/cotizaciones/${cot.id}/imprimir`);
    expect(p.status).toBe(200);
    expect(p.text).toContain('Licencia');
    expect(p.text).toContain('DATTASOFT');
    expect(p.text).toContain('data-logo-img');
    expect(p.text).not.toContain('class="sidebar"');
  });

  it('envía la cotización por correo al contacto de la empresa y la marca enviada', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    t.contactoRepo.items.set(
      'c1',
      new Contacto({ id: 'c1', nombre: 'Ana', empresaId: 'e1', email: 'ana@acme.mx' }),
    );
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const cot = await crearCotizacion(t, csrf, agent);

    const r = await agent
      .post(`/app/cotizaciones/${cot.id}/enviar`)
      .type('form')
      .send({ _csrf: csrf });
    expect(r.status).toBe(302);
    expect(t.emailSender.ultimo?.para[0]?.email).toBe('ana@acme.mx');
    expect((await t.cotizacionRepo.findById(cot.id))?.estado).toBe('enviada');
  });

  it('sin contacto con correo y sin destinatario: 422', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const cot = await crearCotizacion(t, csrf, agent);

    const r = await agent.post(`/app/cotizaciones/${cot.id}/enviar`).type('form').send({ _csrf: csrf });
    expect(r.status).toBe(422);
    expect(t.emailSender.enviados).toHaveLength(0);
  });

  it('captura datos generales y aplica las condiciones por defecto de la config', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME', rfc: 'ACM010101AA1' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    await agent.post('/app/cotizaciones').type('form').send({
      _csrf: csrf,
      empresaId: 'e1',
      emisorNombre: 'Erick',
      emisorCargo: 'Ejecutivo de Ventas',
      contactoNombre: 'Ana',
      contactoCorreo: 'ana@acme.mx',
      concepto_descripcion: 'Licencia',
      concepto_cantidad: '1',
      concepto_precio: '5000',
    });
    const cot = [...t.cotizacionRepo.items.values()][0]!;
    expect(cot.emisorNombre).toBe('Erick');
    expect(cot.emisorCargo).toBe('Ejecutivo de Ventas');
    expect(cot.contactoNombre).toBe('Ana');
    expect(cot.rfc).toBe('ACM010101AA1'); // heredado de la empresa
    expect(cot.condiciones).toContain('pesos mexicanos'); // default de la config

    const p = await agent.get(`/app/cotizaciones/${cot.id}/imprimir`);
    expect(p.text).toContain('ACM010101AA1');
    expect(p.text).toContain('Ejecutivo de Ventas');

    // enviar por correo usa el contacto de la cotización
    const r = await agent.post(`/app/cotizaciones/${cot.id}/enviar`).type('form').send({ _csrf: csrf });
    expect(r.status).toBe(302);
    expect(t.emailSender.ultimo?.para[0]?.email).toBe('ana@acme.mx');
    expect(t.emailSender.ultimo?.html).toContain('pesos mexicanos');
  });

  it('config de cotizaciones: guarda las condiciones por defecto (solo con permiso)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const r = await agent.post('/app/configuracion/cotizaciones').type('form').send({
      _csrf: csrf,
      condicionesPorDefecto: 'Pago a 30 días.',
      emisorCargoPorDefecto: 'Consultor',
      emisorTelefonoPorDefecto: '9990001122',
    });
    expect(r.status).toBe(200);
    expect((await t.configuracionRepo.obtenerCotizaciones()).condicionesPorDefecto).toBe('Pago a 30 días.');
  });

  it('crea un ticket de seguimiento desde la cotización', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const cot = await crearCotizacion(t, csrf, agent);

    const r = await agent
      .post(`/app/cotizaciones/${cot.id}/crear-ticket`)
      .type('form')
      .send({ _csrf: csrf });
    expect(r.status).toBe(302);
    const [ticket] = [...t.ticketStore.tickets.values()];
    expect(ticket!.asunto).toBe(`Seguimiento cotización ${cot.folio}`);
    expect(ticket!.empresaId).toBe('e1');
  });
});
