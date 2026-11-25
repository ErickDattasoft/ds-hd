import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IRespuestaSinLeerRepository } from '../../core/ports/repositories/IRespuestaSinLeerRepository.js';
import type { RespuestaSinLeer } from '../../core/entities/RespuestaSinLeer.js';
import { normalizarDistribuidor } from '../../core/entities/Ticket.js';
import type { CacheColecciones } from './CacheColecciones.js';

const COL = 'respuestas_sin_leer';

interface Doc {
  numero?: number;
  asunto?: string;
  empresaNombre?: string | null;
  autorNombre?: string;
  extracto?: string;
  at?: Timestamp;
  agenteAsignadoUid?: string | null;
  agenteAsignadoNombre?: string | null;
  canalizadoA?: string | null;
  distribuidor?: string | null;
  leidaPor?: { uid?: string; nombre?: string }[];
}

const toDomain = (id: string, d: Doc): RespuestaSinLeer => ({
  ticketId: id,
  numero: Number(d.numero ?? 0),
  asunto: String(d.asunto ?? ''),
  empresaNombre: d.empresaNombre ?? null,
  autorNombre: String(d.autorNombre ?? ''),
  extracto: String(d.extracto ?? ''),
  at: d.at instanceof Timestamp ? d.at.toDate() : new Date(0),
  agenteAsignadoUid: d.agenteAsignadoUid ?? null,
  agenteAsignadoNombre: d.agenteAsignadoNombre ?? null,
  canalizadoA: d.canalizadoA ?? null,
  distribuidor: normalizarDistribuidor(d.distribuidor),
  leidaPor: Array.isArray(d.leidaPor)
    ? d.leidaPor.filter((p) => p && p.uid).map((p) => ({ uid: String(p.uid), nombre: String(p.nombre ?? '') }))
    : [],
});

/** Sirve para ambos drivers (Admin SDK y REST): solo get/set/delete por id y la colección entera. */
export class FirestoreRespuestaSinLeerRepository implements IRespuestaSinLeerRepository {
  /**
   * `cache`: copia en memoria con sello de cambios (ver {@link CacheColecciones}). La campana 🔔
   * consulta cada minuto en cada pestaña: sin copia, cada vuelta leía TODOS los avisos (~50
   * lecturas) y con dos personas trabajando se acababa la cuota diaria. Con ella lee 1 (el sello).
   */
  constructor(
    private readonly db: Firestore,
    private readonly cache?: CacheColecciones,
  ) {}

  async guardar(r: RespuestaSinLeer): Promise<void> {
    await this.db.collection(COL).doc(r.ticketId).set({
      numero: r.numero,
      asunto: r.asunto,
      empresaNombre: r.empresaNombre,
      autorNombre: r.autorNombre,
      extracto: r.extracto,
      at: Timestamp.fromDate(r.at),
      agenteAsignadoUid: r.agenteAsignadoUid,
      agenteAsignadoNombre: r.agenteAsignadoNombre,
      canalizadoA: r.canalizadoA,
      distribuidor: r.distribuidor,
      // Respuesta nueva: vuelve a estar pendiente para todos.
      leidaPor: [],
    });
    await this.cache?.marcarCambio(COL);
  }

  async marcarLeidaPor(ticketId: string, persona: { uid: string; nombre: string }): Promise<boolean> {
    // Con la copia en memoria no cuesta lectura saber si había aviso (lo normal es que no).
    const actual = this.cache
      ? (await this.listar()).find((r) => r.ticketId === ticketId) ?? null
      : await this.db
          .collection(COL)
          .doc(ticketId)
          .get()
          .then((s) => (s.exists ? toDomain(s.id, s.data() as Doc) : null));
    if (!actual || (actual.leidaPor ?? []).some((p) => p.uid === persona.uid)) return false;
    await this.db
      .collection(COL)
      .doc(ticketId)
      .set({ leidaPor: [...(actual.leidaPor ?? []), { uid: persona.uid, nombre: persona.nombre }] }, { merge: true });
    await this.cache?.marcarCambio(COL);
    return true;
  }

  async listar(): Promise<RespuestaSinLeer[]> {
    if (this.cache) return (await this.cache.todos(COL)).map((d) => toDomain(d.id, d.data as Doc));
    const snap = await this.db.collection(COL).get();
    return snap.docs.map((d) => toDomain(d.id, d.data() as Doc));
  }

  async quitar(ticketId: string): Promise<boolean> {
    // Se lee antes de borrar: abrir un ticket sin respuestas pendientes (lo normal) no escribe nada.
    const ref = this.db.collection(COL).doc(ticketId);
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    await this.cache?.marcarCambio(COL);
    return true;
  }
}
