import { beforeEach, describe, expect, it } from 'vitest';
import { ObtenerMetricasService } from '../../src/application/dashboard/ObtenerMetricasService.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import {
  InMemoryTicketStore,
  InMemoryTicketQueries,
  InMemoryTicketPublicoRepository,
} from '../fakes/tickets.js';
import { InMemoryEmpresaRepository } from '../fakes/crm.js';
import { InMemoryVersionRepository } from '../fakes/kb.js';
import { InMemoryCotizacionRepository } from '../fakes/cotizaciones.js';
import { InMemoryEventoRepository } from '../fakes/eventos.js';
import { InMemoryTareaRepository } from '../fakes/seguimiento.js';
import { InMemoryBitacoraRepository } from '../fakes/crm.js';
import { FixedClock } from '../fakes/support.js';

const HOY = new Date('2026-09-07T12:00:00Z');

function actor(permisos: string[]): SessionUser {
  return {
    uid: 'u1',
    nombre: 'Admin',
    email: 'a@x.mx',
    roles: ['admin'],
    rol: 'admin',
    esTecnico: false,
    empresaId: null,
    activo: true,
    esStaff: true,
    esCliente: false,
    permisos,
    firma: null,
  } as SessionUser;
}

describe('ObtenerMetricasService', () => {
  let store: InMemoryTicketStore;
  let empresas: InMemoryEmpresaRepository;
  let versiones: InMemoryVersionRepository;
  let service: ObtenerMetricasService;

  beforeEach(() => {
    store = new InMemoryTicketStore();
    empresas = new InMemoryEmpresaRepository();
    versiones = new InMemoryVersionRepository();
    service = new ObtenerMetricasService(
      new InMemoryTicketQueries(store),
      new InMemoryCotizacionRepository(),
      new InMemoryEventoRepository(),
      new InMemoryTareaRepository(),
      new InMemoryBitacoraRepository(),
      new FixedClock(HOY),
      empresas,
      versiones,
      new InMemoryTicketPublicoRepository(),
    );
  });

  const ticketEn = (id: string, fecha: string) => {
    const t = Ticket.crear({
      id,
      numero: Number(id.replace(/\D/g, '')),
      asunto: `T ${id}`,
      descripcion: 'descripción de prueba',
      tipo: 'General',
      prioridad: 'Media',
      estadoInicial: 'Abierto',
      canal: 'interno',
      ahora: new Date(fecha),
    });
    store.tickets.set(id, t);
    return t;
  };

  it('agrupa tickets por mes (últimos 12, incluido el actual)', async () => {
    ticketEn('t1', '2026-09-01T09:00:00Z');
    ticketEn('t2', '2026-09-05T09:00:00Z');
    ticketEn('t3', '2026-08-15T09:00:00Z');
    ticketEn('t4', '2025-09-15T09:00:00Z'); // hace 12 meses: fuera de la ventana

    const m = await service.ejecutar(actor(['tickets:leer_todos']));
    expect(m.tickets.porMes).toHaveLength(12);
    expect(m.tickets.porMes.at(-1)!.valor).toBe(2); // septiembre
    expect(m.tickets.porMes.at(-2)!.valor).toBe(1); // agosto
    expect(m.tickets.porMes.reduce((s, b) => s + b.valor, 0)).toBe(3); // septiembre del año pasado no cuenta
  });

  it('la gráfica cubre los meses elegidos (3, 6, 12, 18, 24); otro valor → 12', async () => {
    ticketEn('t1', '2026-09-01T09:00:00Z');
    ticketEn('t4', '2025-09-15T09:00:00Z'); // hace 12 meses: entra con 18 o 24

    const tres = await service.ejecutar(actor(['tickets:leer_todos']), { mesesGrafica: 3 });
    expect(tres.tickets.porMes).toHaveLength(3);
    const dieciocho = await service.ejecutar(actor(['tickets:leer_todos']), { mesesGrafica: 18 });
    expect(dieciocho.tickets.porMes).toHaveLength(18);
    expect(dieciocho.tickets.porMes.reduce((s, b) => s + b.valor, 0)).toBe(2);
    const raro = await service.ejecutar(actor(['tickets:leer_todos']), { mesesGrafica: 7 });
    expect(raro.tickets.porMes).toHaveLength(12);
  });

  it('sin permiso de empresas: licencias es null', async () => {
    const m = await service.ejecutar(actor(['tickets:leer_todos']));
    expect(m.licencias).toBeNull();
  });

  it('cuenta licencias en riesgo y avisos pendientes', async () => {
    await empresas.save(
      new Empresa({
        id: 'e1',
        nombre: 'ACME',
        sistemasContratados: ['Contpaqi'],
        vigencias: { Contpaqi: '2026-08-01' }, // vencida
        versionesInstaladas: { Contpaqi: '14.0.0' },
      }),
    );
    await empresas.save(
      new Empresa({
        id: 'e2',
        nombre: 'GLOBEX',
        sistemasContratados: ['Compac'],
        vigencias: { Compac: '2026-09-20' }, // por vencer (dentro de 30 d)
      }),
    );
    await empresas.save(
      new Empresa({
        id: 'e3',
        nombre: 'Initech',
        sistemasContratados: ['Compac'],
        vigencias: { Compac: '2027-06-01' }, // vigente
        versionesInstaladas: { Compac: '10.0.0' },
      }),
    );
    await versiones.save(
      new VersionSistema({ id: 'v1', sistema: 'Contpaqi', versionActual: '16.3.1' }),
    );
    await versiones.save(new VersionSistema({ id: 'v2', sistema: 'Compac', versionActual: '12.0.0' }));

    const m = await service.ejecutar(actor(['tickets:leer_todos', 'empresas:leer']));
    expect(m.licencias).not.toBeNull();
    expect(m.licencias!.vencidas).toBe(1);
    expect(m.licencias!.porVencer).toBe(1);
    expect(m.licencias!.empresasEnRiesgo).toBe(2);
    // Como el viejo: solo versiones desactualizadas → e1 y e3 (e2 solo tiene licencia).
    expect(m.licencias!.avisosPendientes).toBe(2);
    expect(m.licencias!.banner.map((b) => b.nombre)).toEqual(['ACME', 'GLOBEX']);
  });
});

describe('Dashboard — resumen de próximos eventos', () => {
  it('trae lugar, días que faltan y cuántos van (invitaciones + «Sí» del link abierto)', async () => {
    const { Evento } = await import('../../src/core/entities/Evento.js');
    const { InMemoryInscripcionRepository } = await import('../fakes/eventos.js');
    const eventos = new InMemoryEventoRepository();
    const inscripciones = new InMemoryInscripcionRepository();
    const ev = new Evento({
      id: 'posada-dash', titulo: 'Posada', tipo: 'presencial', estado: 'borrador',
      fechaHora: new Date('2026-09-15T21:00:00Z'), lugarNombre: 'Salón Los Arcos',
    });
    ev.agregarInvitadoExterno({ id: 'x1', nombre: 'Juan', token: 't1', pases: 3 });
    ev.agregarInvitadoExterno({ id: 'x2', nombre: 'Ana', token: 't2', pases: 2 });
    ev.responderInvitacion('t1', { asistira: true, personas: 3 }, HOY);
    await eventos.save(ev);
    const base = { eventoId: 'posada-dash', email: null, telefono: '9991234567', empresa: null, estado: 'confirmado', origen: 'publico', correoEstado: null, recordatoriosEnviados: [] };
    await inscripciones.create({ ...base, id: 'i1', nombre: 'Luis', asistira: 'Sí', personas: 2 } as never);
    await inscripciones.create({ ...base, id: 'i2', nombre: 'Rosa', asistira: 'No', personas: null } as never);

    const service = new ObtenerMetricasService(
      new InMemoryTicketQueries(new InMemoryTicketStore()), new InMemoryCotizacionRepository(), eventos,
      new InMemoryTareaRepository(), new InMemoryBitacoraRepository(), new FixedClock(HOY),
      new InMemoryEmpresaRepository(), new InMemoryVersionRepository(), new InMemoryTicketPublicoRepository(),
      undefined, undefined, inscripciones,
    );
    const m = await service.ejecutar(actor(['tickets:leer', 'tickets:leer_todos']));
    const e = m.proximosEventos.find((x) => x.id === 'posada-dash')!;
    expect(e).toMatchObject({
      borrador: true, dias: 8, lugar: 'Salón Los Arcos', pideConfirmacion: true,
      invitados: 2, asistiran: 1, pendientes: 1, registradosLink: 2, van: 5,
    });
  });
});
