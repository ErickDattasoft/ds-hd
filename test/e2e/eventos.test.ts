import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';
import { Evento } from '../../src/core/entities/Evento.js';
import { Empresa } from '../../src/core/entities/Empresa.js';

const ADMIN = { uid: 'u-a', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

const enUnaSemana = () => new Date(Date.now() + 7 * 86_400_000);

describe('eventos / webinars', () => {
  it('registro público: crea inscripción, envía confirmación y bloquea duplicados', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set(
      'ev1',
      new Evento({ id: 'ev1', titulo: 'Webinar CFDI 4.0', fechaHora: enUnaSemana(), estado: 'publicado' }),
    );

    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    expect(page.text).toContain('Webinar CFDI 4.0');

    const reg = await anon.post('/eventos/ev1').type('form').send({
      _csrf: csrf, nombre: 'Laura Méndez', email: 'laura@empresa.com', empresa: 'Empresa X',
    });
    expect(reg.status).toBe(200);
    expect(reg.text).toContain('Registro confirmado');
    expect(t.inscripcionRepo.items).toHaveLength(1);
    expect(t.emailSender.enviados.some((c) => c.asunto.includes('Registro confirmado'))).toBe(true);

    // duplicado
    const dup = await anon.post('/eventos/ev1').type('form').send({
      _csrf: csrf, nombre: 'Laura Méndez', email: 'laura@empresa.com',
    });
    expect(dup.status).toBe(422);
    expect(dup.text).toContain('Ya estás registrado');
  });

  it('la lista negra bloquea el registro', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Evento', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    await admin.agent.post('/app/eventos/ev1/lista-negra').type('form').send({ _csrf: admin.csrf, email: 'spam@bot.com', motivo: 'spam' });

    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    const reg = await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Bot', email: 'spam@bot.com' });
    expect(reg.status).toBe(422);
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });

  it('el job de recordatorios requiere el bearer JOBS_SECRET y envía a los inscritos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const enUnaHora = new Date(Date.now() + 60 * 60 * 1000);
    t.eventoRepo.items.set(
      'ev1',
      new Evento({ id: 'ev1', titulo: 'Mañana', fechaHora: enUnaHora, estado: 'publicado', horasRecordatorio: 24 }),
    );
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'A', email: 'a@a.com', telefono: null, empresa: null,
      estado: 'registrado', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null, correoSospechoso: false, createdAt: new Date(),
    });

    const sinAuth = await request(t.app).post('/jobs/recordatorios-eventos');
    expect(sinAuth.status).toBe(401);

    const conAuth = await request(t.app)
      .post('/jobs/recordatorios-eventos')
      .set('authorization', 'Bearer dev-jobs-secret');
    expect(conAuth.status).toBe(200);
    expect(conAuth.body.correos).toBe(1);
    expect(t.emailSender.enviados.some((c) => c.asunto.startsWith('Recordatorio'))).toBe(true);
  });

  it('el webhook de Brevo actualiza el correoEstado de la inscripción', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Evento webhook', fechaHora: enUnaSemana(), estado: 'publicado' }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'A', email: 'a@a.com', telefono: null, empresa: null,
      estado: 'registrado', origen: 'publico', correoEstado: 'pendiente', recordatoriosEnviados: [], ip: null, correoSospechoso: false, createdAt: new Date(),
    });

    const noAuth = await request(t.app).post('/webhooks/brevo').send({ event: 'delivered', tag: 'insc_i1' });
    expect(noAuth.status).toBe(401);

    const ok = await request(t.app)
      .post('/webhooks/brevo?key=dev-jobs-secret')
      .send({ event: 'hard_bounce', email: 'a@a.com', tag: 'insc_i1' });
    expect(ok.status).toBe(200);
    expect(ok.body.actualizada).toBe(true);
    expect(t.inscripcionRepo.items[0]?.correoEstado).toBe('rebotado');
  });

  it('admin crea un evento desde el back-office', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent.post('/app/eventos').type('form').send({
      _csrf: csrf, titulo: 'Nuevo Webinar', fechaHora: '2026-12-01T10:00', estado: 'publicado', cupo: '100',
    });
    expect(res.status).toBe(302);
    expect([...t.eventoRepo.items.values()][0]?.titulo).toBe('Nuevo Webinar');
  });

  it('invitación dirigida: agrega una empresa, marca su respuesta y la muestra en el detalle', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Webinar dirigido', fechaHora: enUnaSemana(), estado: 'publicado' }));
    await t.empresaRepo.save(
      new Empresa({ id: 'e1', nombre: 'INFOXPERT', sistemasContratados: ['CONTPAQi Contabilidad'] }),
    );
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const add = await agent.post('/app/eventos/ev1/empresas').type('form')
      .send({ _csrf: csrf, empresaNombre: 'INFOXPERT', invitadoPor: 'Erick' });
    expect(add.status).toBe(302);
    let ev = await t.eventoRepo.findById('ev1');
    expect(ev!.invitaciones).toHaveLength(1);
    expect(ev!.invitaciones[0]!.empresaId).toBe('e1');
    expect(ev!.invitaciones[0]!.sistemas).toEqual(['CONTPAQi Contabilidad']);

    const invId = ev!.invitaciones[0]!.id;
    const upd = await agent.post(`/app/eventos/ev1/empresas/${invId}`).type('form')
      .send({ _csrf: csrf, invitadoPor: 'Erick', contactado: 'on', respuesta: 'asistira', notas: 'confirmó por teléfono' });
    expect(upd.status).toBe(302);
    ev = await t.eventoRepo.findById('ev1');
    expect(ev!.invitaciones[0]!.contactado).toBe(true);
    expect(ev!.invitaciones[0]!.respuesta).toBe('asistira');
    expect(ev!.resumenInvitaciones.asistiran).toBe(1);

    const detalle = await agent.get('/app/eventos/ev1');
    expect(detalle.text).toContain('INFOXPERT');
    expect(detalle.text).toContain('Invitación dirigida');

    const del = await agent.post(`/app/eventos/ev1/empresas/${invId}/quitar`).type('form').send({ _csrf: csrf });
    expect(del.status).toBe(302);
    expect((await t.eventoRepo.findById('ev1'))!.invitaciones).toHaveLength(0);
  });

  it('rechaza invitar dos veces a la misma empresa', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Dup', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/eventos/ev1/empresas').type('form').send({ _csrf: csrf, empresaNombre: 'ACME SA' });
    const dup = await agent.post('/app/eventos/ev1/empresas').type('form').send({ _csrf: csrf, empresaNombre: 'acme sa' });
    expect(dup.status).toBe(409);
    expect((await t.eventoRepo.findById('ev1'))!.invitaciones).toHaveLength(1);
  });

  it('invitados externos: agregar y editar', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Ext', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/eventos/ev1/externos').type('form').send({ _csrf: csrf, nombre: 'Juan de LinkedIn', fuente: 'Redes sociales' });
    const ev = await t.eventoRepo.findById('ev1');
    expect(ev!.invitadosExternos).toHaveLength(1);
    const extId = ev!.invitadosExternos[0]!.id;
    const upd = await agent.post(`/app/eventos/ev1/externos/${extId}`).type('form')
      .send({ _csrf: csrf, nombre: 'Juan Pérez', fuente: 'Referido', contactado: 'on', respuesta: 'no_asistira' });
    expect(upd.status).toBe(302);
    expect((await t.eventoRepo.findById('ev1'))!.invitadosExternos[0]!.nombre).toBe('Juan Pérez');
  });
});
