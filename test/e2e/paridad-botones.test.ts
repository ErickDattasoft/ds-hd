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

describe('predeterminados por usuario, WhatsApp a varias personas y correo de empresa', () => {
  it('los predeterminados propios ganan sobre los generales', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const cfg = await t.configuracionRepo.obtenerTickets();
    await t.configuracionRepo.guardarTickets({ ...cfg, predeterminados: { tipo: 'Instalación', grupo: 'Ventas' } });
    const perfil = await agent.get('/app/mi-perfil');
    expect(perfil.text).toContain('Mis predeterminados');
    await agent.post('/app/mi-perfil').type('form').send({
      _csrf: csrf, firma: 'Saludos', encabezado: '', predTipo: 'General', predSistema: 'Nóminas',
    });
    const form = await agent.get('/app/tickets/nuevo');
    expect(form.text).toMatch(/<option selected>General<\/option>/);
    expect(form.text).toMatch(/<option selected>Nóminas<\/option>/);
    expect(form.text).toMatch(/<option selected>Ventas<\/option>/);
  });

  it('guarda varias personas de WhatsApp', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/configuracion/integraciones').type('form').send({
      _csrf: csrf,
      n8nWebhookTickets: '', n8nWebhookCotizaciones: '', n8nWebhookEmpresas: '',
      whatsappTelefono: '', whatsappApiKey: '',
      whatsappOtros: 'Ana, +5211111111, K1\nBeto | +5222222222 | K2\nlínea inválida',
    });
    const cfg = await t.configuracionRepo.obtenerIntegraciones();
    expect(cfg.whatsappOtros).toEqual([
      { nombre: 'Ana', telefono: '+5211111111', apiKey: 'K1' },
      { nombre: 'Beto', telefono: '+5222222222', apiKey: 'K2' },
    ]);
    const vista = await agent.get('/app/configuracion/integraciones');
    expect(vista.text).toContain('Ana, +5211111111, K1');
  });

  it('empresa con correo muestra "Escribir correo"', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME', email: 'hola@acme.mx' }));
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const det = await agent.get('/app/empresas/e1');
    expect(det.text).toContain('href="mailto:hola@acme.mx"');
  });
});

describe('verificación en dos pasos', () => {
  it('activa, pide código al entrar y el admin la puede quitar', async () => {
    const { codigoTotp } = await import('../../src/application/auth/totp.js');
    const codigo = (s: string) => codigoTotp(s, Math.floor(Date.now() / 30_000));
    const t = makeTestApp({ usuarios: [ADMIN, AGENTE] });
    const { agent, csrf } = await login(t.app, AGENTE.email, AGENTE.password);
    const setup = await agent.get('/app/mi-perfil/dos-pasos');
    expect(setup.text).toContain('data:image/gif');
    const secreto = (await t.usuarioRepo.findByUid(AGENTE.uid))!.totpSecreto!;
    const mal = await agent.post('/app/mi-perfil/dos-pasos/activar').type('form').send({ _csrf: csrf, codigo: '000000' });
    expect(mal.status).toBe(422);
    await agent.post('/app/mi-perfil/dos-pasos/activar').type('form').send({ _csrf: csrf, codigo: codigo(secreto) });
    expect((await t.usuarioRepo.findByUid(AGENTE.uid))!.totpActivo).toBe(true);

    // Nuevo login: la contraseña sola ya no da sesión.
    const otro = request.agent(t.app);
    const page = await otro.get('/login');
    const csrf2 = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    const paso1 = await otro.post('/login').type('form').send({ email: AGENTE.email, password: AGENTE.password, _csrf: csrf2 });
    expect(paso1.headers.location).toBe('/login/verificacion');
    expect((await otro.get('/app')).status).toBe(302);
    const malo = await otro.post('/login/verificacion').type('form').send({ _csrf: csrf2, codigo: '000000' });
    expect(malo.status).toBe(401);
    const paso2 = await otro.post('/login/verificacion').type('form').send({ _csrf: csrf2, codigo: codigo(secreto) });
    expect(paso2.headers.location).toBe('/app');
    expect((await otro.get('/app')).status).toBe(200);

    // El admin la quita.
    const adm = await login(t.app, ADMIN.email, ADMIN.password);
    await adm.agent.post(`/app/usuarios/${AGENTE.uid}/dos-pasos/quitar`).type('form').send({ _csrf: adm.csrf });
    expect((await t.usuarioRepo.findByUid(AGENTE.uid))!.totpActivo).toBe(false);
  });
});

describe('encuesta de satisfacción y reportes', () => {
  it('el cliente califica desde la liga firmada y aparece en reportes', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'No timbra', descripcion: 'Falla al timbrar la factura',
      contactoNombre: 'Luis', contactoCorreo: 'luis@cliente.mx', tipo: 'General', prioridad: 'Media',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'En proceso' });
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Resuelto' });
    const correo = t.emailSender.enviados.find((e) => e.asunto.includes('resuelto'));
    expect(correo).toBeTruthy();
    const liga = /href="https?:\/\/[^/]+(\/encuesta\/[^"?]+)\?c=5"/.exec(correo!.html)![1]!;
    const falsa = await request(t.app).get(`/encuesta/${id}/firmafalsa?c=5`);
    expect(falsa.status).toBe(404);
    const ok = await request(t.app).get(`${liga}?c=5`);
    expect(ok.status).toBe(200);
    const rep = await agent.get('/app/reportes');
    expect(rep.text).toContain('★ 5');
    const csv = await agent.get('/app/reportes/agentes.csv');
    expect(csv.headers['content-type']).toContain('text/csv');
  });
});

describe('embudo de ventas', () => {
  it('crea, mueve de etapa y calcula el pronóstico', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/ventas').type('form').send({ _csrf: csrf, titulo: 'Renovación', empresaId: 'e1', monto: '10,000', etapa: 'propuesta' });
    const [o] = [...t.oportunidadRepo.items.values()];
    expect(o!.monto).toBe(10000);
    let vista = await agent.get('/app/ventas');
    expect(vista.text).toContain('Renovación');
    expect(vista.text).toContain('$5,000.00'); // 50 % de probabilidad en "propuesta"
    await agent.post(`/app/ventas/${o!.id}/mover`).type('form').send({ _csrf: csrf, etapa: 'perdida', motivoPerdida: 'Precio' });
    expect(t.oportunidadRepo.items.get(o!.id)!.motivoPerdida).toBe('Precio');
    vista = await agent.get('/app/ventas');
    expect(vista.text).toContain('0%');
    const vacio = await agent.post('/app/ventas').type('form').send({ _csrf: csrf, titulo: '', monto: '1' });
    expect(vacio.status).toBe(422);
  });
});

describe('avisos: elegir qué sistemas mencionar', () => {
  it('solo manda los sistemas marcados y omite la empresa sin nada marcado', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set(
      'e1',
      new Empresa({ id: 'e1', nombre: 'Dos Licencias', sistemasContratados: ['Contabilidad', 'Nóminas'], vigencias: { Contabilidad: '2026-01-01', Nóminas: '2026-02-01' } }),
    );
    t.empresaRepo.items.set('e2', new Empresa({ id: 'e2', nombre: 'Omitida', sistemasContratados: ['Bancos'], vigencias: { Bancos: '2026-01-15' } }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    for (const [id, correo] of [['e1', 'uno@x.mx'], ['e2', 'dos@x.mx']]) {
      await agent.post('/app/contactos').type('form').send({ _csrf: csrf, nombre: `C ${id}`, empresaId: id, email: correo });
    }

    const paso1 = await agent.post('/app/empresas/avisar').type('form').send({
      _csrf: csrf, accion: 'licencias-correo', empresaIds: ['e1', 'e2'],
    });
    expect(paso1.text).toContain('Nóminas');
    expect(paso1.text).toContain('Omitida');

    const res = await agent.post('/app/empresas/avisar/confirmar').type('form').send({
      _csrf: csrf, accion: 'licencias-correo', empresaIds: ['e1', 'e2'], sel_e1: 'Contabilidad',
    });
    expect(res.status).toBe(200);
    expect(t.emailSender.enviados).toHaveLength(1);
    const cuerpo = t.emailSender.enviados[0]!.texto ?? '';
    expect(cuerpo).toContain('Contabilidad');
    expect(cuerpo).not.toContain('Nóminas');
    expect(res.text).toContain('Sin pendientes');
  });
});
