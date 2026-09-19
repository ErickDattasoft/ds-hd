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
import { InMemoryCotizacionRepository } from '../fakes/cotizaciones.js';
import { InMemoryEventoRepository } from '../fakes/eventos.js';
import {
  SECCIONES_IMPORTACION,
  type SeccionImportacion,
} from '../../src/application/migracion/MigracionCrmViejoService.js';

/** Todas las secciones: el comportamiento previo a poder elegirlas una por una. */
const TODO: SeccionImportacion[] = [...SECCIONES_IMPORTACION];

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
    eventos: [
      {
        id: 'ev_1700000000000',
        nombre: 'Webinar de cierre anual',
        fecha: '2026-11-20',
        hora: '17:00',
        sistema: 'CONTPAQi',
        empresas: [{ nombre: 'ACME SA', sistema: 'CONTPAQi', invitado: true, respuesta: 'ASISTIRA' }],
        extras: [{ nombre: 'Luis Referido', fuente: 'Redes Sociales', invitado: false, respuesta: 'PENDIENTE' }],
      },
    ],
    cotizaciones: [
      {
        id: 'cot_1700000000001',
        numero: 'COT-2026-007',
        estado: 'enviada',
        empresaNombre: 'ACME SA',
        fechaCreacion: '2026-03-01',
        fechaVigencia: '2026-03-16',
        conceptos: [{ descripcion: 'Licencia', cantidad: 2, precioUnitario: 1000, descuento: 0, tieneIVA: true }],
      },
    ],
  },
});

describe('MigracionCrmViejoService', () => {
  let repos: Record<string, unknown>;
  let empresas: InMemoryEmpresaRepository;
  let contactos: InMemoryContactoRepository;
  let ticketQueries: InMemoryTicketQueries;
  let eventos: InMemoryEventoRepository;
  let inscripciones: { borrados: string[]; eliminarPorEvento(id: string): Promise<void> };
  let cotizaciones: InMemoryCotizacionRepository;
  let servicio: MigracionCrmViejoService;

  beforeEach(() => {
    empresas = new InMemoryEmpresaRepository();
    contactos = new InMemoryContactoRepository();
    eventos = new InMemoryEventoRepository();
    inscripciones = {
      borrados: [],
      async eliminarPorEvento(id: string) {
        this.borrados.push(id);
      },
    };
    cotizaciones = new InMemoryCotizacionRepository();
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
      eventoRepo: eventos,
      inscripcionRepo: inscripciones,
      cotizacionRepo: cotizaciones,
    };
    const container = { resolve: (n: string) => repos[n] } as unknown as Container;
    servicio = new MigracionCrmViejoService(container);
  });

  it('rechaza a quien no tiene el permiso de integraciones', async () => {
    await expect(
      servicio.importar(actor([]), respaldo(), { modo: 'actualizar', simulacro: true, secciones: TODO }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rechaza un archivo que no es un respaldo del CRM viejo', async () => {
    // Un backup de ds-hd: tiene `empresas`, no `clientes` — justo la confusión que antes
    // terminaba en un "OK" con todos los contadores en cero.
    await expect(
      servicio.importar(
        actor(),
        { version: 1, generadoEn: '2026-09-18T00:00:00Z', empresas: [], contactos: [], tickets: [] },
        { modo: 'actualizar', simulacro: true, secciones: TODO },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('en simulacro reporta lo que importaría sin escribir nada', async () => {
    const r = await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: true, secciones: TODO });
    expect(r.empresas).toBe(1);
    expect(r.contactos).toBe(1);
    expect(r.tickets).toBe(1);
    expect(await empresas.list()).toHaveLength(0);
    expect(await contactos.list()).toHaveLength(0);
  });

  it('importa de verdad y es idempotente (reimportar no duplica)', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false, secciones: TODO });
    expect(await empresas.list()).toHaveLength(1);
    expect(await contactos.list()).toHaveLength(1);

    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false, secciones: TODO });
    expect(await empresas.list()).toHaveLength(1);
    expect(await contactos.list()).toHaveLength(1);
  });

  it('modo actualizar conserva lo que ya existía y no viene en el archivo', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false, secciones: TODO });
    const previas = (await empresas.list()).length;

    const otro = respaldo();
    (otro.datos as Record<string, unknown>).clientes = [{ EMPRESA: 'OTRA SA' }];
    (otro.datos as Record<string, unknown>).contactos = [];
    // Sin cotizaciones: las del respaldo son de ACME SA y, al no venir ya esa empresa,
    // crearían el buzón "Sin empresa (revisar tras migración)" — ruido para esta prueba.
    (otro.datos as Record<string, unknown>).cotizaciones = [];
    await servicio.importar(actor(), otro, { modo: 'actualizar', simulacro: false, secciones: TODO });

    expect((await empresas.list()).map((e) => e.nombre).sort()).toEqual(['ACME SA', 'OTRA SA']);
    expect(previas).toBe(1);
  });

  it('modo sustituir borra lo previo y deja solo lo del archivo', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false, secciones: TODO });

    const otro = respaldo();
    (otro.datos as Record<string, unknown>).clientes = [{ EMPRESA: 'OTRA SA' }];
    (otro.datos as Record<string, unknown>).contactos = [];
    // Sin cotizaciones: las del respaldo son de ACME SA y, al no venir ya esa empresa,
    // crearían el buzón "Sin empresa (revisar tras migración)" — ruido para esta prueba.
    (otro.datos as Record<string, unknown>).cotizaciones = [];
    const r = await servicio.importar(actor(), otro, { modo: 'sustituir', simulacro: false, secciones: TODO });

    const nombres = (await empresas.list()).map((e) => e.nombre);
    expect(nombres).toEqual(['OTRA SA']);
    expect(await contactos.list()).toHaveLength(0);
    expect(r.borrado?.empresas).toBe(1);
  });

  it('en simulacro el modo sustituir cuenta lo que borraría pero no borra', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false, secciones: TODO });
    const r = await servicio.importar(actor(), respaldo(), { modo: 'sustituir', simulacro: true, secciones: TODO });
    expect(r.borrado?.empresas).toBe(1);
    expect(await empresas.list()).toHaveLength(1);
  });

  it('reporta los usuarios del respaldo que aún no tienen cuenta en ds-hd', async () => {
    const r = await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: true, secciones: TODO });
    expect(r.usuariosFaltantes).toBe(1);
  });

  it('solo toca las secciones marcadas', async () => {
    const r = await servicio.importar(actor(), respaldo(), {
      modo: 'actualizar',
      simulacro: false,
      secciones: ['empresas'],
    });
    expect(r.empresas).toBe(1);
    expect(r.contactos).toBe(0);
    expect(r.tickets).toBe(0);
    expect(await contactos.list()).toHaveLength(0);
    expect(await ticketQueries.listar({})).toHaveLength(0);
    expect(await eventos.list()).toHaveLength(0);
  });

  it('exige marcar al menos una sección', async () => {
    await expect(
      servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false, secciones: [] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('sustituir borra solo lo marcado: traer tickets no se lleva las empresas', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false, secciones: TODO });

    const otro = respaldo();
    (otro.datos as Record<string, unknown>).tickets = [{ numero: 99, asunto: 'Otro', descripcion: 'y' }];
    const r = await servicio.importar(actor(), otro, {
      modo: 'sustituir',
      simulacro: false,
      secciones: ['tickets'],
    });

    expect(r.borrado?.tickets).toBe(1);
    expect(r.borrado?.empresas).toBeUndefined();
    expect(await empresas.list()).toHaveLength(1);
    expect((await ticketQueries.listar({})).map((t) => t.numero)).toEqual([99]);
  });

  it('importa eventos con sus invitaciones, siempre como borrador', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false, secciones: ['eventos'] });
    const [ev] = await eventos.list();
    expect(ev?.titulo).toBe('Webinar de cierre anual');
    expect(ev?.estado).toBe('borrador');
    expect(ev?.invitaciones[0]).toMatchObject({
      empresaNombre: 'ACME SA',
      contactado: true,
      respuesta: 'asistira',
    });
    expect(ev?.invitadosExternos[0]).toMatchObject({ nombre: 'Luis Referido', respuesta: 'pendiente' });
  });

  it('importa cotizaciones conservando su folio original', async () => {
    const r = await servicio.importar(actor(), respaldo(), {
      modo: 'actualizar',
      simulacro: false,
      secciones: ['empresas', 'cotizaciones'],
    });
    expect(r.cotizaciones).toBe(1);
    const [cot] = await cotizaciones.list();
    expect(cot?.folio).toBe('COT-2026-007');
    expect(cot?.empresaId).toBe('acme-sa');
    expect(cot?.estado).toBe('enviada');
    expect(cot?.subtotal).toBe(2000);
    expect(cot?.vigenciaDias).toBe(15);
  });

  it('no duplica un contacto al que le corrigieron el correo en el CRM viejo', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false, secciones: TODO });
    expect(await contactos.list()).toHaveLength(1);

    // Mismo respaldo, con el correo de Diana corregido: es la misma persona, no una nueva.
    const corregido = respaldo();
    (corregido.datos as Record<string, unknown>).contactos = [
      { nombre: 'Diana', empresa: 'ACME SA', correo: 'diana.perez@acme.mx' },
    ];
    await servicio.importar(actor(), corregido, { modo: 'actualizar', simulacro: false, secciones: TODO });

    const lista = await contactos.list();
    expect(lista).toHaveLength(1);
    expect(lista[0]?.email).toBe('diana.perez@acme.mx');
  });

  it('tampoco duplica si en el respaldo la misma persona viene capturada dos veces', async () => {
    const doble = respaldo();
    (doble.datos as Record<string, unknown>).contactos = [
      { nombre: 'Diana', empresa: 'ACME SA', correo: 'diana@acme.mx' },
      { nombre: 'DIANA ', empresa: 'ACME SA', telefono1: '555' },
    ];
    await servicio.importar(actor(), doble, { modo: 'actualizar', simulacro: false, secciones: TODO });
    expect(await contactos.list()).toHaveLength(1);
  });

  it('al sustituir eventos también borra sus inscripciones (no las deja huérfanas)', async () => {
    await servicio.importar(actor(), respaldo(), { modo: 'actualizar', simulacro: false, secciones: ['eventos'] });
    const [ev] = await eventos.list();

    await servicio.importar(actor(), respaldo(), { modo: 'sustituir', simulacro: false, secciones: ['eventos'] });
    expect(inscripciones.borrados).toContain(ev!.id);
  });

  it('escribe TODOS los tickets con su detalle en una sola operación', async () => {
    // Lo que se fija aquí es el NÚMERO DE ESCRITURAS, no el resultado: una por ticket (y otra
    // por nota y por entrada de actividad) eran cientos de peticiones HTTP y la importación
    // moría contra el tope de subpeticiones del worker, dejando la base a medias.
    const llamadas = { guardarVariosConDetalle: 0, guardarConDetalle: 0, save: 0, agregarNota: 0, registrarEvento: 0 };
    const real = repos.ticketRepo as InMemoryTicketRepository;
    repos.ticketRepo = new Proxy(real, {
      get(obj, prop: string) {
        if (prop in llamadas) llamadas[prop as keyof typeof llamadas]++;
        return Reflect.get(obj, prop).bind(obj);
      },
    });

    const conDetalle = respaldo();
    (conDetalle.datos as Record<string, unknown>).tickets = [10, 11, 12].map((numero) => ({
      numero,
      asunto: `Ticket ${numero}`,
      descripcion: 'x',
      notas: [{ texto: 'llamé al cliente', fecha: '2026-01-02' }],
      actividad: [
        { texto: 'pasó a en proceso', fecha: '2026-01-02' },
        { texto: 'cerrado', fecha: '2026-01-03' },
      ],
    }));
    await servicio.importar(actor(), conDetalle, {
      modo: 'actualizar',
      simulacro: false,
      secciones: ['tickets'],
    });

    // Tres tickets, tres notas y seis eventos: UNA escritura, no diez.
    expect(llamadas.guardarVariosConDetalle).toBe(1);
    expect(llamadas.guardarConDetalle).toBe(0);
    expect(llamadas.agregarNota).toBe(0);
    expect(llamadas.registrarEvento).toBe(0);
    // Y el contenido sigue llegando entero.
    expect(await real.listarNotas('tic-10')).toHaveLength(1);
    expect(await real.listarEventos('tic-12')).toHaveLength(2);
  });

  it('no funde personas distintas que comparten un correo (despacho, correo de oficina)', async () => {
    const compartido = respaldo();
    (compartido.datos as Record<string, unknown>).clientes = [{ EMPRESA: 'ACME SA' }, { EMPRESA: 'OTRA SA' }];
    (compartido.datos as Record<string, unknown>).contactos = [
      { nombre: 'Martha', empresa: 'ACME SA', correo: 'despacho@contable.mx' },
      { nombre: 'Luis', empresa: 'OTRA SA', correo: 'despacho@contable.mx' },
    ];
    await servicio.importar(actor(), compartido, {
      modo: 'actualizar',
      simulacro: false,
      secciones: ['empresas', 'contactos'],
    });
    expect((await contactos.list()).map((c) => c.nombre).sort()).toEqual(['Luis', 'Martha']);
  });
});
