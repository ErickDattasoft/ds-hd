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

// PNG 1x1 transparente, el fixture mínimo de siempre para probar subida de imágenes.
const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('eventos / webinars', () => {
  it('👁 vista previa y ✉️ enviarme una prueba: funcionan en borrador y no agregan invitados', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Cena de gala', tipo: 'presencial', estilo: 'elegante', fechaHora: enUnaSemana(), estado: 'borrador' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const vista = await agent.get('/app/eventos/ev1/vista-previa');
    expect(vista.status).toBe(200);
    expect(vista.text).toContain('Vista previa');
    expect(vista.text).toContain('Juan Pérez');
    expect(vista.text).toContain('inv-estilo--elegante');
    expect(vista.text).toMatch(/action="#"/);
    expect((await request(t.app).get('/app/eventos/ev1/vista-previa')).status).toBe(302); // sin sesión, al login
    const res = await agent.post('/app/eventos/ev1/enviarme-prueba').type('form').send({ _csrf: csrf });
    expect(res.status).toBe(302);
    const correo = t.emailSender.enviados.at(-1)!;
    expect(correo.para[0]?.email).toBe(ADMIN.email);
    expect(correo.asunto).toBe('[Prueba] Invitación: Cena de gala');
    expect(correo.html).toContain('/app/eventos/ev1/vista-previa');
    expect(t.eventoRepo.items.get('ev1')!.invitadosExternos).toHaveLength(0);
  });

  it('🧪 eventos de ejemplo: crea uno por estilo, te manda las invitaciones y no salen en la lista pública', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent.post('/app/eventos/ejemplos').type('form').send({ _csrf: csrf });
    expect(res.status).toBe(302);
    const ejemplos = [...t.eventoRepo.items.values()].filter((e) => e.esPrueba);
    expect(ejemplos.map((e) => e.estilo).sort()).toEqual(['corporativo', 'cumpleanos', 'elegante', 'fiesta', 'navidad']);
    const invitaciones = t.emailSender.enviados.filter((c) => c.para[0]?.email === ADMIN.email);
    expect(invitaciones).toHaveLength(5);
    expect(ejemplos.every((e) => e.invitadosExternos[0]?.enviadaAt)).toBe(true);
    const lista = await agent.get('/app/eventos');
    expect(lista.text).toContain('🗑 Borrar ejemplos');
    const publica = await request(t.app).get('/eventos');
    expect(publica.text).not.toContain('🧪');
    // Invitar a otra persona a todos los ejemplos (sin duplicar si se repite).
    const antes = t.emailSender.enviados.length;
    await agent.post('/app/eventos/ejemplos/invitar').type('form').send({ _csrf: csrf, nombre: 'Arturo', correo: 'arturo@dattasoft.mx' });
    expect(t.emailSender.enviados.length - antes).toBe(5);
    expect(t.emailSender.enviados.at(-1)?.para[0]?.email).toBe('arturo@dattasoft.mx');
    await agent.post('/app/eventos/ejemplos/invitar').type('form').send({ _csrf: csrf, correo: 'arturo@dattasoft.mx' });
    expect(t.emailSender.enviados.length - antes).toBe(5);
    expect([...t.eventoRepo.items.values()].filter((e) => e.esPrueba).every((e) => e.invitadosExternos.length === 2)).toBe(true);
    // Volver a crear no duplica; borrar los quita todos.
    await agent.post('/app/eventos/ejemplos').type('form').send({ _csrf: csrf });
    expect([...t.eventoRepo.items.values()].filter((e) => e.esPrueba)).toHaveLength(5);
    await agent.post('/app/eventos/ejemplos/eliminar').type('form').send({ _csrf: csrf });
    expect([...t.eventoRepo.items.values()].filter((e) => e.esPrueba)).toHaveLength(0);
  });

  it('formulario en pasos: lo básico arriba, campos por tipo y estado con nombres claros', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const form = await agent.get('/app/eventos/nuevo');
    expect(form.status).toBe(200);
    expect(form.text).toContain('Lo básico');
    expect(form.text).toContain('Opciones avanzadas');
    expect(form.text).toMatch(/data-solo-tipo="webinar"><span>💻 Liga/);
    expect(form.text).toMatch(/data-solo-tipo="presencial"><span>📍 Lugar/);
    expect(form.text).toMatch(/<option value="borrador" selected>📝 En preparación/);
  });

  it('estilo de la invitación: se elige en el formulario y se ve en la página', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const form = await agent.get('/app/eventos/nuevo?tipo=felicitacion');
    expect(form.status).toBe(200);
    expect(form.text).toContain('🎨 Estilo de la invitación');
    expect(form.text).toMatch(/name="estilo" value="fiesta" checked/);
    const res = await agent.post('/app/eventos').type('form').send({
      _csrf: csrf, titulo: 'Posada 2026', tipo: 'presencial', estilo: 'navidad', fechaHora: '2026-12-12T20:00', estado: 'publicado',
    });
    expect(res.status).toBe(302);
    const ev = [...t.eventoRepo.items.values()].find((e) => e.titulo === 'Posada 2026')!;
    expect(ev.estilo).toBe('navidad');
    const pub = await request(t.app).get(`/eventos/${ev.id}`);
    expect(pub.text).toContain('inv-estilo--navidad');
    expect(pub.text).toContain('🎄');
    // Vista previa al compartir en redes.
    expect(pub.text).toContain('<meta property="og:title" content="Posada 2026"');
    expect(pub.text).toMatch(/og:image" content="https?:\/\/[^"]+\/logo"/);
  });

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
      estado: 'registrado', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null, correoSospechoso: false, asistira: null, usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
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

  it('el recordatorio usa la plantilla del evento, y con 0 horas no se manda', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const enUnaHora = new Date(Date.now() + 60 * 60 * 1000);
    t.eventoRepo.items.set(
      'ev1',
      new Evento({ id: 'ev1', titulo: 'Con plantilla', fechaHora: enUnaHora, estado: 'publicado', horasRecordatorio: 24, plantilla: 'Hola [nombre], entra a [link]', urlWebinar: 'https://zoom.us/j/1' }),
    );
    t.eventoRepo.items.set(
      'ev2',
      new Evento({ id: 'ev2', titulo: 'Sin recordatorio', fechaHora: enUnaHora, estado: 'publicado', horasRecordatorio: 0 }),
    );
    for (const [id, eventoId] of [['i1', 'ev1'], ['i2', 'ev2']] as const) {
      await t.inscripcionRepo.create({
        id, eventoId, nombre: 'Ana', email: `${id}@a.com`, telefono: null, empresa: null,
        estado: 'registrado', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null, correoSospechoso: false, asistira: null, usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
      });
    }

    const res = await request(t.app).post('/jobs/recordatorios-eventos').set('authorization', 'Bearer dev-jobs-secret');
    expect(res.body.correos).toBe(1);
    const recordatorio = t.emailSender.enviados.find((c) => c.asunto.startsWith('Recordatorio'))!;
    expect(recordatorio.para[0]!.email).toBe('i1@a.com');
    expect(recordatorio.html).toContain('Hola Ana, entra a https://zoom.us/j/1');
  });

  it('el formulario acepta 0 horas de recordatorio y la plantilla nueva arranca con el texto por defecto', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    const form = await admin.agent.get('/app/eventos/nuevo');
    expect(form.text).toContain('Quedaste registrado en [evento].');

    await admin.agent.post('/app/eventos').type('form').send({
      _csrf: admin.csrf, titulo: 'Webinar sin recordatorio', fechaHora: '2030-01-10T10:00', horasRecordatorio: '0',
    });
    const [creado] = [...t.eventoRepo.items.values()];
    expect(creado!.horasRecordatorio).toBe(0);
  });

  it('el webhook de Brevo actualiza el correoEstado de la inscripción', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Evento webhook', fechaHora: enUnaSemana(), estado: 'publicado' }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'A', email: 'a@a.com', telefono: null, empresa: null,
      estado: 'registrado', origen: 'publico', correoEstado: 'pendiente', recordatoriosEnviados: [], ip: null, correoSospechoso: false, asistira: null, usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
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
    expect(detalle.text).toContain('Invitaciones');
    // Cada invitado trae su link personal (🔗) para mandarlo por correo o WhatsApp.
    expect(detalle.text).toContain('/eventos/ev1/i/');

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
    // Regresa al panel con el aviso del duplicado, en vez de una página de error.
    expect(dup.status).toBe(302);
    expect(decodeURIComponent(dup.headers.location ?? '')).toContain('ya está invitada');
    expect((await t.eventoRepo.findById('ev1'))!.invitaciones).toHaveLength(1);
  });

  it('editar los datos del evento no borra la invitación dirigida', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Antes', fechaHora: enUnaSemana(), estado: 'borrador' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/eventos/ev1/empresas').type('form').send({ _csrf: csrf, empresaNombre: 'ACME SA' });
    await agent.post('/app/eventos/ev1/externos').type('form').send({ _csrf: csrf, nombre: 'Juan' });

    const res = await agent.post('/app/eventos/ev1').type('form')
      .send({ _csrf: csrf, titulo: 'Después', fechaHora: '2026-12-05T10:00', estado: 'publicado' });
    expect(res.status).toBe(302);

    const ev = await t.eventoRepo.findById('ev1');
    expect(ev!.titulo).toBe('Después');
    expect(ev!.invitaciones).toHaveLength(1);
    expect(ev!.invitadosExternos).toHaveLength(1);
  });

  it('eliminar un evento lo borra junto con sus inscritos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'A borrar', fechaHora: enUnaSemana(), estado: 'publicado' }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'A', email: 'a@a.com', telefono: null, empresa: null,
      estado: 'registrado', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null, correoSospechoso: false, asistira: null, usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.post('/app/eventos/ev1/eliminar').type('form').send({ _csrf: csrf });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/app/eventos');
    expect(await t.eventoRepo.findById('ev1')).toBeNull();
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });

  it('un rol sin eventos:gestionar no puede eliminar', async () => {
    const LECTURA = { uid: 'u-l', email: 'lec@dattasoft.mx', password: 'lectura12345', nombre: 'Lec', rol: 'lectura' as const };
    const t = makeTestApp({ usuarios: [LECTURA] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Evento X', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const { agent, csrf } = await login(t.app, LECTURA.email, LECTURA.password);
    const res = await agent.post('/app/eventos/ev1/eliminar').type('form').send({ _csrf: csrf });
    expect(res.status).toBe(403);
    expect(await t.eventoRepo.findById('ev1')).not.toBeNull();
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

  it('flayer: sin flayer da 404, tras subirlo se sirve público y aparece en el registro; se puede quitar', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Con flayer', fechaHora: enUnaSemana(), estado: 'publicado' }));
    expect((await request(t.app).get('/eventos/ev1/flayer')).status).toBe(404);

    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const subir = await agent
      .post('/app/eventos/ev1/flayer')
      .set('x-csrf-token', csrf)
      .send({ contentType: 'image/png', base64: PNG_1X1 });
    expect(subir.body).toEqual({ ok: true });

    const archivo = await request(t.app).get('/eventos/ev1/flayer');
    expect(archivo.status).toBe(200);
    expect(archivo.headers['content-type']).toContain('image/png');

    const pagina = await request(t.app).get('/eventos/ev1');
    expect(pagina.text).toContain('/eventos/ev1/flayer');

    const eliminar = await agent
      .post('/app/eventos/ev1/flayer/eliminar')
      .type('form')
      .send({ _csrf: csrf });
    expect(eliminar.status).toBe(302);
    expect((await request(t.app).get('/eventos/ev1/flayer')).status).toBe(404);
  });

  it('flayer: rechaza un tipo de archivo no permitido y un rol sin eventos:gestionar no puede subirlo', async () => {
    const LECTURA = { uid: 'u-l2', email: 'lec2@dattasoft.mx', password: 'lectura12345', nombre: 'Lec', rol: 'lectura' as const };
    const t = makeTestApp({ usuarios: [ADMIN, LECTURA] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Evento', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    const tipoInvalido = await admin.agent
      .post('/app/eventos/ev1/flayer')
      .set('x-csrf-token', admin.csrf)
      .send({ contentType: 'image/svg+xml', base64: PNG_1X1 });
    expect(tipoInvalido.body.ok).toBe(false);

    const lectura = await login(t.app, LECTURA.email, LECTURA.password);
    const sinPermiso = await lectura.agent
      .post('/app/eventos/ev1/flayer')
      .set('x-csrf-token', lectura.csrf)
      .send({ contentType: 'image/png', base64: PNG_1X1 });
    expect(sinPermiso.status).toBe(403);
  });
});

describe('eventos — contacto, plantilla y seguimiento por evento', () => {
  it('guarda sistema/contacto/plantilla/mensaje de seguimiento desde el form de staff', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/eventos').type('form').send({
      _csrf: csrf, titulo: 'Webinar CFDI', fechaHora: '2026-12-01T10:00', estado: 'publicado',
      sistema: 'Contabilidad', contactoNombre: 'Erick', contactoWhatsapp: '5215512345678',
      plantilla: 'Hola [nombre], nos vemos en [evento] el [fecha]. — [contacto_nombre]',
      mensajeSeguimiento: 'Gracias por venir a [evento]', horasSeguimiento: '48',
    });
    expect(crear.status).toBe(302);
    const id = String(crear.headers.location).split('/').pop()!;
    const evento = await t.eventoRepo.findById(id);
    expect(evento).toMatchObject({
      sistema: 'Contabilidad', contactoNombre: 'Erick', contactoWhatsapp: '5215512345678',
      mensajeSeguimiento: 'Gracias por venir a [evento]', horasSeguimiento: 48,
    });
    expect(evento!.plantilla).toContain('[contacto_nombre]');

    // el form de edición precarga todos los campos (valores: {...evento}), así que un
    // reenvío normal desde el navegador los manda de vuelta tal cual — solo cambia el título.
    const editar = await agent.post(`/app/eventos/${id}`).type('form').send({
      _csrf: csrf, titulo: 'Webinar CFDI 4.0', fechaHora: '2026-12-01T10:00', estado: 'publicado',
      sistema: evento!.sistema, contactoNombre: evento!.contactoNombre, contactoWhatsapp: evento!.contactoWhatsapp,
      plantilla: evento!.plantilla, mensajeSeguimiento: evento!.mensajeSeguimiento, horasSeguimiento: String(evento!.horasSeguimiento),
    });
    expect(editar.status).toBe(302);
    const editado = await t.eventoRepo.findById(id);
    expect(editado!.titulo).toBe('Webinar CFDI 4.0');
    expect(editado!.sistema).toBe('Contabilidad');
    expect(editado!.contactoNombre).toBe('Erick');
    expect(editado!.plantilla).toContain('[contacto_nombre]');
  });

  it('editar solo el título (sin mandar los campos nuevos) sí los borra — coherente con el resto de campos opcionales del form', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/eventos').type('form').send({
      _csrf: csrf, titulo: 'Webinar', fechaHora: '2026-12-01T10:00', estado: 'publicado', sistema: 'Nóminas',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    await agent.post(`/app/eventos/${id}`).type('form').send({
      _csrf: csrf, titulo: 'Webinar renombrado', fechaHora: '2026-12-01T10:00', estado: 'publicado',
    });
    const editado = await t.eventoRepo.findById(id);
    expect(editado!.titulo).toBe('Webinar renombrado');
    expect(editado!.sistema).toBeNull();
  });

  it('el detalle de staff arma el link de WhatsApp con la plantilla resuelta por inscrito', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Webinar', fechaHora: enUnaSemana(), estado: 'publicado',
      contactoNombre: 'Erick', contactoWhatsapp: '5215500000000',
      plantilla: 'Hola [nombre], te esperamos en [evento].',
    }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'Laura', email: 'laura@x.com', telefono: '5551234567', empresa: null,
      estado: 'registrado', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null,
      correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: '💼 LinkedIn', deseaCanalWhatsapp: true, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const detalle = await agent.get('/app/eventos/ev1');
    expect(detalle.status).toBe(200);
    expect(detalle.text).toContain('https://wa.me/525551234567');
    expect(detalle.text).toContain(encodeURIComponent('Hola Laura, te esperamos en Webinar.'));
    // "¿Asistirá?" es su propia columna (como en el CRM anterior), el valor va en la celda.
    expect(detalle.text).toContain('<span class="muted" title="Lo que declaró al registrarse">Sí</span>');
    expect(detalle.text).toContain('Se enteró: 💼 LinkedIn');
    expect(detalle.text).toContain('quiere el canal de WhatsApp');
  });
});

describe('registro público — asistira/usaSistema/fuente/canal WhatsApp', () => {
  it('captura los campos nuevos; "¿usas el sistema?" solo aparece si el evento tiene sistema', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Con sistema', fechaHora: enUnaSemana(), estado: 'publicado', sistema: 'Nóminas',
    }));
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    expect(page.text).toContain('¿Actualmente utilizas Nóminas?');
    expect(page.text).not.toContain('canal de WhatsApp'); // oculto hasta que exista el canal
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;

    const reg = await anon.post('/eventos/ev1').type('form').send({
      _csrf: csrf, nombre: 'Pedro', email: 'pedro@x.com', asistira: 'Sí', usaSistema: 'No',
      fuente: '📘 Facebook', deseaCanalWhatsapp: 'on',
    });
    expect(reg.status).toBe(200);
    const ins = t.inscripcionRepo.items[0]!;
    expect(ins).toMatchObject({ asistira: 'Sí', usaSistema: 'No', fuente: '📘 Facebook', deseaCanalWhatsapp: true });
  });

  it('sin sistema en el evento, usaSistema se ignora aunque venga en el body', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Sin sistema', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    expect(page.text).not.toContain('¿Actualmente utilizas');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    await anon.post('/eventos/ev1').type('form').send({
      _csrf: csrf, nombre: 'Ana', email: 'ana@x.com', asistira: 'Tal vez', usaSistema: 'No',
    });
    expect(t.inscripcionRepo.items[0]!.usaSistema).toBeNull();
  });

  it('duplicado: ofrece reenviar el link, sin revelar si el correo existe o no', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Reenviar', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com', asistira: 'Sí' });

    const dup = await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com', asistira: 'Sí' });
    expect(dup.status).toBe(422);
    expect(dup.text).toContain('Reenviarme el acceso');

    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('Registro confirmado'))).toHaveLength(1);
    const reenviar = await request(t.app)
      .post('/eventos/ev1/reenviar-link')
      .set('x-csrf-token', csrf)
      .set('Cookie', `x-csrf-token=${csrf}`)
      .send({ correo: 'laura@x.com' });
    expect(reenviar.status).toBe(200);
    expect(reenviar.body.mensaje).toContain('Si el correo está registrado');
    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('Registro confirmado'))).toHaveLength(2);

    // correo inexistente: misma respuesta genérica, sin mandar nada
    const reenviarInexistente = await request(t.app)
      .post('/eventos/ev1/reenviar-link')
      .set('x-csrf-token', csrf)
      .set('Cookie', `x-csrf-token=${csrf}`)
      .send({ correo: 'nadie@x.com' });
    expect(reenviarInexistente.status).toBe(200);
    expect(reenviarInexistente.body.mensaje).toBe(reenviar.body.mensaje);
    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('Registro confirmado'))).toHaveLength(2);
  });
});

describe('seguimiento post-evento (job)', () => {
  it('manda el mensaje de seguimiento solo si el evento lo tiene, ya pasaron las horas configuradas, y no lo repite', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const haceDosDias = new Date(Date.now() - 48 * 3_600_000);
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Ya pasó', fechaHora: haceDosDias, estado: 'publicado',
      mensajeSeguimiento: 'Gracias por venir a [evento], [nombre]', horasSeguimiento: 24,
    }));
    t.eventoRepo.items.set('ev2', new Evento({
      id: 'ev2', titulo: 'Sin mensaje', fechaHora: haceDosDias, estado: 'publicado',
    }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'Laura', email: 'laura@x.com', telefono: null, empresa: null,
      estado: 'asistio', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null,
      correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });
    await t.inscripcionRepo.create({
      id: 'i2', eventoId: 'ev2', nombre: 'Ana', email: 'ana@x.com', telefono: null, empresa: null,
      estado: 'asistio', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null,
      correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });

    const conAuth = await request(t.app).post('/jobs/seguimiento-eventos').set('authorization', 'Bearer dev-jobs-secret');
    expect(conAuth.status).toBe(200);
    expect(conAuth.body.eventos).toBe(1);
    expect(conAuth.body.correos).toBe(1);
    const enviados = t.emailSender.enviados.filter((c) => c.asunto.startsWith('Seguimiento'));
    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.html).toContain('Gracias por venir a Ya pasó, Laura');

    // segunda corrida: no repite
    const segunda = await request(t.app).post('/jobs/seguimiento-eventos').set('authorization', 'Bearer dev-jobs-secret');
    expect(segunda.body.correos).toBe(0);
  });

  it('no manda seguimiento si todavía no pasan las horas configuradas', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const haceUnaHora = new Date(Date.now() - 3_600_000);
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Reciente', fechaHora: haceUnaHora, estado: 'publicado',
      mensajeSeguimiento: 'Gracias', horasSeguimiento: 24,
    }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'Laura', email: 'laura@x.com', telefono: null, empresa: null,
      estado: 'asistio', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null,
      correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });
    const res = await request(t.app).post('/jobs/seguimiento-eventos').set('authorization', 'Bearer dev-jobs-secret');
    expect(res.body.correos).toBe(0);
  });
});

describe('eventos → inscritos: edición, borrado, lista negra y export', () => {
  const inscrito = (over: Record<string, unknown> = {}) => ({
    id: 'i1', eventoId: 'ev1', nombre: 'Laura', email: 'laura@x.com', telefono: '5551234567',
    empresa: 'Empresa X', estado: 'registrado' as const, origen: 'publico' as const,
    correoEstado: 'entregado' as const, recordatoriosEnviados: [], ip: '1.2.3.4',
    correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: null,
    deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    ...over,
  });

  const conEvento = async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Webinar', fechaHora: enUnaSemana(), estado: 'publicado', sistema: 'Nóminas',
    }));
    return t;
  };

  it('corrige los datos de un inscrito y guarda las marcas de asistencia real y WhatsApp', async () => {
    const t = await conEvento();
    await t.inscripcionRepo.create(inscrito());
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.post('/app/eventos/ev1/inscritos/i1').type('form').send({
      _csrf: csrf, marcasPresentes: '1', nombre: 'Laura Méndez', empresa: 'Empresa Y',
      email: 'LAURA@X.COM', telefono: '5559999999', asistioReal: 'on', contactadoWsp: 'on',
    });
    expect(res.status).toBe(302);

    const i = t.inscripcionRepo.items[0]!;
    expect(i.nombre).toBe('Laura Méndez');
    expect(i.empresa).toBe('Empresa Y');
    expect(i.telefono).toBe('5559999999');
    expect(i.asistioReal).toBe(true);
    expect(i.contactadoWsp).toBe(true);
    // El correo solo cambió de mayúsculas: se normaliza y el semáforo no se reinicia.
    expect(i.email).toBe('laura@x.com');
    expect(i.correoEstado).toBe('entregado');
  });

  it('al cambiar el correo reinicia el semáforo de entrega y rechaza duplicados del mismo evento', async () => {
    const t = await conEvento();
    await t.inscripcionRepo.create(inscrito());
    await t.inscripcionRepo.create(inscrito({ id: 'i2', email: 'otro@x.com', telefono: null }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const dup = await agent.post('/app/eventos/ev1/inscritos/i1').type('form')
      .send({ _csrf: csrf, email: 'otro@x.com' });
    expect(dup.headers.location).toContain('error=');
    expect(t.inscripcionRepo.items[0]!.email).toBe('laura@x.com');

    await agent.post('/app/eventos/ev1/inscritos/i1').type('form')
      .send({ _csrf: csrf, email: 'nuevo@mailinator.com' });
    const i = t.inscripcionRepo.items[0]!;
    expect(i.email).toBe('nuevo@mailinator.com');
    expect(i.correoEstado).toBe('pendiente');
    expect(i.correoSospechoso).toBe(true); // dominio desechable conocido → 🚩
  });

  it('marca contactadoWsp sin recargar y elimina un inscrito', async () => {
    const t = await conEvento();
    await t.inscripcionRepo.create(inscrito());
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const marcar = await agent.post('/app/eventos/ev1/inscritos/i1/contactado').set('x-csrf-token', csrf).send();
    expect(marcar.status).toBe(200);
    expect(t.inscripcionRepo.items[0]!.contactadoWsp).toBe(true);

    await agent.post('/app/eventos/ev1/inscritos/i1/eliminar').type('form').send({ _csrf: csrf });
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });

  it('manda a la lista negra desde la fila guardando teléfono y quién lo marcó, y lo cruza en el detalle', async () => {
    const t = await conEvento();
    await t.inscripcionRepo.create(inscrito());
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    await agent.post('/app/eventos/ev1/inscritos/i1/lista-negra').type('form')
      .send({ _csrf: csrf, motivo: 'conducta indebida en cámara' });

    const entrada = [...t.listaNegraRepo.items.values()][0]!;
    expect(entrada.email).toBe('laura@x.com');
    expect(entrada.telefono).toBe('5551234567');
    expect(entrada.motivo).toBe('conducta indebida en cámara');
    expect(entrada.marcadoPor).toBe('Admin');

    const detalle = await agent.get('/app/eventos/ev1');
    expect(detalle.text).toContain('conducta indebida en cámara — por Admin');
  });

  it('el 🔁 cruza a quien ya asistió de verdad a otro evento', async () => {
    const t = await conEvento();
    t.eventoRepo.items.set('ev0', new Evento({
      id: 'ev0', titulo: 'Webinar anterior', fechaHora: new Date(Date.now() - 30 * 86_400_000), estado: 'finalizado',
    }));
    await t.inscripcionRepo.create(inscrito({ id: 'i0', eventoId: 'ev0', asistioReal: true }));
    await t.inscripcionRepo.create(inscrito());
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const detalle = await agent.get('/app/eventos/ev1');
    expect(detalle.text).toContain('Ya asistió a: Webinar anterior');
  });

  it('exporta los inscritos a .xlsx', async () => {
    const t = await conEvento();
    await t.inscripcionRepo.create(inscrito());
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.get('/app/eventos/ev1/inscritos.xlsx').responseType('blob');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('inscritos-webinar.xlsx');
    // Un .xlsx es un zip: empieza con la firma "PK".
    expect(res.body.subarray(0, 2).toString()).toBe('PK');
  });

  it('el registro público también bloquea por teléfono en lista negra', async () => {
    const t = await conEvento();
    await t.listaNegraRepo.agregar({
      email: 'viejo@x.com', telefono: '5551234567', motivo: 'spam', marcadoPor: 'Admin', createdAt: new Date(),
    });
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;

    const reg = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Otro Nombre', email: 'nuevo@x.com', telefono: '5551234567' });
    expect(reg.status).toBe(422);
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });
});

describe('registro público — correo o teléfono, y captcha obligatorio', () => {
  const publicar = (t: ReturnType<typeof makeTestApp>) =>
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Webinar', fechaHora: enUnaSemana(), estado: 'publicado',
    }));

  const abrir = async (t: ReturnType<typeof makeTestApp>) => {
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    return { anon, csrf: cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')! };
  };

  it('acepta registrarse solo con teléfono, sin correo', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    publicar(t);
    const { anon, csrf } = await abrir(t);

    const reg = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura Méndez', telefono: '5551234567', asistira: 'Sí' });
    expect(reg.status).toBe(200);
    const i = t.inscripcionRepo.items[0]!;
    expect(i.email).toBeNull();
    expect(i.telefono).toBe('5551234567');
    // Sin correo no se le manda nada: se le contacta por WhatsApp.
    expect(t.emailSender.enviados).toHaveLength(0);
    expect(i.correoEstado).toBeNull();
  });

  it('rechaza si no viene ni correo ni teléfono', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    publicar(t);
    const { anon, csrf } = await abrir(t);

    const reg = await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Laura' });
    expect(reg.status).toBe(422);
    expect(reg.text).toContain('Ingresa al menos un correo o un teléfono');
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });

  it('rechaza un teléfono de relleno', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    publicar(t);
    const { anon, csrf } = await abrir(t);

    const reg = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Bot', telefono: '5555555555' });
    expect(reg.status).toBe(422);
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });

  it('detecta el duplicado por teléfono aunque el correo sea otro', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    publicar(t);
    const { anon, csrf } = await abrir(t);

    await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com', telefono: '5551234567' });
    expect(t.inscripcionRepo.items).toHaveLength(1);

    const dup = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura', email: 'otro@x.com', telefono: '5551234567' });
    expect(dup.status).toBe(422);
    expect(dup.text).toContain('Ya estás registrado');
    expect(t.inscripcionRepo.items).toHaveLength(1);
  });

  it('con Turnstile activo, sin token no registra y lo dice claro', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.captchaVerifier.activo = true;
    publicar(t);
    const { anon, csrf } = await abrir(t);

    const sinToken = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com' });
    expect(sinToken.status).toBe(422);
    expect(sinToken.text).toContain('Falta la verificación anti-bots');
    expect(t.inscripcionRepo.items).toHaveLength(0);

    // Con token, pero que Turnstile rechaza.
    t.captchaVerifier.respuesta = false;
    const tokenMalo = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com', 'cf-turnstile-response': 'xxx' });
    expect(tokenMalo.status).toBe(422);
    expect(tokenMalo.text).toContain('No pudimos verificar que eres una persona real');
    expect(t.inscripcionRepo.items).toHaveLength(0);

    // Con token válido sí pasa.
    t.captchaVerifier.respuesta = true;
    const ok = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com', 'cf-turnstile-response': 'ok' });
    expect(ok.status).toBe(200);
    expect(t.inscripcionRepo.items).toHaveLength(1);
  });
});

describe('página pública de un evento — es una landing, no el sitio navegable', () => {
  it('no ofrece los enlaces públicos (el link se comparte en redes y no debe desviar al prospecto)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Webinar', fechaHora: enUnaSemana(), estado: 'publicado',
    }));

    const pagina = await request(t.app).get('/eventos/ev1');
    expect(pagina.status).toBe(200);
    expect(pagina.text).not.toContain('Base de conocimiento');
    expect(pagina.text).not.toContain('Levantar ticket');

    // Pero el resto del sitio público sí se navega entre sí.
    const lista = await request(t.app).get('/eventos');
    expect(lista.text).toContain('Levantar ticket');
  });

  it('"Volver al CRM" solo aparece con sesión, nunca para un visitante', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Webinar', fechaHora: enUnaSemana(), estado: 'publicado',
    }));

    const anonimo = await request(t.app).get('/eventos/ev1');
    expect(anonimo.text).not.toContain('Volver al CRM');

    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const conSesion = await agent.get('/eventos/ev1');
    expect(conSesion.text).toContain('Volver al CRM');
    // Regresa al evento del que saliste, no al inicio del CRM.
    expect(conSesion.text).toContain('href="/app/eventos/ev1"');
  });

  it('invitación presencial: link personal con pases, el invitado confirma y el CRM lo ve', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set(
      'ev1',
      new Evento({
        id: 'ev1',
        titulo: 'Desayuno DATTASOFT',
        tipo: 'presencial',
        fechaHora: enUnaSemana(),
        estado: 'publicado',
        lugarNombre: 'Hotel Centro',
        lugarDireccion: 'Calle 60, Mérida',
        vestimenta: 'Casual',
        itinerario: [{ hora: '9:00 AM', actividad: 'Café' }],
      }),
    );
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    await admin.agent.post('/app/eventos/ev1/externos').type('form')
      .send({ _csrf: admin.csrf, nombre: 'Juan Pérez', correo: 'juan@x.mx', pases: '3' });
    const token = (await t.eventoRepo.findById('ev1'))!.invitadosExternos[0]!.token!;
    expect(token).toBeTruthy();

    // Enviar desde el CRM: le llega su link personal.
    const env = await admin.agent.post('/app/eventos/ev1/invitaciones/enviar').type('form').send({ _csrf: admin.csrf });
    expect(env.status).toBe(302);
    expect(t.emailSender.enviados.some((c) => c.html.includes(`/eventos/ev1/i/${token}`))).toBe(true);

    const anon = request.agent(t.app);
    const page = await anon.get(`/eventos/ev1/i/${token}`);
    expect(page.status).toBe(200);
    expect(page.text).toContain('Juan Pérez');
    expect(page.text).toContain('Hotel Centro');
    expect(page.text).toContain('3 personas');
    expect(page.text).toContain('data-cuenta-regresiva');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;

    const malo = await anon.post(`/eventos/ev1/i/${token}`).type('form').send({ _csrf: csrf, asistira: 'si', personas: '5' });
    expect(malo.status).toBe(422);

    const ok = await anon.post(`/eventos/ev1/i/${token}`).type('form')
      .send({ _csrf: csrf, asistira: 'si', personas: '2', mensaje: '¡Ahí estaremos!' });
    expect(ok.status).toBe(303);
    const despues = await anon.get(`/eventos/ev1/i/${token}?ok=1`);
    expect(despues.text).toContain('Confirmaste');

    const ev = await t.eventoRepo.findById('ev1');
    expect(ev!.resumenInvitaciones.personas).toBe(2);
    const detalle = await admin.agent.get('/app/eventos/ev1');
    expect(detalle.text).toContain('¡Ahí estaremos!');

    const ics = await anon.get('/eventos/ev1/calendario.ics');
    expect(ics.text).toContain('LOCATION:Hotel Centro\\, Calle 60\\, Mérida');
    expect((await anon.get('/eventos/ev1/i/inventado')).status).toBe(404);
  });

  it('link público de un presencial: sin nombre, pregunta cuántos van y suma al total', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set(
      'ev1',
      new Evento({
        id: 'ev1', titulo: 'Posada DATTASOFT', tipo: 'presencial', fechaHora: enUnaSemana(), estado: 'publicado',
        lugarNombre: 'Salón Jardín', lugarDireccion: 'Calle 20, Mérida', maxPersonasRegistro: 4,
      }),
    );
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    expect(page.text).toContain('¿Cuántos asistirán?');
    expect(page.text).toContain('Confirmar mi asistencia');
    expect(page.text).not.toContain('te enviamos el acceso');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;

    const demas = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura Méndez', email: 'laura@x.mx', asistira: 'Sí', personas: '9' });
    expect(demas.status).toBe(422);
    const ok = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura Méndez', email: 'laura@x.mx', asistira: 'Sí', personas: '3' });
    expect(ok.text).toContain('te esperamos');
    expect(t.inscripcionRepo.items[0]!.personas).toBe(3);
    // El correo de confirmación de un presencial lleva el lugar, no una «liga de acceso».
    const correo = t.emailSender.enviados.at(-1)!;
    expect(correo.html).toContain('Salón Jardín');
    expect(correo.html).not.toContain('Liga de acceso');

    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    await admin.agent.post('/app/eventos/ev1/externos').type('form').send({ _csrf: admin.csrf, nombre: '', pases: '2' });
    const ev = await t.eventoRepo.findById('ev1');
    const sinNombre = await anon.get(`/eventos/ev1/i/${ev!.invitadosExternos[0]!.token}`);
    expect(sinNombre.text).toContain('¡Hola! Te invitamos');
    await anon.post(`/eventos/ev1/i/${ev!.invitadosExternos[0]!.token}`).type('form')
      .send({ _csrf: csrf, asistira: 'si', personas: '2' });
    const detalle = await admin.agent.get('/app/eventos/ev1');
    expect(detalle.text).toContain('Total que van: 5');
  });
});

describe('personas por invitación', () => {
  it('el invitado nuevo nace con las del evento y elige cuántos van en una sola pregunta (o ninguno)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set(
      'ev1',
      new Evento({ id: 'ev1', titulo: 'Posada', tipo: 'presencial', fechaHora: enUnaSemana(), estado: 'publicado', maxPersonasRegistro: 2 }),
    );
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    const detalle = await admin.agent.get('/app/eventos/ev1');
    expect(detalle.text).toMatch(/name="pases" min="1" max="\d+" value="2"/);

    // Sin número propio toma el del evento; con número, el suyo.
    await admin.agent.post('/app/eventos/ev1/externos').type('form').send({ _csrf: admin.csrf, nombre: 'Ana López' });
    await admin.agent.post('/app/eventos/ev1/externos').type('form').send({ _csrf: admin.csrf, nombre: 'Luis Mena', pases: '1' });
    const [ana, luis] = (await t.eventoRepo.findById('ev1'))!.invitadosExternos;
    expect(ana!.pases).toBe(2);
    expect(luis!.pases).toBe(1);

    const anon = request.agent(t.app);
    const page = await anon.get(`/eventos/ev1/i/${ana!.token}`);
    expect(page.text).toContain('Invitación para 2 personas');
    expect(page.text).toContain('Asistiremos 2 personas');
    expect(page.text).toContain('Asistiré solo yo');
    expect(page.text).toContain('Ninguna, no podremos ir');
    expect(page.text).not.toMatch(/name="personas" value="\d" required checked/); // nada preseleccionado
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;

    expect((await anon.post(`/eventos/ev1/i/${ana!.token}`).type('form').send({ _csrf: csrf, personas: '1' })).status).toBe(303);
    let inv = (await t.eventoRepo.findById('ev1'))!.invitadosExternos[0]!;
    expect(inv.respuesta).toBe('asistira');
    expect(inv.personas).toBe(1);
    // Al cambiar su respuesta, queda marcada la que eligió.
    expect((await anon.get(`/eventos/ev1/i/${ana!.token}?cambiar=1`)).text).toMatch(/name="personas" value="1" required checked/);

    expect((await anon.post(`/eventos/ev1/i/${ana!.token}`).type('form').send({ _csrf: csrf, personas: '0' })).status).toBe(303);
    inv = (await t.eventoRepo.findById('ev1'))!.invitadosExternos[0]!;
    expect(inv.respuesta).toBe('no_asistira');
    expect((await t.eventoRepo.findById('ev1'))!.resumenInvitaciones.personas).toBe(0);

    // Con 1 persona: «¡Ahí estaré!» / «No podré ir».
    const unaPersona = await anon.get(`/eventos/ev1/i/${luis!.token}`);
    expect(unaPersona.text).toContain('¡Ahí estaré!');
    expect(unaPersona.text).not.toContain('Asistiremos');
  });
});

describe('agregar muchos invitados', () => {
  const evento = () =>
    new Evento({ id: 'ev1', titulo: 'Posada', tipo: 'presencial', fechaHora: enUnaSemana(), estado: 'publicado', maxPersonasRegistro: 2 });

  it('☑️ varias empresas de la cartera de un jalón, con su contacto principal y sin repetir', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', evento());
    for (const nombre of ['ACME', 'BETA', 'GAMA']) {
      await t.empresaRepo.save(new Empresa({ id: `e-${nombre}`, nombre }));
    }
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    const vista = await admin.agent.get('/app/eventos/ev1');
    expect(vista.text).toContain('name="empresas" value="ACME"');

    await admin.agent.post('/app/eventos/ev1/empresas').type('form').send({ _csrf: admin.csrf, empresaNombre: 'ACME' });
    const r = await admin.agent.post('/app/eventos/ev1/empresas/varias').type('form')
      .send({ _csrf: admin.csrf, empresas: ['ACME', 'BETA', 'GAMA', 'NO EXISTE'], pases: '3' });
    expect(r.status).toBe(302);
    expect(decodeURIComponent(String(r.headers.location))).toContain('Se agregaron 2 empresas · 1 ya estaba invitada');
    const ev = (await t.eventoRepo.findById('ev1'))!;
    expect(ev.invitaciones.map((i) => [i.empresaNombre, i.pases])).toEqual([['ACME', 2], ['BETA', 3], ['GAMA', 3]]);
    expect(ev.invitaciones.every((i) => i.token)).toBe(true);
    // La ya invitada sale deshabilitada en la lista.
    expect((await admin.agent.get('/app/eventos/ev1')).text).toMatch(/value="ACME" disabled/);
  });

  it('📄 cargar lista: una invitación personalizada por renglón y la invitación con nombre no le pide el nombre', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', evento());
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    const r = await admin.agent.post('/app/eventos/ev1/externos/lista').type('form').send({
      _csrf: admin.csrf,
      pases: '1',
      lista: 'nombre,correo,celular,personas\nAna López,ana@x.mx,,4\nLuis Mena,,9997654321,\nAna otra vez,ANA@x.mx,,\nMal,sin-arroba,,',
    });
    expect(r.status).toBe(302);
    const aviso = decodeURIComponent(String(r.headers.location));
    expect(aviso).toContain('Se crearon 2 invitaciones');
    expect(aviso).toContain('1 ya estaba invitado');
    expect(aviso).toContain('no es un correo válido');
    const [ana, luis] = (await t.eventoRepo.findById('ev1'))!.invitadosExternos;
    expect([ana!.nombre, ana!.pases, luis!.nombre, luis!.pases, luis!.telefono]).toEqual(['Ana López', 4, 'Luis Mena', 1, '9997654321']);

    const page = await request(t.app).get(`/eventos/ev1/i/${ana!.token}`);
    expect(page.text).toContain('Ana López');
    expect(page.text).not.toContain('name="nombre"');
  });
});

describe('borrador = para probar', () => {
  it('funciona el link público y el personal, pero no sale en la lista pública de eventos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Posada en pruebas', tipo: 'presencial', fechaHora: enUnaSemana(), estado: 'borrador' }));
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    await admin.agent.post('/app/eventos/ev1/externos').type('form').send({ _csrf: admin.csrf, nombre: 'Erick', correo: 'erick@x.mx' });
    const detalle = await admin.agent.get('/app/eventos/ev1');
    expect(detalle.text).toContain('Enviar a los que faltan');
    expect(detalle.text).toContain('/invitaciones/');

    const anon = request.agent(t.app);
    expect((await anon.get('/eventos')).text).not.toContain('Posada en pruebas');
    const publica = await anon.get('/eventos/ev1');
    expect(publica.text).toContain('data-form-registro-evento');
    const token = (await t.eventoRepo.findById('ev1'))!.invitadosExternos[0]!.token!;
    expect((await anon.get(`/eventos/ev1/i/${token}`)).status).toBe(200);
  });
});

describe('lista de Excel y envío por WhatsApp uno por uno', () => {
  const evento = () =>
    new Evento({ id: 'ev1', titulo: 'Posada', tipo: 'presencial', fechaHora: enUnaSemana(), estado: 'publicado', maxPersonasRegistro: 2 });

  it('⬇ plantilla → se llena → se sube el .xlsx → queda el texto para revisar → se agregan', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', evento());
    const admin = await login(t.app, ADMIN.email, ADMIN.password);

    const plantilla = await admin.agent.get('/app/eventos/plantilla-invitados.xlsx').buffer(true).parse((res, cb) => {
      const partes: Buffer[] = [];
      res.on('data', (c: Buffer) => partes.push(c));
      res.on('end', () => cb(null, Buffer.concat(partes)));
    });
    expect(plantilla.status).toBe(200);
    const { FflateExcelIO } = await import('../../src/infrastructure/excel/FflateExcelIO.js');
    const io = new FflateExcelIO();
    expect(Object.keys((await io.leerVarias(plantilla.body as Buffer)) ?? {})).toEqual(['Invitados']);

    // Lo que llenan los compañeros: nombre con apellido y WhatsApp (sin correo).
    const lleno = await io.escribir(
      'Invitados',
      [{ header: 'Nombre', key: 'n' }, { header: 'Correo', key: 'c' }, { header: 'WhatsApp', key: 'w' }, { header: 'Personas', key: 'p' }],
      [{ n: 'Ana López', c: '', w: '999 123 4567', p: '' }, { n: 'Luis Mena', c: '', w: '9997654321', p: '3' }],
    );
    const r = await admin.agent
      .post('/app/eventos/lista-excel')
      .set('x-csrf-token', admin.csrf)
      .attach('archivo', lleno, 'invitados.xlsx');
    expect(r.status).toBe(200);
    expect(r.body.texto.split('\n')[0]).toBe('Nombre\tCorreo\tWhatsApp\tPersonas');

    await admin.agent.post('/app/eventos/ev1/externos/lista').type('form').send({ _csrf: admin.csrf, lista: r.body.texto });
    const [ana, luis] = (await t.eventoRepo.findById('ev1'))!.invitadosExternos;
    expect([ana!.nombre, ana!.telefono, ana!.pases, luis!.nombre, luis!.pases]).toEqual(['Ana López', '999 123 4567', 2, 'Luis Mena', 3]);

    const malo = await admin.agent.post('/app/eventos/lista-excel').set('x-csrf-token', admin.csrf).attach('archivo', Buffer.from('no soy excel'), 'x.xlsx');
    expect(malo.status).toBe(400);
  });

  it('📤 se envía desde + 💬 uno por uno: marca enviada por WhatsApp y el correo responde al de envío', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const ev = evento();
    ev.agregarInvitadoExterno({ id: 'x1', nombre: 'Ana López', fuente: null, token: 'tok1', telefono: '9991234567', correo: 'ana@x.mx' });
    ev.agregarInvitadoExterno({ id: 'x2', nombre: 'Luis Mena', fuente: null, token: 'tok2', telefono: '9997654321' });
    t.eventoRepo.items.set('ev1', ev);
    const admin = await login(t.app, ADMIN.email, ADMIN.password);

    let page = await admin.agent.get('/app/eventos/ev1');
    expect(page.text).toContain('Mandar por WhatsApp uno por uno (2)');
    expect(page.text).toContain('sin anotar');

    const mal = await admin.agent.post('/app/eventos/ev1/envio').type('form').send({ _csrf: admin.csrf, envioWhatsapp: '123', envioCorreo: '' });
    expect(decodeURIComponent(String(mal.headers.location))).toContain('10 dígitos');
    await admin.agent.post('/app/eventos/ev1/envio').type('form').send({ _csrf: admin.csrf, envioWhatsapp: '999 111 2233', envioCorreo: 'Eventos@Dattasoft.mx' });
    page = await admin.agent.get('/app/eventos/ev1');
    expect(page.text).toContain('999 111 2233');
    expect(page.text).toContain('data-envio-wsp="999 111 2233"');

    const m = await admin.agent.post('/app/eventos/ev1/invitaciones/x2/whatsapp').set('x-csrf-token', admin.csrf);
    expect(m.body).toEqual({ ok: true });
    const luis = (await t.eventoRepo.findById('ev1'))!.buscarInvitado('x2')!;
    expect(luis.enviadaWspAt).toBeTruthy();
    expect(luis.contactado).toBe(true);
    page = await admin.agent.get('/app/eventos/ev1');
    expect(page.text).toContain('Mandar por WhatsApp uno por uno (1)');
    expect(page.text).toContain('💬 Enviada');

    await admin.agent.post('/app/eventos/ev1/invitaciones/x1/enviar').type('form').send({ _csrf: admin.csrf });
    expect(t.emailSender.enviados.at(-1)?.responderA).toEqual({ email: 'eventos@dattasoft.mx' });
  });
});

describe('link abierto — una sola pregunta de asistencia', () => {
  it('con 3 personas por invitación ofrece 3, 2, solo yo, no y tal vez; guarda personas', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Posada', fechaHora: enUnaSemana(), estado: 'publicado', maxPersonasRegistro: 3,
    }));
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    expect(page.text).toContain('Asistiremos 3 personas');
    expect(page.text).toContain('Asistiremos 2 personas');
    expect(page.text).toContain('Asistiré solo yo');
    expect(page.text).not.toContain('Asistiremos 4 personas');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    const reg = await anon.post('/eventos/ev1').type('form').send({
      _csrf: csrf, nombre: 'Pedro', email: 'pedro@x.com', asistencia: '2',
    });
    expect(reg.status).toBe(200);
    expect(t.inscripcionRepo.items[0]).toMatchObject({ asistira: 'Sí', personas: 2 });
  });

  it('con 1 persona solo pregunta sí / no / tal vez', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Uno', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    expect(page.text).not.toContain('Asistiremos');
    expect(page.text).toContain('Sí, ahí estaré');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Ana', email: 'ana@x.com', asistencia: 'No' });
    expect(t.inscripcionRepo.items[0]!.asistira).toBe('No');
  });
});

describe('link abierto — lista para mandar el link por WhatsApp y correo', () => {
  it('carga la lista, la muestra con «Se envía desde», manda por correo y marca WhatsApp', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Posada', tipo: 'presencial', fechaHora: enUnaSemana(), estado: 'publicado',
      lugarNombre: 'Salón Jardín', envioWhatsapp: '999 111 2233', envioCorreo: 'eventos@ejemplo.mx',
    }));
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    const carga = await admin.agent.post('/app/eventos/ev1/difusion/lista').type('form').send({
      _csrf: admin.csrf,
      lista: 'Nombre\tCorreo\tWhatsApp\nAna López\tana@x.mx\t9991234567\nBeto\t\t9997654321\nAna otra vez\tana@x.mx\t',
    });
    expect(carga.headers.location).toContain('tab=abierto');
    const ev = t.eventoRepo.items.get('ev1')!;
    expect(ev.difusion).toHaveLength(2);
    // Ninguno se vuelve invitado con nombre: es la lista del link abierto.
    expect(ev.invitadosExternos).toHaveLength(0);

    const pagina = await admin.agent.get('/app/eventos/ev1');
    expect(pagina.text).toContain('Mandar el link a una lista (2)');
    expect(pagina.text).toContain('Mandar por WhatsApp uno por uno (2)');
    expect(pagina.text).toContain('Enviar por correo a los que faltan (1)');
    expect(pagina.text).toContain('ev-envio-form-abierto');
    // El WhatsApp lleva encabezado y el link abierto.
    expect(decodeURIComponent(pagina.text)).toContain('Invitación de DATTASOFT');

    await admin.agent.post('/app/eventos/ev1/difusion/enviar').type('form').send({ _csrf: admin.csrf });
    const correo = t.emailSender.enviados.at(-1)!;
    expect(correo.para[0]!.email).toBe('ana@x.mx');
    expect(correo.html).toContain('Invitación de DATTASOFT');
    expect(correo.html).toContain('/eventos/ev1"');
    expect(correo.html).toContain('Registrarme y confirmar');
    expect(t.eventoRepo.items.get('ev1')!.difusion[0]!.enviadaAt).not.toBeNull();

    const beto = t.eventoRepo.items.get('ev1')!.difusion[1]!;
    const wsp = await admin.agent.post(`/app/eventos/ev1/difusion/${beto.id}/whatsapp`).set('x-csrf-token', admin.csrf);
    expect(wsp.body).toEqual({ ok: true });
    expect(t.eventoRepo.items.get('ev1')!.difusion[1]!.enviadaWspAt).not.toBeNull();

    await admin.agent.post('/app/eventos/ev1/difusion').type('form').send({ _csrf: admin.csrf, nombre: 'Caro', telefono: '123' });
    expect(t.eventoRepo.items.get('ev1')!.difusion).toHaveLength(2);
    await admin.agent.post('/app/eventos/ev1/difusion').type('form').send({ _csrf: admin.csrf, nombre: 'Caro', telefono: '999 000 1111' });
    expect(t.eventoRepo.items.get('ev1')!.difusion).toHaveLength(3);

    await admin.agent.post('/app/eventos/ev1/difusion/vaciar').type('form').send({ _csrf: admin.csrf });
    expect(t.eventoRepo.items.get('ev1')!.difusion).toHaveLength(0);
  });
});

describe('eventos — 📢 comunicado (link de CONTPAQi)', () => {
  const LINK = 'https://www.contpaqi.com/comunicados/cambios-cfdi';

  it('se crea pegando el link (sin fecha); sin link no se guarda y sin https se le agrega', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const form = await agent.get('/app/eventos/nuevo');
    expect(form.text).toContain('📢 Comunicado');
    expect(form.text).toContain('name="urlComunicado"');

    const sinLink = await agent.post('/app/eventos').type('form').send({ _csrf: csrf, titulo: 'Cambios CFDI', tipo: 'comunicado' });
    expect(sinLink.status).toBe(422);
    expect(sinLink.text).toContain('Pega aquí el link que te pasó CONTPAQi');

    const ok = await agent.post('/app/eventos').type('form')
      .send({ _csrf: csrf, titulo: 'Cambios CFDI', tipo: 'comunicado', urlComunicado: ' www.contpaqi.com/comunicados/cfdi ' });
    expect(ok.status).toBe(302);
    const ev = [...t.eventoRepo.items.values()][0]!;
    expect(ev.tipo).toBe('comunicado');
    expect(ev.urlComunicado).toBe('https://www.contpaqi.com/comunicados/cfdi');
    expect(ev.pideConfirmacion).toBe(false);

    const malo = await agent.post(`/app/eventos/${ev.id}`).type('form')
      .send({ _csrf: csrf, titulo: 'Cambios CFDI', tipo: 'comunicado', urlComunicado: 'no es un link' });
    expect(malo.status).toBe(422);
  });

  it('se manda con el link: el personal marca «la abrió» y lleva a CONTPAQi; el abierto es el link tal cual', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set(
      'ev1',
      new Evento({ id: 'ev1', titulo: 'Cambios CFDI', tipo: 'comunicado', urlComunicado: LINK, fechaHora: new Date(), estado: 'publicado' }),
    );
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    await admin.agent.post('/app/eventos/ev1/externos').type('form').send({ _csrf: admin.csrf, nombre: 'Ana López', correo: 'ana@x.mx' });
    const token = t.eventoRepo.items.get('ev1')!.invitadosExternos[0]!.token!;

    await admin.agent.post('/app/eventos/ev1/invitaciones/enviar').type('form').send({ _csrf: admin.csrf });
    const correo = t.emailSender.enviados.at(-1)!;
    expect(correo.asunto).toBe('Comunicado: Cambios CFDI');
    expect(correo.html).toContain('Comunicado de DATTASOFT');
    expect(correo.html).toContain('Ver el comunicado');
    expect(correo.html).toContain(`/eventos/ev1/i/${token}`);
    expect(correo.html).not.toContain('Te esperamos');

    const abre = await request(t.app).get(`/eventos/ev1/i/${token}`);
    expect(abre.status).toBe(302);
    expect(abre.headers.location).toBe(LINK);
    expect(t.eventoRepo.items.get('ev1')!.invitadosExternos[0]!.abiertaAt).not.toBeNull();
    expect((await request(t.app).get('/eventos/ev1')).headers.location).toBe(LINK);
    expect((await request(t.app).get('/eventos')).text).not.toContain('Cambios CFDI');

    const pagina = await admin.agent.get('/app/eventos/ev1');
    expect(pagina.text).toContain('Revisa el link del comunicado');
    expect(pagina.text).toContain(`value="${LINK}"`);
    const texto = decodeURIComponent(pagina.text);
    expect(texto).toContain('Comunicado de DATTASOFT');
    expect(texto).not.toContain('Te esperamos');

    await admin.agent.post('/app/eventos/ev1/difusion').type('form').send({ _csrf: admin.csrf, nombre: 'Beto', correo: 'beto@x.mx' });
    await admin.agent.post('/app/eventos/ev1/difusion/enviar').type('form').send({ _csrf: admin.csrf });
    const alAbierto = t.emailSender.enviados.at(-1)!;
    expect(alAbierto.para[0]!.email).toBe('beto@x.mx');
    expect(alAbierto.html).toContain(`href="${LINK}"`);
  });
});

describe('eventos — página principal', () => {
  it('arriba las tarjetas de cada tipo y abajo un recuadro por tipo con sus eventos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('w1', new Evento({ id: 'w1', titulo: 'Webinar de Nóminas', tipo: 'webinar', fechaHora: enUnaSemana() }));
    t.eventoRepo.items.set('c1', new Evento({ id: 'c1', titulo: 'Cambios CFDI', tipo: 'comunicado', urlComunicado: 'https://www.contpaqi.com/x', fechaHora: new Date() }));
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent.get('/app/eventos');
    expect(res.status).toBe(200);
    for (const tipo of ['webinar', 'presencial', 'felicitacion', 'comunicado']) {
      expect(res.text).toContain(`href="/app/eventos/nuevo?tipo=${tipo}"`);
      expect(res.text).toContain(`id="tipo-${tipo}"`);
    }
    const webinars = res.text.slice(res.text.indexOf('id="tipo-webinar"'), res.text.indexOf('id="tipo-presencial"'));
    expect(webinars).toContain('Webinar de Nóminas');
    expect(webinars).not.toContain('Cambios CFDI');
    expect(res.text.slice(res.text.indexOf('id="tipo-comunicado"'))).toContain('Cambios CFDI');
    // La tarjeta abre el formulario con ese tipo ya elegido.
    const form = await agent.get('/app/eventos/nuevo?tipo=comunicado');
    expect(form.text).toMatch(/value="comunicado"\s+checked/);
    // Los ejemplos en gris y los títulos son del tipo elegido, no de la Posada.
    expect(form.text).toContain('placeholder="Ej. Cambios en CFDI 4.0 — Diciembre"');
    expect(form.text).toContain('>Nombre del comunicado</span>');
    expect(form.text).not.toContain('placeholder="Ej. Posada');
    expect(form.text).toContain('data-ph-presencial="Ej. Posada DATTASOFT 2026"');
  });
});

describe('🔔 aviso al equipo de cada registro', () => {
  const evento = () =>
    new Evento({ id: 'ev1', titulo: 'Posada', tipo: 'presencial', fechaHora: enUnaSemana(), estado: 'publicado', maxPersonasRegistro: 3, creadoPorUid: ADMIN.uid });

  it('registro en el link abierto: sin correos anotados avisa a quien creó el evento, con total que van', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', evento());
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    const reg = await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Pedro Gómez', telefono: '9991234567', asistencia: '2' });
    expect(reg.status).toBe(200);
    const aviso = t.emailSender.enviados.find((c) => c.asunto.startsWith('🎟 Nuevo registro'));
    expect(aviso?.asunto).toBe('🎟 Nuevo registro: Pedro Gómez (2 personas) – Posada');
    expect(aviso?.para.map((p) => p.email)).toEqual([ADMIN.email]);
    expect(aviso?.html).toContain('9991234567');
    expect(aviso?.html).toContain('Total que van hasta ahora: 2');
  });

  it('se anotan varios correos en ⚙️ Configuración de envío y ahí llega el aviso al confirmar con link personal', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const ev = evento();
    ev.agregarInvitadoExterno({ id: 'x1', nombre: 'Ana López', fuente: null, token: 'tok1', correo: 'ana@x.mx' });
    t.eventoRepo.items.set('ev1', ev);
    const admin = await login(t.app, ADMIN.email, ADMIN.password);

    const mal = await admin.agent.post('/app/eventos/ev1/envio').type('form')
      .send({ _csrf: admin.csrf, envioWhatsapp: '', envioCorreo: '', avisarRegistros: 'gelmi@dattasoft.mx, nada' });
    expect(decodeURIComponent(String(mal.headers.location))).toContain('no parece un correo');
    await admin.agent.post('/app/eventos/ev1/envio').type('form')
      .send({ _csrf: admin.csrf, envioWhatsapp: '', envioCorreo: '', avisarRegistros: 'Gelmi@dattasoft.mx; erick@dattasoft.mx' });
    const page = await admin.agent.get('/app/eventos/ev1');
    expect(page.text).toContain('gelmi@dattasoft.mx, erick@dattasoft.mx');

    const anon = request.agent(t.app);
    const inv = await anon.get('/eventos/ev1/i/tok1');
    const csrf = cookieValor(inv.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    const r = await anon.post('/eventos/ev1/i/tok1').type('form').send({ _csrf: csrf, personas: '3', mensaje: 'Ahí estaremos' });
    expect(r.status).toBe(303);
    const aviso = t.emailSender.enviados.find((c) => c.asunto.startsWith('✅ Confirmó'));
    expect(aviso?.asunto).toBe('✅ Confirmó: Ana López (3 personas) – Posada');
    expect(aviso?.para.map((p) => p.email)).toEqual(['gelmi@dattasoft.mx', 'erick@dattasoft.mx']);
    expect(aviso?.html).toContain('Ahí estaremos');
    expect(aviso?.html).toContain('Total que van hasta ahora: 3');
  });

  it('a quien confirma con su link personal le llega «Confirmado»; si dice que no, no', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const ev = evento();
    ev.lugarNombre = 'Salón Los Arcos';
    ev.agregarInvitadoExterno({ id: 'x1', nombre: 'Ana López', fuente: null, token: 'tok1', correo: 'ana@x.mx' });
    ev.agregarInvitadoExterno({ id: 'x2', nombre: 'Luis Mena', fuente: null, token: 'tok2', correo: 'luis@x.mx' });
    t.eventoRepo.items.set('ev1', ev);
    const anon = request.agent(t.app);
    const inv = await anon.get('/eventos/ev1/i/tok1');
    const csrf = cookieValor(inv.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;

    await anon.post('/eventos/ev1/i/tok1').type('form').send({ _csrf: csrf, personas: '2' });
    const conf = t.emailSender.enviados.find((c) => c.asunto === 'Confirmado: Posada');
    expect(conf?.para.map((p) => p.email)).toEqual(['ana@x.mx']);
    expect(conf?.html).toContain('Asistirán 2 personas');
    expect(conf?.html).toContain('Salón Los Arcos');
    expect(conf?.html).toContain('/eventos/ev1/i/tok1');

    await anon.post('/eventos/ev1/i/tok2').type('form').send({ _csrf: csrf, personas: '0' });
    expect(t.emailSender.enviados.filter((c) => c.asunto === 'Confirmado: Posada')).toHaveLength(1);
    expect(t.emailSender.enviados.some((c) => c.asunto.startsWith('❌ No podrá ir: Luis Mena'))).toBe(true);
  });

  it('si el correo del aviso falla, el registro igual queda', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', evento());
    const original = t.emailSender.enviar.bind(t.emailSender);
    t.emailSender.enviar = async (c) => {
      if (c.asunto.startsWith('🎟')) throw new Error('Brevo caído');
      return original(c);
    };
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    const reg = await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Pedro', email: 'pedro@x.com', asistencia: 'Sí' });
    expect(reg.status).toBe(200);
    expect(t.inscripcionRepo.items).toHaveLength(1);
  });
});
