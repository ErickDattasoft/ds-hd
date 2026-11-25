import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';

const SUP = { uid: 'u-sup', email: 'sup@dattasoft.mx', password: 'super12345', nombre: 'Sup', rol: 'supervisor' as const };
const AG = { uid: 'u-ag', email: 'ag@dattasoft.mx', password: 'agente12345', nombre: 'Agente', rol: 'agente' as const };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

describe('🗒️ Mis notas', () => {
  it('crear, escribir, cambiar color, ver, borrar; cada quien ve solo las suyas', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const post = (url: string, body: object) => agent.post(url).set('x-csrf-token', csrf).send(body);

    const nueva = await post('/app/notas', { texto: '' });
    expect(nueva.body.ok).toBe(true);
    const id = nueva.body.nota.id as string;
    const esc = await post('/app/notas', { id, texto: 'CANUL Y ASOCIADOS - ALFONSO 28/10/2026\nNo abre' });
    expect(esc.body.nota.texto).toContain('CANUL');
    await post('/app/notas', { id, color: 'morado' });
    await post('/app/notas', { id, color: 'no-existe' });
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)).toEqual([
      expect.objectContaining({ id, color: 'morado', texto: 'CANUL Y ASOCIADOS - ALFONSO 28/10/2026\nNo abre' }),
    ]);

    const vista = await agent.get('/app/notas');
    expect(vista.status).toBe(200);
    expect(vista.text).toContain('nota--morado');
    expect(vista.text).toContain('CANUL Y ASOCIADOS');
    expect(vista.text).toContain('action="/app/tickets/captura"');

    const ag = await login(t.app, AG.email, AG.password);
    const suya = await ag.agent.get('/app/notas');
    expect(suya.text).not.toContain('CANUL Y ASOCIADOS');
    const ajena = await ag.agent.post('/app/notas').set('x-csrf-token', ag.csrf).send({ id, texto: 'hackeo' });
    expect(ajena.status).toBe(422);

    await post(`/app/notas/${id}/eliminar`, {});
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)![0]!.eliminadaEn).toBeInstanceOf(Date);
  });

  it('🗑️ papelera: borrar, deshacer/restaurar, borrar para siempre; se purga sola a los 30 días', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const post = (url: string, body: object = {}) => agent.post(url).set('x-csrf-token', csrf).send(body);
    const id = (await post('/app/notas', { texto: 'llamar a CANUL' })).body.nota.id as string;

    await post(`/app/notas/${id}/eliminar`);
    let vista = await agent.get('/app/notas');
    expect(vista.text).toContain('data-nota-borrada');
    expect(vista.text).toContain('quedan 30 días');
    expect((await post('/app/notas', { id, texto: 'editar borrada' })).status).toBe(422);

    expect((await post(`/app/notas/${id}/restaurar`)).body.ok).toBe(true);
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)![0]!.eliminadaEn).toBeNull();

    // Borrar para siempre solo desde la papelera.
    await post(`/app/notas/${id}/borrar-definitivo`);
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)).toHaveLength(1);
    await post(`/app/notas/${id}/eliminar`);
    await post(`/app/notas/${id}/borrar-definitivo`);
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)).toHaveLength(0);

    // Una nota que lleva más de 30 días en la papelera desaparece en el siguiente guardado.
    const vieja = (await post('/app/notas', { texto: 'vieja' })).body.nota.id as string;
    await post(`/app/notas/${vieja}/eliminar`);
    t.notaPersonalRepo.porUid.get(SUP.uid)![0]!.eliminadaEn = new Date(Date.now() - 31 * 86_400_000);
    await post('/app/notas', { texto: 'nueva' });
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)!.map((n) => n.texto)).toEqual(['nueva']);
    vista = await agent.get('/app/notas');
    expect(vista.text).not.toContain('vieja');

    // La bitácora anota las acciones, SIN el texto de las notas.
    const bit = await t.bitacoraRepo.listar({ modulo: 'notas' });
    expect(bit.map((b) => b.accion)).toEqual(expect.arrayContaining(['crear', 'archivar', 'restaurar', 'eliminar_definitivo']));
    expect(JSON.stringify(bit)).not.toContain('CANUL');
  });

  it('📌 fijar sale primero; ⏰ recordatorio de hoy sale en el Dashboard', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const post = (body: object) => agent.post('/app/notas').set('x-csrf-token', csrf).send(body);
    const a = (await post({ texto: 'PRIMERA fijada' })).body.nota.id as string;
    await post({ texto: 'SEGUNDA normal' });
    await post({ id: a, fijada: true });

    const vista = await agent.get('/app/notas');
    expect(vista.text.indexOf('PRIMERA fijada')).toBeLessThan(vista.text.indexOf('SEGUNDA normal'));
    expect(vista.text).toContain('nota--fijada');

    expect((await post({ id: a, recordarEn: '31-12-2026' })).status).toBe(422);
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
    const r = await post({ id: a, recordarEn: hoy });
    expect(r.body.nota.recordatorio).toMatchObject({ texto: 'Hoy', estado: 'hoy' });
    const dash = await agent.get('/app');
    expect(dash.text).toContain('Recordatorios de tus notas');
    expect(dash.text).toContain('PRIMERA fijada');

    await post({ id: a, recordarEn: '' });
    expect((await agent.get('/app')).text).not.toContain('Recordatorios de tus notas');
  });

  it('🎫 la nota que pasa por Captura rápida queda marcada con su ticket y se aparta', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const id = (await agent.post('/app/notas').set('x-csrf-token', csrf).send({ texto: 'EMPRESA X - 27/10/2026\nRevisar timbrado' })).body.nota.id as string;

    const rev = await agent.post('/app/tickets/captura').type('form').send({ _csrf: csrf, texto: 'EMPRESA X - 27/10/2026\nRevisar timbrado', notaId: id });
    expect(rev.text).toContain(`data-nota-id="${id}"`);
    expect(rev.text).toContain('Viene de');

    const c = await agent.post('/app/tickets/captura/crear').set('x-csrf-token', csrf)
      .send({ tipo: 'General', asunto: 'Revisar timbrado', descripcion: 'Revisar timbrado', estado: 'Resuelto', notaId: id });
    expect(c.body.ok).toBe(true);
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)![0]!.tickets).toEqual([{ id: c.body.id, numero: c.body.numero }]);

    const vista = await agent.get('/app/notas');
    expect(vista.text).toContain('Ya convertidas en ticket');
    expect(vista.text).toContain(`🎫 #${c.body.numero}`);
    const bit = await t.bitacoraRepo.listar({ modulo: 'notas' });
    expect(bit.some((b) => b.resumen.includes(`#${c.body.numero}`))).toBe(true);
  });

  it('🗒️ la nota rápida (Alt+N) está en todas las pantallas', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent } = await login(t.app, SUP.email, SUP.password);
    const res = await agent.get('/app/tickets');
    expect(res.text).toContain('data-nota-rapida');
    expect(res.text).toContain('data-nota-rapida-abrir');
  });

  it('una nota demasiado larga se rechaza', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const r = await agent.post('/app/notas').set('x-csrf-token', csrf).send({ texto: 'x'.repeat(10_001) });
    expect(r.status).toBe(422);
  });

  it('texto y color guardados al mismo tiempo (y dos notas a la vez) no se pisan', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const post = (body: object) => agent.post('/app/notas').set('x-csrf-token', csrf).send(body);
    const a = (await post({ texto: '' })).body.nota.id as string;
    const b = (await post({ texto: '' })).body.nota.id as string;

    await Promise.all([post({ id: a, texto: 'texto de A' }), post({ id: a, color: 'rosa' }), post({ id: b, texto: 'texto de B' })]);

    const notas = t.notaPersonalRepo.porUid.get(SUP.uid)!;
    expect(notas.find((n) => n.id === a)).toMatchObject({ texto: 'texto de A', color: 'rosa' });
    expect(notas.find((n) => n.id === b)).toMatchObject({ texto: 'texto de B' });
  });

  it('si todas las notas ya no caben en el documento, avisa en vez de fallar', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const post = (body: object) => agent.post('/app/notas').set('x-csrf-token', csrf).send(body);
    // Cada nota de 10 mil letras ocupa ~10 KB: unas 88 caben en los 900 KB.
    let guardadas = 0;
    let r = await post({ texto: 'x'.repeat(10_000) });
    while (r.status === 200 && guardadas < 200) {
      guardadas++;
      r = await post({ texto: 'x'.repeat(10_000) });
    }
    expect(guardadas).toBeGreaterThan(80);
    expect(guardadas).toBeLessThan(90);
    expect(r.status).toBe(422);
    expect(r.body.detalle).toContain('muy llenas');
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)).toHaveLength(guardadas);
  });
});

describe('🗒️ Mis notas en el respaldo', () => {
  it('el respaldo las lleva y al restaurar regresan', async () => {
    const ADMIN = { uid: 'u-adm', email: 'adm@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/notas').set('x-csrf-token', csrf).send({ texto: 'EXAMEN FE', color: 'azul' });

    const res = await agent.get('/app/configuracion/backup/descargar');
    const datos = JSON.parse(res.text);
    expect(datos.notasPersonales).toEqual([
      { uid: ADMIN.uid, notas: [expect.objectContaining({ texto: 'EXAMEN FE', color: 'azul' })] },
    ]);

    t.notaPersonalRepo.porUid.clear();
    const r = await agent.post('/app/configuracion/backup/restaurar').set('x-csrf-token', csrf).send(datos);
    expect(r.body.ok).toBe(true);
    expect(t.notaPersonalRepo.porUid.get(ADMIN.uid)?.[0]).toMatchObject({ texto: 'EXAMEN FE', color: 'azul' });
  });
});

describe('🖼 imágenes en Mis notas', () => {
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  it('subir, verla solo su dueño, quitarla; al borrar la nota para siempre se borran sus imágenes', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const post = (url: string, body: object = {}) => agent.post(url).set('x-csrf-token', csrf).send(body);
    const id = (await post('/app/notas', { texto: 'con captura' })).body.nota.id as string;

    const sub = await post(`/app/notas/${id}/imagenes`, { nombre: 'error.png', contentType: 'image/png', base64: PNG });
    expect(sub.body.ok).toBe(true);
    const url = sub.body.imagen.url as string;
    expect((await post(`/app/notas/${id}/imagenes`, { nombre: 'x.svg', contentType: 'image/svg+xml', base64: PNG })).status).toBe(422);

    const img = await agent.get(url);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toBe('image/png');
    expect(img.headers['cache-control']).toContain('immutable');
    const ajeno = await login(t.app, AG.email, AG.password);
    expect((await ajeno.agent.get(url)).status).toBe(404);

    const vista = await agent.get('/app/notas');
    expect(vista.text).toContain(url);

    // Una segunda imagen, quitar la primera.
    const otra = (await post(`/app/notas/${id}/imagenes`, { nombre: 'b.png', contentType: 'image/png', base64: PNG })).body.imagen.id as string;
    await post(`/app/notas/${id}/imagenes/${sub.body.imagen.id}/eliminar`);
    expect(t.notaImagenRepo.items.has(sub.body.imagen.id)).toBe(false);
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)![0]!.imagenes.map((i) => i.id)).toEqual([otra]);

    // Papelera: la imagen sigue (se puede restaurar); borrada para siempre, se va.
    await post(`/app/notas/${id}/eliminar`);
    expect(t.notaImagenRepo.items.has(otra)).toBe(true);
    await post(`/app/notas/${id}/borrar-definitivo`);
    expect(t.notaImagenRepo.items.size).toBe(0);
  });

  it('máximo 10 por nota; al volverse ticket, las imágenes van como adjuntos del ticket', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const post = (url: string, body: object = {}) => agent.post(url).set('x-csrf-token', csrf).send(body);
    const id = (await post('/app/notas', { texto: 'EMPRESA X - 27/10/2026\nError al timbrar' })).body.nota.id as string;
    for (let i = 0; i < 10; i++) expect((await post(`/app/notas/${id}/imagenes`, { nombre: `c${i}.png`, contentType: 'image/png', base64: PNG })).body.ok).toBe(true);
    const once = await post(`/app/notas/${id}/imagenes`, { nombre: 'c10.png', contentType: 'image/png', base64: PNG });
    expect(once.status).toBe(422);
    expect(t.notaImagenRepo.items.size).toBe(10); // la que no cupo no se queda huérfana

    const c = await post('/app/tickets/captura/crear', { tipo: 'General', asunto: 'Error al timbrar', estado: 'Resuelto', notaId: id });
    expect(c.body.ok).toBe(true);
    const adjuntos = await t.adjuntoTicketRepo.listarPorTicket(c.body.id);
    expect(adjuntos).toHaveLength(10);
    // Un segundo ticket de la misma nota ya no las repite.
    const c2 = await post('/app/tickets/captura/crear', { tipo: 'General', asunto: 'Otra cosa', estado: 'Resuelto', notaId: id });
    expect(await t.adjuntoTicketRepo.listarPorTicket(c2.body.id)).toHaveLength(0);
  });
});
