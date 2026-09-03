/**
 * Cliente de Firestore contra la API REST (`firestore.googleapis.com/v1`), respaldado 100%
 * por `fetch` — corre igual en Node 22 (dev) y en Cloudflare Workers (producción), sin
 * `firebase-admin` ni gRPC.
 *
 * Implementa exactamente la superficie que usan hoy los repos de `infrastructure/firestore/`
 * (`collection`/`collectionGroup`/`doc`/`where`/`orderBy`/`limit`/`get`/`set`/`update`/
 * `delete`/`count`/`runTransaction`) con la misma forma que el SDK Admin, de modo que se
 * inyecta en su lugar sin tocar los repos (se castea a `Firestore` en el composition root,
 * igual que hoy se castea el Proxy de `wrapFirestoreAdmin`).
 */
import { makeBearerTokenGetter, type ServiceAccount } from './serviceAccountAuth.js';
import {
  fromRestFields,
  toRest,
  toRestFields,
  type RestFields,
  type RestValue,
} from './valueCodec.js';

const OP_REST: Record<string, string> = {
  '==': 'EQUAL',
  '<': 'LESS_THAN',
  '<=': 'LESS_THAN_OR_EQUAL',
  '>': 'GREATER_THAN',
  '>=': 'GREATER_THAN_OR_EQUAL',
  '!=': 'NOT_EQUAL',
  in: 'IN',
  'array-contains': 'ARRAY_CONTAINS',
  'not-in': 'NOT_IN',
};

interface RestDocument {
  name: string;
  fields?: RestFields;
  createTime?: string;
  updateTime?: string;
}

type WhereClause = { field: string; op: string; value: unknown };
type OrderClause = { field: string; dir: 'asc' | 'desc' };

interface QueryState {
  /** Ruta del documento padre relativa a `.../documents` (vacío = raíz). */
  parent: string;
  collectionId: string;
  allDescendants: boolean;
  wheres: WhereClause[];
  orders: OrderClause[];
  limit?: number;
}

/** `snap.data()` ya viene deserializado a objetos JS planos (+ `Timestamp` propio). */
export class RestDocumentSnapshot {
  constructor(
    readonly ref: RestDocumentReference,
    private readonly doc: RestDocument | null,
  ) {}
  get exists(): boolean {
    return this.doc !== null;
  }
  get id(): string {
    return this.ref.id;
  }
  data(): Record<string, unknown> | undefined {
    return this.doc ? fromRestFields(this.doc.fields ?? {}) : undefined;
  }
}

class RestQuerySnapshot {
  constructor(readonly docs: RestDocumentSnapshot[]) {}
  get empty(): boolean {
    return this.docs.length === 0;
  }
  get size(): number {
    return this.docs.length;
  }
  forEach(fn: (d: RestDocumentSnapshot) => void): void {
    this.docs.forEach(fn);
  }
}

/** Referencia perezosa a `<parent>/<collectionId>/<id>` — no hace red hasta `get()`. */
export class RestDocumentReference {
  constructor(
    private readonly client: FirestoreRestClient,
    /** Ruta relativa a `.../documents`, p. ej. `eventos/e1/inscripciones/i2`. */
    readonly path: string,
  ) {}
  get id(): string {
    return this.path.slice(this.path.lastIndexOf('/') + 1);
  }
  /** `{ parent: { parent: { id } } }` — solo se usa `ref.parent.parent?.id` (collectionGroup). */
  get parent(): { parent: { id: string } | null } {
    const partes = this.path.split('/');
    partes.pop(); // id del doc
    partes.pop(); // collectionId
    if (partes.length < 2) return { parent: null };
    return { parent: { id: partes[partes.length - 1]! } };
  }
  collection(id: string): RestCollectionReference {
    return new RestCollectionReference(this.client, this.path, id);
  }
  async get(): Promise<RestDocumentSnapshot> {
    return this.client._getDoc(this);
  }
  async set(data: Record<string, unknown>, opts?: { merge?: boolean }): Promise<void> {
    return this.client._write([this.client._updateWrite(this.path, data, opts?.merge ?? false)]);
  }
  async update(data: Record<string, unknown>): Promise<void> {
    return this.client._write([this.client._updateWrite(this.path, data, true, true)]);
  }
  async delete(): Promise<void> {
    return this.client._write([{ delete: this.client._name(this.path) }]);
  }
}

/** `Query` sobre una colección (o collection-group). Inmutable: cada método devuelve otra. */
export class RestQuery {
  constructor(
    protected readonly client: FirestoreRestClient,
    protected readonly state: QueryState,
  ) {}
  private con(delta: Partial<QueryState>): RestQuery {
    return new RestQuery(this.client, { ...this.state, ...delta });
  }
  where(field: string, op: string, value: unknown): RestQuery {
    return this.con({ wheres: [...this.state.wheres, { field, op, value }] });
  }
  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): RestQuery {
    return this.con({ orders: [...this.state.orders, { field, dir }] });
  }
  limit(n: number): RestQuery {
    return this.con({ limit: n });
  }
  count(): { get(): Promise<{ data(): { count: number } }> } {
    return {
      get: async () => {
        const count = await this.client._runCount(this.state);
        return { data: () => ({ count }) };
      },
    };
  }
  async get(): Promise<RestQuerySnapshot> {
    return this.client._runQuery(this.state);
  }
}

export class RestCollectionReference extends RestQuery {
  constructor(client: FirestoreRestClient, parent: string, collectionId: string) {
    super(client, {
      parent,
      collectionId,
      allDescendants: false,
      wheres: [],
      orders: [],
    });
  }
  doc(id?: string): RestDocumentReference {
    const finalId = id ?? crypto.randomUUID();
    const base = this.state.parent ? `${this.state.parent}/` : '';
    return new RestDocumentReference(this.client, `${base}${this.state.collectionId}/${finalId}`);
  }
}

class RestTransaction {
  constructor(
    private readonly client: FirestoreRestClient,
    private readonly id: string,
    readonly writes: object[],
  ) {}
  async get(ref: RestDocumentReference): Promise<RestDocumentSnapshot> {
    return this.client._getDoc(ref, this.id);
  }
  set(ref: RestDocumentReference, data: Record<string, unknown>, opts?: { merge?: boolean }): void {
    this.writes.push(this.client._updateWrite(ref.path, data, opts?.merge ?? false));
  }
  update(ref: RestDocumentReference, data: Record<string, unknown>): void {
    this.writes.push(this.client._updateWrite(ref.path, data, true, true));
  }
  delete(ref: RestDocumentReference): void {
    this.writes.push({ delete: this.client._name(ref.path) });
  }
}

export interface FirestoreRestOptions {
  projectId: string;
  /** Credenciales para producción. Omitir junto con `emulatorHost` para el emulador. */
  serviceAccount?: ServiceAccount;
  /** `host:puerto` del emulador de Firestore (dev/tests). Si se da, no se firma ningún JWT. */
  emulatorHost?: string;
  /** Base URL explícita (tiene prioridad sobre `emulatorHost`). */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class FirestoreRestClient {
  private readonly obtenerToken: () => Promise<string>;
  /** Nombre de recurso relativo: `projects/{id}/databases/(default)/documents`. */
  private readonly resourcePrefix: string;
  /** URL absoluta a ese mismo punto: `https://.../v1/projects/.../documents`. */
  private readonly docsUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: FirestoreRestOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.obtenerToken = makeBearerTokenGetter(opts.serviceAccount, this.fetchImpl);
    const base =
      opts.baseUrl ??
      (opts.emulatorHost
        ? `http://${opts.emulatorHost}/v1`
        : 'https://firestore.googleapis.com/v1');
    this.resourcePrefix = `projects/${opts.projectId}/databases/(default)/documents`;
    this.docsUrl = `${base}/${this.resourcePrefix}`;
  }

  collection(path: string): RestCollectionReference {
    const partes = path.split('/');
    const collectionId = partes.pop()!;
    return new RestCollectionReference(this, partes.join('/'), collectionId);
  }

  collectionGroup(collectionId: string): RestQuery {
    return new RestQuery(this, {
      parent: '',
      collectionId,
      allDescendants: true,
      wheres: [],
      orders: [],
    });
  }

  doc(path: string): RestDocumentReference {
    return new RestDocumentReference(this, path);
  }

  async runTransaction<T>(fn: (tx: RestTransaction) => Promise<T>): Promise<T> {
    const begin = await this.call(`${this.docsUrl}:beginTransaction`, {});
    const { transaction } = (await begin.json()) as { transaction: string };
    const tx = new RestTransaction(this, transaction, []);
    const resultado = await fn(tx);
    await this.call(`${this.docsUrl}:commit`, { writes: tx.writes, transaction });
    return resultado;
  }

  // ── internos (los usan las clases de arriba) ─────────────────────────────

  /** Nombre de recurso relativo (`projects/.../documents/<path>`) para `update`/`delete`. */
  _name(path: string): string {
    return `${this.resourcePrefix}/${path}`;
  }

  _updateWrite(
    path: string,
    data: Record<string, unknown>,
    merge: boolean,
    exists = false,
  ): object {
    const fields = toRestFields(data);
    const write: Record<string, unknown> = { update: { name: this._name(path), fields } };
    if (merge) write.updateMask = { fieldPaths: Object.keys(fields) };
    if (exists) write.currentDocument = { exists: true };
    return write;
  }

  async _getDoc(ref: RestDocumentReference, transaction?: string): Promise<RestDocumentSnapshot> {
    // Se usa `:batchGet` (POST) en vez de `documents.get`: es lo que permite pasar la
    // transacción en el body (`documents.get?transaction=` cuelga en el emulador) y sirve
    // igual para lecturas sueltas.
    const res = await this.call(`${this.docsUrl}:batchGet`, {
      documents: [this._name(ref.path)],
      ...(transaction ? { transaction } : {}),
    });
    const filas = (await res.json()) as Array<{ found?: RestDocument; missing?: string }>;
    return new RestDocumentSnapshot(ref, filas.find((f) => f.found)?.found ?? null);
  }

  async _write(writes: object[]): Promise<void> {
    if (writes.length === 0) return;
    await this.call(`${this.docsUrl}:commit`, { writes });
  }

  private structuredQuery(state: QueryState): object {
    const sq: Record<string, unknown> = {
      from: [{ collectionId: state.collectionId, allDescendants: state.allDescendants }],
    };
    if (state.wheres.length === 1) {
      sq.where = this.fieldFilter(state.wheres[0]!);
    } else if (state.wheres.length > 1) {
      sq.where = {
        compositeFilter: { op: 'AND', filters: state.wheres.map((w) => this.fieldFilter(w)) },
      };
    }
    if (state.orders.length) {
      sq.orderBy = state.orders.map((o) => ({
        field: { fieldPath: o.field },
        direction: o.dir === 'desc' ? 'DESCENDING' : 'ASCENDING',
      }));
    }
    if (state.limit !== undefined) sq.limit = state.limit;
    return sq;
  }

  private fieldFilter(w: WhereClause): object {
    const op = OP_REST[w.op];
    if (!op) throw new Error(`FirestoreRestClient: operador no soportado '${w.op}'`);
    let value: RestValue;
    if (w.op === 'in' || w.op === 'not-in') {
      value = {
        arrayValue: {
          values: (w.value as unknown[]).map((v) => toRest(v) ?? { nullValue: null }),
        },
      };
    } else {
      value = toRest(w.value) ?? { nullValue: null };
    }
    return { fieldFilter: { field: { fieldPath: w.field }, op, value } };
  }

  private parentUrl(state: QueryState): string {
    return state.parent ? `${this.docsUrl}/${state.parent}` : this.docsUrl;
  }

  async _runQuery(state: QueryState): Promise<RestQuerySnapshot> {
    const res = await this.call(`${this.parentUrl(state)}:runQuery`, {
      structuredQuery: this.structuredQuery(state),
    });
    const filas = (await res.json()) as Array<{ document?: RestDocument }>;
    const docs = filas
      .filter((f) => f.document)
      .map((f) => {
        const doc = f.document!;
        const path = doc.name.slice(doc.name.indexOf('/documents/') + '/documents/'.length);
        return new RestDocumentSnapshot(new RestDocumentReference(this, path), doc);
      });
    return new RestQuerySnapshot(docs);
  }

  async _runCount(state: QueryState): Promise<number> {
    const res = await this.call(`${this.parentUrl(state)}:runAggregationQuery`, {
      structuredAggregationQuery: {
        structuredQuery: this.structuredQuery({ ...state, limit: undefined }),
        aggregations: [{ alias: 'c', count: {} }],
      },
    });
    const filas = (await res.json()) as Array<{ result?: { aggregateFields?: { c?: RestValue } } }>;
    const raw = filas[0]?.result?.aggregateFields?.c?.integerValue;
    return raw ? Number(raw) : 0;
  }

  // ── HTTP ─────────────────────────────────────────────────────────────────

  private async fetchAuthed(url: string, init?: RequestInit): Promise<Response> {
    const token = await this.obtenerToken();
    return this.fetchImpl(url, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  }

  private async call(url: string, body: unknown): Promise<Response> {
    const res = await this.fetchAuthed(url, { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) throw await this.error(url, res);
    return res;
  }

  private async error(ctx: string, res: Response): Promise<Error> {
    return new Error(`FirestoreRest ${ctx}: ${res.status} ${await res.text()}`);
  }
}
