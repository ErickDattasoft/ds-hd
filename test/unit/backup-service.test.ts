import { beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../../src/application/configuracion/BackupService.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { ForbiddenError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryEmpresaRepository, InMemoryContactoRepository } from '../fakes/crm.js';
import {
  InMemoryTicketStore,
  InMemoryTicketRepository,
  InMemoryTicketQueries,
  InMemoryContadorRepository,
  InMemoryConfiguracionRepository,
} from '../fakes/tickets.js';
import { InMemoryCotizacionRepository } from '../fakes/cotizaciones.js';
import { InMemoryVersionRepository, InMemoryKnowledgeRepository } from '../fakes/kb.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';
import { FixedClock } from '../fakes/support.js';

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'admin1',
  nombre: 'Admin',
  email: 'a@d.com',
  rol: 'admin',
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['configuracion:integraciones'],
  ...over,
});

describe('BackupService', () => {
  let empresas: InMemoryEmpresaRepository;
  let ticketStore: InMemoryTicketStore;
  let ticketRepo: InMemoryTicketRepository;
  let ticketQueries: InMemoryTicketQueries;
  let service: BackupService;

  beforeEach(() => {
    empresas = new InMemoryEmpresaRepository();
    ticketStore = new InMemoryTicketStore();
    ticketRepo = new InMemoryTicketRepository(ticketStore);
    ticketQueries = new InMemoryTicketQueries(ticketStore);
    service = new BackupService(
      empresas,
      new InMemoryContactoRepository(),
      ticketRepo,
      ticketQueries,
      new InMemoryCotizacionRepository(),
      new InMemoryVersionRepository(),
      new InMemoryKnowledgeRepository(),
      new InMemoryUsuarioRepository(),
      new InMemoryConfiguracionRepository(),
      new InMemoryContadorRepository(),
      new FixedClock(new Date('2026-09-01T12:00:00Z')),
    );
  });

  it('exporta y restaura una empresa y un ticket, con fechas anidadas revividas correctamente', async () => {
    const original = new Empresa({
      id: 'e1',
      nombre: 'Empresa Backup',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    });
    await empresas.save(original);
    const ticketOriginal = Ticket.crear({
      id: 't1',
      numero: 501,
      asunto: 'De backup',
      descripcion: 'descripción larga',
      tipo: 'General',
      prioridad: 'Alta',
      estadoInicial: 'Abierto',
      canal: 'interno',
      ahora: new Date('2026-03-01T00:00:00Z'),
    });
    await ticketRepo.save(ticketOriginal);

    const exportado = await service.exportar();
    // Simula el viaje por JSON real (las fechas se serializan a string, como en un archivo).
    const comoArchivo = JSON.parse(JSON.stringify(exportado));

    // Un restore "en frío": otro backend vacío.
    const empresas2 = new InMemoryEmpresaRepository();
    const store2 = new InMemoryTicketStore();
    const ticketRepo2 = new InMemoryTicketRepository(store2);
    const service2 = new BackupService(
      empresas2,
      new InMemoryContactoRepository(),
      ticketRepo2,
      new InMemoryTicketQueries(store2),
      new InMemoryCotizacionRepository(),
      new InMemoryVersionRepository(),
      new InMemoryKnowledgeRepository(),
      new InMemoryUsuarioRepository(),
      new InMemoryConfiguracionRepository(),
      new InMemoryContadorRepository(),
      new FixedClock(new Date('2026-09-01T12:00:00Z')),
    );

    const resumen = await service2.restaurar(actor(), comoArchivo);

    expect(resumen).toMatchObject({ empresas: 1, tickets: 1, errores: [] });
    const empresaRestaurada = await empresas2.findById('e1');
    expect(empresaRestaurada?.nombre).toBe('Empresa Backup');
    expect(empresaRestaurada?.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
    const ticketRestaurado = await ticketRepo2.findById('t1');
    expect(ticketRestaurado?.numero).toBe(501);
    expect(ticketRestaurado?.abiertoEn).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(ticketRestaurado?.historialEstados[0]!.at).toEqual(new Date('2026-03-01T00:00:00Z'));
  });

  it('restaurar es upsert: no toca lo que ya existe en destino y no viene en el archivo', async () => {
    const empresas2 = new InMemoryEmpresaRepository();
    const yaExistia = new Empresa({ id: 'ya-existia', nombre: 'No debe borrarse' });
    await empresas2.save(yaExistia);
    const store2 = new InMemoryTicketStore();
    const service2 = new BackupService(
      empresas2,
      new InMemoryContactoRepository(),
      new InMemoryTicketRepository(store2),
      new InMemoryTicketQueries(store2),
      new InMemoryCotizacionRepository(),
      new InMemoryVersionRepository(),
      new InMemoryKnowledgeRepository(),
      new InMemoryUsuarioRepository(),
      new InMemoryConfiguracionRepository(),
      new InMemoryContadorRepository(),
      new FixedClock(new Date()),
    );

    await service2.restaurar(actor(), { empresas: [] });

    expect(await empresas2.findById('ya-existia')).not.toBeNull();
  });

  it('sin permiso configuracion:integraciones no se puede restaurar', async () => {
    await expect(service.restaurar(actor({ permisos: [] }), { empresas: [] })).rejects.toThrow(ForbiddenError);
  });
});
