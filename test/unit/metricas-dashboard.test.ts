import { beforeEach, describe, expect, it } from 'vitest';
import { ObtenerMetricasService } from '../../src/application/dashboard/ObtenerMetricasService.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryTicketStore, InMemoryTicketQueries } from '../fakes/tickets.js';
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

  it('agrupa tickets por mes (últimos 6, incluido el actual)', async () => {
    ticketEn('t1', '2026-09-01T09:00:00Z');
    ticketEn('t2', '2026-09-05T09:00:00Z');
    ticketEn('t3', '2026-08-15T09:00:00Z');
    ticketEn('t4', '2026-01-15T09:00:00Z'); // fuera de la ventana

    const m = await service.ejecutar(actor(['tickets:leer_todos']));
    expect(m.tickets.porMes).toHaveLength(6);
    expect(m.tickets.porMes.at(-1)!.valor).toBe(2); // septiembre
    expect(m.tickets.porMes.at(-2)!.valor).toBe(1); // agosto
    expect(m.tickets.porMes.reduce((s, b) => s + b.valor, 0)).toBe(3); // enero no cuenta
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
        nombre: 'Globex',
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
    // e1 (licencia + versión), e2 (licencia), e3 (versión desactualizada) → 3 avisos
    expect(m.licencias!.avisosPendientes).toBe(3);
    expect(m.licencias!.banner.map((b) => b.nombre)).toEqual(['ACME', 'Globex']);
  });
});
