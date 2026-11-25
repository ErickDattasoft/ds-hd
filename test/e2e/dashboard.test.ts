import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { Evento } from '../../src/core/entities/Evento.js';
import { Ticket } from '../../src/core/entities/Ticket.js';

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
    // el logo de empresa va en el sidebar de ambas áreas (staff y portal)
    expect(dash.text).toContain('data-logo-img');
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

  it('el stat "Empresas" cuenta las empresas activas', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Activa Uno' }));
    t.empresaRepo.items.set('e2', new Empresa({ id: 'e2', nombre: 'Activa Dos' }));
    t.empresaRepo.items.set('e3', new Empresa({ id: 'e3', nombre: 'Archivada', activa: false }));
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const dash = await agent.get('/app');
    expect(dash.status).toBe(200);
    expect(dash.text).toContain('Empresas');
    expect(dash.text).toMatch(/stat__num">2<\/span><span class="stat__lbl">🏢 Empresas/);
  });

  it('trae las tarjetas y listas del dashboard del viejo', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Timbrado falla', descripcion: 'descripción suficiente', tipo: 'General', prioridad: 'Media',
    });
    await agent.post('/app/tareas').type('form').send({ _csrf: csrf, titulo: 'Llamar a ACME', asignadoAUid: ADMIN.uid });

    const dash = await agent.get('/app');
    expect(dash.text).toContain('🎫 Total tickets');
    expect(dash.text).toContain('👥 Contactos');
    expect(dash.text).toContain('/app/empresas?pendientes=versiones');
    expect(dash.text).toContain('Tickets recientes');
    expect(dash.text).toContain('Timbrado falla');
    expect(dash.text).toContain('Licencias por vencer');
    expect(dash.text).toContain('Tickets abiertos más de 5 días');
    expect(dash.text).toContain('Llamar a ACME');
  });

  it('el calendario muestra las tareas de todo el equipo y marca las vencidas', async () => {
    const OTRO = { uid: 'u-b', email: 'beto@dattasoft.mx', password: 'beto12345', nombre: 'Beto', rol: 'agente' as const };
    const t = makeTestApp({ usuarios: [ADMIN, OTRO] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const hoy = new Date();
    const ayer = new Date(hoy.getTime() - 86_400_000);
    const iso = (d: Date) => d.toLocaleDateString('en-CA');
    await agent.post('/app/tareas').type('form').send({ _csrf: csrf, titulo: 'Tarea de Beto', asignadoAUid: OTRO.uid, vence: iso(hoy) });
    await agent.post('/app/tareas').type('form').send({ _csrf: csrf, titulo: 'Tarea atrasada', asignadoAUid: ADMIN.uid, vence: iso(ayer) });

    const mes = `${ayer.getFullYear()}-${ayer.getMonth() + 1}`;
    const cal = await agent.get(`/app/calendario?mes=${mes}`);
    expect(cal.text).toContain('Tarea atrasada');
    expect(cal.text).toContain('cal-ev--tarea-vencida');
    const calHoy = await agent.get(`/app/calendario?mes=${hoy.getFullYear()}-${hoy.getMonth() + 1}`);
    expect(calHoy.text).toContain('Tarea de Beto (Beto)');
  });
});

describe('dashboard — próximos eventos', () => {
  it('incluye los borradores marcados «en preparación»; no los ejemplos, comunicados ni cancelados', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const en = (dias: number) => new Date(Date.now() + dias * 86_400_000);
    const evs = [
      new Evento({ id: 'p1', titulo: 'POSADA DATTASOFT', tipo: 'presencial', fechaHora: en(20), estado: 'borrador' }),
      new Evento({ id: 'w1', titulo: 'Webinar Nóminas', tipo: 'webinar', fechaHora: en(5), estado: 'publicado' }),
      new Evento({ id: 'x1', titulo: 'Ejemplo prueba', fechaHora: en(3), estado: 'publicado', esPrueba: true }),
      new Evento({ id: 'k1', titulo: 'Evento cancelado', fechaHora: en(3), estado: 'cancelado' }),
      new Evento({ id: 'c1', titulo: 'Comunicado CFDI', tipo: 'comunicado', urlComunicado: 'https://contpaqi.com/x', fechaHora: en(1), estado: 'publicado' }),
      new Evento({ id: 'l1', titulo: 'Muy lejano', fechaHora: en(60), estado: 'publicado' }),
    ];
    for (const e of evs) t.eventoRepo.items.set(e.id, e);
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const dash = await agent.get('/app');
    const tarjeta = dash.text.slice(dash.text.indexOf('Próximos eventos'), dash.text.indexOf('Próximos eventos') + 1500);
    expect(tarjeta).toContain('POSADA DATTASOFT');
    expect(tarjeta).toContain('📝 en preparación');
    expect(tarjeta).toContain('Webinar Nóminas');
    expect(tarjeta.indexOf('Webinar Nóminas')).toBeLessThan(tarjeta.indexOf('POSADA DATTASOFT'));
    for (const no of ['Ejemplo prueba', 'Evento cancelado', 'Comunicado CFDI', 'Muy lejano']) expect(tarjeta).not.toContain(no);
  });
});

describe('dashboard — tarjetas de soporte', () => {
  it('«💬 Respuestas sin leer» y «👤 Mis tickets» (solo los asignados a quien entra)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN, AGENTE] });
    const nuevo = (id: string, numero: number, asunto: string, uid: string | null) => {
      const tk = Ticket.crear({
        id, numero, asunto, descripcion: 'descripción del problema', tipo: 'General', prioridad: 'Media',
        estadoInicial: 'Abierto', canal: 'interno', ahora: new Date(Date.now() - 3 * 86_400_000),
      });
      if (uid) tk.asignar(uid, uid === ADMIN.uid ? 'Admin' : 'Agente', new Date());
      t.ticketStore.tickets.set(id, tk);
    };
    nuevo('t1', 101, 'Kardex no cuadra', ADMIN.uid);
    nuevo('t2', 102, 'Timbrado de nómina', AGENTE.uid);
    await t.respuestaSinLeerRepo.guardar({
      ticketId: 't1', numero: 101, asunto: 'Kardex no cuadra', empresaNombre: 'XELCRON', autorNombre: 'Arturo López',
      extracto: 'Ya lo revisé y sigue igual', at: new Date(), agenteAsignadoUid: ADMIN.uid, agenteAsignadoNombre: 'Admin',
      canalizadoA: null, distribuidor: '',
    });
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const dash = (await agent.get('/app')).text;
    const resp = dash.slice(dash.indexOf('💬 Respuestas sin leer'), dash.indexOf('👤 Mis tickets'));
    expect(resp).toContain('#101');
    expect(resp).toContain('Ya lo revisé y sigue igual');
    const mios = dash.slice(dash.indexOf('👤 Mis tickets'), dash.indexOf('Próximos eventos'));
    expect(mios).toContain('Kardex no cuadra');
    expect(mios).not.toContain('Timbrado de nómina');
  });
});

describe('🔥 consumo de Firebase', () => {
  it('el Dashboard muestra la tarjeta; arriba sale el aviso solo a partir del 80 %', async () => {
    const { diaDeCuota } = await import('../../src/core/entities/value-objects/cuotaFirestore.js');
    const t = makeTestApp({ usuarios: [ADMIN] });
    const dia = diaDeCuota(new Date());
    t.consumoFirestoreRepo.dias.set(dia, { dia, lecturas: 12_345, porHora: { '10': 12_345 } });
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.get('/app');
    expect(res.text).toContain('Consumo de Firebase hoy');
    expect(res.text).toContain('12,345');
    expect(res.text).toContain('24.7 %');
    expect(res.text).not.toContain('aviso-consumo');

    // Otro proceso (otra app = caché de contadores nueva) con 85 %: sale el aviso en cualquier página.
    const t2 = makeTestApp({ usuarios: [ADMIN] });
    t2.consumoFirestoreRepo.dias.set(dia, { dia, lecturas: 42_500, porHora: {} });
    const { agent: agent2 } = await login(t2.app, ADMIN.email, ADMIN.password);
    const tickets = await agent2.get('/app/tickets');
    expect(tickets.text).toContain('aviso-consumo');
    expect(tickets.text).toContain('🔥 Firebase 85 %');
  });
});
