import { describe, expect, it, beforeEach } from 'vitest';
import { MigracionCrmViejoService } from '../../src/application/migracion/MigracionCrmViejoService.js';
import type { Container } from '../../src/config/container.js';
import { ForbiddenError, ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import {
  InMemoryEmpresaRepository,
  InMemoryContactoRepository,
  InMemoryBitacoraRepository,
} from '../fakes/crm.js';
import {
  InMemoryTicketStore,
  InMemoryTicketRepository,
  InMemoryTicketQueries,
  InMemoryContadorRepository,
  InMemoryConfiguracionRepository,
} from '../fakes/tickets.js';
import { InMemoryVersionRepository, InMemoryKnowledgeRepository } from '../fakes/kb.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';

const actor = (permisos: string[] = ['configuracion:integraciones']): SessionUser => ({
  uid: 'admin1',
  nombre: 'Admin',
  email: 'a@d.com',
  roles: ['admin'],
  rol: 'admin',
  esTecnico: false,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos,
});

/** Respaldo mínimo con la forma real del botón "Respaldar" del CRM viejo. */
const respaldo = (): Record<string, unknown> => ({
  version: 1,
  app: 'CRM DATTASOFT',
  datos: {
    clientes: [{ EMPRESA: 'ACME SA', RFC: 'ACM010101AAA', SISTEMAS: { CONTPAQi: '1.2' } }],
    contactos: [{ nombre: 'Diana', empresa: 'ACME SA', correo: 'diana@acme.mx' }],
    tickets: [{ numero: 10, asunto: 'No imprime', descripcion: 'x', estado: 'Abierto' }],
    usuarios: [{ email: 'nuevo@dattasoft.mx', nombre: 'Nuevo' }],
    versionesMercado: { CONTPAQi: '2.0' },
    bitacora: [{ msg: 'algo pasó', fecha: '2026-01-01T00:00:00Z', usuario: 'erick' }],
  },
});

describe('MigracionCrmViejoService', () => {
  let repos: Record<string, unknown>;
  let empresas: InMemoryEmpresaRepository;
  let contactos: InMemoryContactoRepository;
  let ticketQueries: InMemoryTicketQueries;
  let servicio: MigracionCrmViejoService;

  beforeEach(() => {
    empresas = new InMemoryEmpresaRepository();
    contactos = new InMemoryContactoRepository();
    const store = new InMemoryTicketStore();
    ticketQueries = new InMemoryTicketQueries(store);
    repos = {
      empresaRepo: empresas,
      contactoRepo: contactos,
      ticketRepo: new InMemoryTicketRepository(store),
      ticketQueries,
      contadorRepo: new InMemoryContadorRepository(),
      configuracionRepo: new InMemoryConfiguracionRepository(),
      versionRepo: new InMemoryVersionRepository(),
      knowledgeRepo: new InMemoryKnowledgeRepository(),
      bitacoraRepo: new InMemoryBitacoraRepository(),
      usuarioRepo: new InMemoryUsuarioRepository(),
    };
    const container = { resolve: (n: string) => repos[n] } as unknown as Container;
    servicio = new MigracionCrmViejoService(container);
  });

  it('rechaza a quien no tiene el permiso de integraciones', async () => {
    await expect(
      servicio.importar(actor([]), respaldo(), { modo: 'actualizar', simulacro: true }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rechaza un archivo que no es un respaldo del CRM viejo', async () => {
    // Un backup de ds-hd: tiene `empresas`, no `clientes` — justo la confusión que antes
    // terminaba en un "OK" con todos los contadores en cero.
    await expect(
      servicio.importar(
        actor(),
        { version: 1, generadoEn: '2026-09-18T00:00:00Z', empresas: [], contactos: [], tickets: [] },
        { modo: 'actualizar', simulacro: true },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('en simulacro reporta lo que importaría sin escribir nada', async () => {
    const r = await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: true });
    expect(r.empresas).toBe(1);
    expect(r.contactos).toBe(1);
    expect(r.tickets).toBe(1);
    expect(await empresas.list()).toHaveLength(0);
    expect(await contactos.list()).toHaveLength(0);
  });

  it('importa de verdad y es idempotente (reimportar no duplica)', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false });
    expect(await empresas.list()).toHaveLength(1);
    expect(await contactos.list()).toHaveLength(1);

    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false });
    expect(await empresas.list()).toHaveLength(1);
    expect(await contactos.list()).toHaveLength(1);
  });

  it('modo actualizar conserva lo que ya existía y no viene en el archivo', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false });
    const previas = (await empresas.list()).length;

    const otro = respaldo();
    (otro.datos as Record<string, unknown>).clientes = [{ EMPRESA: 'OTRA SA' }];
    (otro.datos as Record<string, unknown>).contactos = [];
    await servicio.importar(actor(), otro, { modo: 'actualizar', simulacro: false });

    expect((await empresas.list()).map((e) => e.nombre).sort()).toEqual(['ACME SA', 'OTRA SA']);
    expect(previas).toBe(1);
  });

  it('modo sustituir borra lo previo y deja solo lo del archivo', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false });

    const otro = respaldo();
    (otro.datos as Record<string, unknown>).clientes = [{ EMPRESA: 'OTRA SA' }];
    (otro.datos as Record<string, unknown>).contactos = [];
    const r = await servicio.importar(actor(), otro, { modo: 'sustituir', simulacro: false });

    const nombres = (await empresas.list()).map((e) => e.nombre);
    expect(nombres).toEqual(['OTRA SA']);
    expect(await contactos.list()).toHaveLength(0);
    expect(r.borrado?.empresas).toBe(1);
  });

  it('en simulacro el modo sustituir cuenta lo que borraría pero no borra', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false });
    const r = await servicio.importar(actor(), respaldo(), { modo: 'sustituir', simulacro: true });
    expect(r.borrado?.empresas).toBe(1);
    expect(await empresas.list()).toHaveLength(1);
  });

  it('reporta los usuarios del respaldo que aún no tienen cuenta en ds-hd', async () => {
    const r = await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: true });
    expect(r.usuariosFaltantes).toBe(1);
  });
});
