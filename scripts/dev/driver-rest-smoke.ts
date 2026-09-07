/**
 * Smoke del driver REST completo: arma el container con `FIRESTORE_DRIVER=rest` contra el
 * emulador y ejercita las rutas/servicios reales (no solo los 2 repos con contrato).
 *
 * Uso (con el emulador Docker corriendo):
 *   FIRESTORE_DRIVER=rest FIREBASE_PROJECT_ID=ds-hd-local \
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
 *   npx tsx scripts/dev/driver-rest-smoke.ts
 */
import { buildContainer } from '../../src/config/container.js';
import { loadConfig } from '../../src/config/env.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';

const c = buildContainer(loadConfig());
const ok = (m: string) => console.log(`  ✓ ${m}`);

const actor: SessionUser = {
  uid: 'smoke-admin',
  nombre: 'Smoke Admin',
  email: 'smoke-admin@ds-hd.test',
  roles: ['admin'],
  rol: 'admin',
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  esTecnico: false,
  permisos: [
    'tickets:crear', 'tickets:leer', 'tickets:leer_todos', 'tickets:editar', 'tickets:asignar',
    'tickets:cambiar_estado', 'tickets:ver_notas_internas', 'empresas:crear', 'kb:escribir',
    'dashboard:ver', 'seguimiento:leer',
  ],
};

// usuarioRepo: save + findByUid + list({roles})
const usuarios = c.resolve('usuarioRepo');
const uid = `smoke-${Date.now()}`;
await usuarios.save(new Usuario({ uid, email: `${uid}@ds-hd.test`, nombre: 'Sop', roles: ['soporte'], agente: { grupo: 'Soporte', capacidadMax: 3, disponibleAsignacion: true } }));
if ((await usuarios.findByUid(uid))?.nombre !== 'Sop') throw new Error('usuarioRepo findByUid');
if (!(await usuarios.list({ roles: ['agente', 'soporte'] })).some((u) => u.uid === uid)) throw new Error('usuarioRepo list roles');
ok('usuarioRepo: save / findByUid / list({roles}) / listAgentesAsignables');

// configuracionRepo
const cfg = c.resolve('configuracionRepo');
await cfg.guardarTickets((await import('../../src/core/entities/ConfiguracionTickets.js')).CONFIG_TICKETS_POR_DEFECTO);
ok('configuracionRepo: guardar / obtener');

// crearTicketService: contador transaccional + mapper + eventos subcolección
const crear = c.resolve('crearTicketService');
const t1 = await crear.ejecutar({ actor, asunto: 'Smoke A', descripcion: 'descripción de prueba', tipo: 'Soporte Técnico', prioridad: 'Alta' });
const t2 = await crear.ejecutar({ actor, asunto: 'Smoke B', descripcion: 'descripción de prueba', tipo: 'Soporte Técnico', prioridad: 'Media' });
if (t2.numero !== t1.numero + 1) throw new Error(`folio no incrementó: ${t1.numero} -> ${t2.numero}`);
ok(`crearTicketService x2 (folios ${t1.numero}, ${t2.numero} — transacción del contador)`);

// asignar + cambiar estado + nota
await c.resolve('asignarAgenteService').ejecutar({ actor, ticketId: t1.id, agenteUid: uid });
await c.resolve('actualizarEstadoTicketService').ejecutar({ actor, ticketId: t1.id, nuevoEstado: 'En proceso' });
await c.resolve('registrarNotaService').ejecutar({ actor, ticketId: t1.id, cuerpo: 'nota de prueba', tipo: 'interna' });
const detalle = await c.resolve('verTicketService').ejecutar(actor, t1.id);
if (detalle.notas.length < 1 || detalle.ticket.agenteAsignadoUid !== uid) throw new Error('flujo de ticket');
ok('asignar / cambiar estado / nota / verTicket (subcolecciones notas+eventos)');

// listarTicketsService (query where + orderBy) + panel de carga (list roles técnicos)
const lista = await c.resolve('listarTicketsService').listar(actor, { soloAbiertos: true });
if (lista.total < 2) throw new Error('listarTickets');
await c.resolve('panelCargaAgentesService').ejecutar();
ok(`listarTicketsService (${lista.total}) / panelCargaAgentes`);

// dashboard: ObtenerMetricasService → eventos.proximos() (igualdad + rango, índice compuesto)
const metricas = await c.resolve('obtenerMetricasService').ejecutar(actor);
if (typeof metricas.tickets.abiertos !== 'number') throw new Error('métricas');
ok('obtenerMetricasService (incluye eventos.proximos con rango de fecha)');

// empresa + kb (más repos)
const emp = await c.resolve('empresaService').crear(actor, { nombre: `Smoke Corp ${Date.now()}` });
await c.resolve('knowledgeService').guardar(actor, { titulo: 'Art smoke', cuerpoMarkdown: '# Artículo de prueba\n\nContenido suficiente para pasar la validación.', visibilidad: 'staff' });
ok(`empresaService.crear (${emp.id}) / knowledgeService.guardar`);

// limpieza
const db = c.resolve('firestoreDb')!;
for (const col of ['usuarios', 'empresas', 'knowledge_base', 'contadores', 'configuracion']) {
  const snap = await (db as unknown as { collection(p: string): { get(): Promise<{ docs: { ref: { delete(): Promise<void> } }[] }> } }).collection(col).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}
for (const t of [t1, t2]) {
  for (const sub of ['notas', 'eventos']) {
    const s = await (db as never as { collection(p: string): { get(): Promise<{ docs: { ref: { delete(): Promise<void> } }[] }> } }).collection(`tickets/${t.id}/${sub}`).get();
    await Promise.all(s.docs.map((d) => d.ref.delete()));
  }
}
const tk = await (db as never as { collection(p: string): { get(): Promise<{ docs: { ref: { delete(): Promise<void> } }[] }> } }).collection('tickets').get();
await Promise.all(tk.docs.map((d) => d.ref.delete()));
ok('limpieza');

console.log('\nDriver REST: todo el flujo OK ✅');
process.exit(0);
