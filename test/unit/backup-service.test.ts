import { beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../../src/application/configuracion/BackupService.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { ForbiddenError, ValidationError } from '../../src/core/errors/DomainError.js';
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
import { Evento } from '../../src/core/entities/Evento.js';
import { Tarea } from '../../src/core/entities/Tarea.js';
import {
  InMemoryEventoRepository,
  InMemoryInscripcionRepository,
  InMemoryListaNegraRepository,
} from '../fakes/eventos.js';
import { InMemoryInteraccionRepository, InMemoryTareaRepository } from '../fakes/seguimiento.js';
import { InMemoryAvisoRepository, InMemoryPizarraKBRepository } from '../fakes/kb.js';
import { InMemoryFiltroGuardadoRepository } from '../fakes/InMemoryFiltroGuardadoRepository.js';
import { InMemoryBitacoraRepository } from '../fakes/crm.js';
import type { ReposExtraBackup } from '../../src/application/configuracion/BackupService.js';

const reposExtra = (): ReposExtraBackup & {
  eventos: InMemoryEventoRepository;
  inscripciones: InMemoryInscripcionRepository;
  tareas: InMemoryTareaRepository;
  avisos: InMemoryAvisoRepository;
  bitacora: InMemoryBitacoraRepository;
} => ({
  eventos: new InMemoryEventoRepository(),
  inscripciones: new InMemoryInscripcionRepository(),
  listaNegra: new InMemoryListaNegraRepository(),
  avisos: new InMemoryAvisoRepository(),
  tareas: new InMemoryTareaRepository(),
  interacciones: new InMemoryInteraccionRepository(),
  pizarras: new InMemoryPizarraKBRepository(),
  filtros: new InMemoryFiltroGuardadoRepository(),
  bitacora: new InMemoryBitacoraRepository(),
});

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
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
  permisos: ['configuracion:integraciones'],
  ...over,
});

describe('BackupService', () => {
  let empresas: InMemoryEmpresaRepository;
  let ticketStore: InMemoryTicketStore;
  let ticketRepo: InMemoryTicketRepository;
  let ticketQueries: InMemoryTicketQueries;
  let config: InMemoryConfiguracionRepository;
  let service: BackupService;

  beforeEach(() => {
    empresas = new InMemoryEmpresaRepository();
    ticketStore = new InMemoryTicketStore();
    ticketRepo = new InMemoryTicketRepository(ticketStore);
    ticketQueries = new InMemoryTicketQueries(ticketStore);
    config = new InMemoryConfiguracionRepository();
    service = new BackupService(
      empresas,
      new InMemoryContactoRepository(),
      ticketRepo,
      ticketQueries,
      new InMemoryCotizacionRepository(),
      new InMemoryVersionRepository(),
      new InMemoryKnowledgeRepository(),
      new InMemoryUsuarioRepository(),
      config,
      new InMemoryContadorRepository(),
      new FixedClock(new Date('2026-09-01T12:00:00Z')),
    );
  });

  it('exporta y restaura una empresa y un ticket, con fechas anidadas revividas correctamente', async () => {
    const original = new Empresa({
      id: 'e1',
      nombre: 'EMPRESA BACKUP',
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
    await ticketRepo.agregarNota('t1', {
      id: 'n1', tipo: 'publica', cuerpo: 'Ya quedó', autorUid: 'correo-entrante', autorNombre: 'Luis',
      correoDe: 'luis@cliente.mx', adjuntoIds: ['a1'], createdAt: new Date('2026-03-02T00:00:00Z'),
    });
    await ticketRepo.registrarEvento('t1', {
      id: 'ev1', tipo: 'correo', resumen: 'Luis respondió por correo', actorUid: null, actorNombre: null,
      at: new Date('2026-03-02T00:00:00Z'),
    });
    await config.guardarAcercaDe({ version: 'v9.9.9', ultimaActualizacion: 'Enero 2026', notas: 'nota' });

    const exportado = await service.exportar();
    // Simula el viaje por JSON real (las fechas se serializan a string, como en un archivo).
    const comoArchivo = JSON.parse(JSON.stringify(exportado));

    // Un restore "en frío": otro backend vacío.
    const empresas2 = new InMemoryEmpresaRepository();
    const store2 = new InMemoryTicketStore();
    const ticketRepo2 = new InMemoryTicketRepository(store2);
    const config2 = new InMemoryConfiguracionRepository();
    const service2 = new BackupService(
      empresas2,
      new InMemoryContactoRepository(),
      ticketRepo2,
      new InMemoryTicketQueries(store2),
      new InMemoryCotizacionRepository(),
      new InMemoryVersionRepository(),
      new InMemoryKnowledgeRepository(),
      new InMemoryUsuarioRepository(),
      config2,
      new InMemoryContadorRepository(),
      new FixedClock(new Date('2026-09-01T12:00:00Z')),
    );

    const resumen = await service2.restaurar(actor(), comoArchivo);

    expect(resumen).toMatchObject({ empresas: 1, tickets: 1, errores: [] });
    expect(await config2.obtenerAcercaDe()).toEqual({
      version: 'v9.9.9',
      ultimaActualizacion: 'Enero 2026',
      notas: 'nota',
    });
    const empresaRestaurada = await empresas2.findById('e1');
    expect(empresaRestaurada?.nombre).toBe('EMPRESA BACKUP');
    expect(empresaRestaurada?.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
    const ticketRestaurado = await ticketRepo2.findById('t1');
    expect(ticketRestaurado?.numero).toBe(501);
    expect(ticketRestaurado?.abiertoEn).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(ticketRestaurado?.historialEstados[0]!.at).toEqual(new Date('2026-03-01T00:00:00Z'));
    // La conversación y la actividad viajan con el respaldo.
    expect(await ticketRepo2.listarNotas('t1')).toEqual([
      expect.objectContaining({ id: 'n1', cuerpo: 'Ya quedó', correoDe: 'luis@cliente.mx', adjuntoIds: ['a1'], createdAt: new Date('2026-03-02T00:00:00Z') }),
    ]);
    expect((await ticketRepo2.listarEventos('t1')).map((e) => e.id)).toEqual(['ev1']);
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

  it('rechaza un respaldo del CRM viejo en vez de «restaurar» 0 en todo', async () => {
    const crmViejo = { version: '3', app: 'CRM DATTASOFT', fecha: '2026-09-15', datos: { empresas: [{ nombre: 'X' }] } };
    await expect(service.restaurar(actor(), crmViejo)).rejects.toThrow(/respaldo del CRM viejo/);
  });

  it('rechaza un JSON sin ninguna sección de backup', async () => {
    await expect(service.restaurar(actor(), { hola: 'mundo' })).rejects.toThrow(ValidationError);
  });

  it('sin permiso configuracion:integraciones no se puede restaurar', async () => {
    await expect(service.restaurar(actor({ permisos: [] }), { empresas: [] })).rejects.toThrow(ForbiddenError);
  });
  it('respalda y restaura eventos con sus invitados (mismo link personal), registros, avisos y tareas; sin claves de API', async () => {
    const nuevoServicio = (extra: ReposExtraBackup, cfg: InMemoryConfiguracionRepository) => {
      const store = new InMemoryTicketStore();
      return new BackupService(
        new InMemoryEmpresaRepository(), new InMemoryContactoRepository(), new InMemoryTicketRepository(store),
        new InMemoryTicketQueries(store), new InMemoryCotizacionRepository(), new InMemoryVersionRepository(),
        new InMemoryKnowledgeRepository(), new InMemoryUsuarioRepository(), cfg, new InMemoryContadorRepository(),
        new FixedClock(new Date('2026-09-01T12:00:00Z')), undefined, undefined, undefined, extra,
      );
    };
    const origen = reposExtra();
    const cfgOrigen = new InMemoryConfiguracionRepository();
    const evento = new Evento({
      id: 'ev1', titulo: 'Posada 2026', tipo: 'presencial', fechaHora: new Date('2026-12-12T02:00:00Z'),
      estado: 'publicado', createdAt: new Date('2026-11-01T00:00:00Z'),
    });
    const inv = evento.agregarInvitadoExterno({ id: 'x1', nombre: 'Juan Pérez', token: 'tok-123', pases: 3 });
    inv.respondioAt = '2026-11-20T15:00:00.000Z';
    inv.personas = 2;
    await origen.eventos.save(evento);
    await origen.inscripciones.save({
      id: 'i1', eventoId: 'ev1', nombre: 'Ana', email: 'ana@x.mx', telefono: null, empresa: null,
      estado: 'registrado', origen: 'publico', correoEstado: null, recordatoriosEnviados: ['previo'], ip: null,
      correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: null, deseaCanalWhatsapp: false,
      contactadoWsp: false, asistioReal: false, createdAt: new Date('2026-11-10T00:00:00Z'),
    });
    await origen.tareas.save(new Tarea({ id: 't1', titulo: 'Llamar a cliente', asignadoAUid: 'u1', vence: '2026-12-01' }));
    await origen.avisos.registrar([{
      id: 'a1', empresaId: 'e1', empresaNombre: 'ACME', sistema: 'Nóminas', tipo: 'sistema',
      versionInstalada: '14.0', versionOficial: '14.1', fechaVencimiento: null, canal: 'correo',
      destino: 'c@acme.mx', enviadoPorUid: 'u1', enviadoPorNombre: 'Erick', createdAt: new Date('2026-10-01T00:00:00Z'),
    }]);
    await origen.bitacora.registrar({
      id: 'b1', at: new Date('2026-11-15T10:00:00Z'), actorUid: 'u1', actorNombre: 'Erick', accion: 'editar',
      modulo: 'eventos', entidadTipo: 'Evento', entidadId: 'ev1', resumen: 'Editó Posada 2026',
    });
    await cfgOrigen.guardarIntegraciones({ ...(await cfgOrigen.obtenerIntegraciones()), whatsappTelefono: '999', whatsappApiKey: 'SECRETA' });

    const archivo = JSON.parse(JSON.stringify(await nuevoServicio(origen, cfgOrigen).exportar()));
    expect(JSON.stringify(archivo)).not.toContain('SECRETA');

    const destino = reposExtra();
    const cfgDestino = new InMemoryConfiguracionRepository();
    await cfgDestino.guardarIntegraciones({ ...(await cfgDestino.obtenerIntegraciones()), whatsappApiKey: 'CLAVE-DESTINO' });
    const resumen = await nuevoServicio(destino, cfgDestino).restaurar(actor(), archivo);

    expect(resumen).toMatchObject({ eventos: 1, inscritos: 1, tareas: 1, avisos: 1, bitacora: 1, errores: [] });
    expect(await destino.bitacora.listar()).toEqual([
      expect.objectContaining({ id: 'b1', resumen: 'Editó Posada 2026', at: new Date('2026-11-15T10:00:00Z') }),
    ]);
    const restaurado = await destino.eventos.findById('ev1');
    expect(restaurado?.fechaHora).toEqual(new Date('2026-12-12T02:00:00Z'));
    // El link personal ya enviado sigue funcionando, con sus pases y su respuesta.
    const porToken = restaurado?.buscarPorToken('tok-123');
    expect(porToken?.nombre).toBe('Juan Pérez');
    expect(porToken?.inv).toMatchObject({ pases: 3, personas: 2, respondioAt: '2026-11-20T15:00:00.000Z' });
    expect(destino.inscripciones.items[0]).toMatchObject({ nombre: 'Ana', recordatoriosEnviados: ['previo'], createdAt: new Date('2026-11-10T00:00:00Z') });
    expect((await destino.tareas.findById('t1'))?.vence).toBe('2026-12-01');
    expect((await destino.avisos.listTodos())[0]?.createdAt).toEqual(new Date('2026-10-01T00:00:00Z'));
    // Integraciones: llega el teléfono del respaldo, la clave se queda la que ya había.
    expect(await cfgDestino.obtenerIntegraciones()).toMatchObject({ whatsappTelefono: '999', whatsappApiKey: 'CLAVE-DESTINO' });
  });
});
