import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';
import { Empresa } from '../../src/core/entities/Empresa.js';

const ADMIN = { uid: 'u-a', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };
const AGENTE = { uid: 'u-g', email: 'g@dattasoft.mx', password: 'agente1234', nombre: 'Gabo', rol: 'agente' as const };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

async function crearCotizacion(t: ReturnType<typeof makeTestApp>, agent: request.Agent, csrf: string) {
  t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
  await agent.post('/app/cotizaciones').type('form').send({
    _csrf: csrf, empresaId: 'e1', concepto_descripcion: 'Licencia', concepto_cantidad: '2', concepto_precio: '100',
  });
  return [...t.cotizacionRepo.items.values()][0]!;
}

describe('cotizaciones: duplicar, eliminar y ticket ligado', () => {
  it('duplica con folio nuevo en borrador', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const orig = await crearCotizacion(t, agent, csrf);
    const res = await agent.post(`/app/cotizaciones/${orig.id}/duplicar`).type('form').send({ _csrf: csrf });
    expect(res.status).toBe(302);
    const todas = [...t.cotizacionRepo.items.values()];
    expect(todas).toHaveLength(2);
    const copia = todas.find((c) => c.id !== orig.id)!;
    expect(copia.folio).not.toBe(orig.folio);
    expect(copia.estado).toBe('borrador');
    expect(copia.total).toBe(orig.total);
  });

  it('elimina definitivamente', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const c = await crearCotizacion(t, agent, csrf);
    await agent.post(`/app/cotizaciones/${c.id}/eliminar`).type('form').send({ _csrf: csrf });
    expect(t.cotizacionRepo.items.size).toBe(0);
  });

  it('guarda el ticket creado, muestra la liga y no permite un segundo ticket', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const c = await crearCotizacion(t, agent, csrf);
    await agent.post(`/app/cotizaciones/${c.id}/crear-ticket`).type('form').send({ _csrf: csrf });
    const act = await t.cotizacionRepo.findById(c.id);
    expect(act!.ticketId).toBeTruthy();
    const det = await agent.get(`/app/cotizaciones/${c.id}`);
    expect(det.text).toContain(`/app/tickets/${act!.ticketId}`);
    expect(det.text).not.toContain('Crear ticket de seguimiento');
    const otra = await agent.post(`/app/cotizaciones/${c.id}/crear-ticket`).type('form').send({ _csrf: csrf });
    expect(otra.status).toBeGreaterThanOrEqual(400);
  });
});

describe('contraseñas', () => {
  it('el admin restablece la contraseña de otro usuario', async () => {
    const t = makeTestApp({ usuarios: [ADMIN, AGENTE] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const form = await agent.get(`/app/usuarios/${AGENTE.uid}`);
    expect(form.text).toContain('Restablecer contraseña');
    const res = await agent.post(`/app/usuarios/${AGENTE.uid}/contrasena`).type('form')
      .send({ _csrf: csrf, password: 'temporal99', passwordConfirmacion: 'temporal99' });
    expect(res.status).toBe(302);
    await expect(t.authProvider.verifyPassword(AGENTE.email, 'temporal99')).resolves.toBeTruthy();
  });

  it('cambio mi contraseña desde Mi perfil; con la actual mala da 422', async () => {
    const t = makeTestApp({ usuarios: [AGENTE] });
    const { agent, csrf } = await login(t.app, AGENTE.email, AGENTE.password);
    const mala = await agent.post('/app/mi-perfil/contrasena').type('form')
      .send({ _csrf: csrf, actual: 'nop', password: 'nueva12345', passwordConfirmacion: 'nueva12345' });
    expect(mala.status).toBe(422);
    const ok = await agent.post('/app/mi-perfil/contrasena').type('form')
      .send({ _csrf: csrf, actual: AGENTE.password, password: 'nueva12345', passwordConfirmacion: 'nueva12345' });
    expect(ok.status).toBe(302);
    await expect(t.authProvider.verifyPassword(AGENTE.email, 'nueva12345')).resolves.toBeTruthy();
  });
});

describe('configuración → predeterminados del ticket nuevo', () => {
  it('se guardan y el formulario de ticket nuevo nace con ellos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const cfg = await t.configuracionRepo.obtenerTickets();
    const vista = await agent.get('/app/configuracion/tickets');
    expect(vista.text).toContain('Predeterminados');
    await agent.post('/app/configuracion/tickets').type('form').send({
      _csrf: csrf,
      tipos: cfg.tipos.join('\n'),
      sistemas: cfg.sistemas.join('\n'),
      grupos: cfg.grupos.join('\n'),
      estados: cfg.estados.join('\n'),
      prioridades: cfg.prioridades.join('\n'),
      tiposFacturables: '',
      estadoInicial: cfg.estadoInicial,
      correosNotificacion: '',
      predTipo: 'Instalación',
      predSistema: 'Bancos',
      predGrupo: 'Ventas',
      predPrioridad: cfg.prioridades[0],
    });
    const guardada = await t.configuracionRepo.obtenerTickets();
    expect(guardada.predeterminados).toMatchObject({ tipo: 'Instalación', sistema: 'Bancos', grupo: 'Ventas' });
    const form = await agent.get('/app/tickets/nuevo');
    expect(form.text).toMatch(/<option selected>Instalación<\/option>/);
    expect(form.text).toMatch(/<option selected>Bancos<\/option>/);
    expect(form.text).toMatch(/<option selected>Ventas<\/option>/);
  });
});

describe('KB y menú', () => {
  it('el artículo trae Copiar/Descargar y el menú respeta la cookie de colapsado', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/kb').type('form').send({
      _csrf: csrf, titulo: 'Cómo timbrar', cuerpoMarkdown: '# Paso 1\nAbre el sistema y timbra.', visibilidad: 'publico', publicado: 'on', categoria: 'General',
    });
    const [art] = [...t.knowledgeRepo.items.values()];
    const res = await agent.get(`/app/kb/${art!.slug}`);
    expect(res.text).toContain('data-kb-copiar');
    expect(res.text).toContain('# Paso 1');
    const mini = await agent.get('/app').set('Cookie', 'sidebar=mini');
    expect(mini.text).toContain('data-sidebar="mini"');
  });
});
