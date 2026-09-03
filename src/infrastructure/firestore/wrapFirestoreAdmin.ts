import type { Firestore } from 'firebase-admin/firestore';
import { aDominio, aFirestore } from './timestampBoundary.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Envuelve el `Firestore` real de `firebase-admin` para que, de forma transparente, cada
 * lectura devuelva `core/entities/value-objects/Timestamp` (lo que esperan los mappers) en
 * vez del `Timestamp` propio del SDK, y cada escritura haga la conversión inversa. Cubre
 * exactamente los métodos que usan los repositorios de `infrastructure/firestore/` hoy:
 * `collection`, `collectionGroup`, `doc`, `where`, `orderBy`, `limit`, `get`, `set`, `count`,
 * `runTransaction` (con `tx.get`/`tx.set`). Si algún repo empieza a usar un método nuevo del
 * SDK, esta envoltura lo deja pasar sin tocar (proxy transparente por defecto) — solo
 * intercepta los puntos donde puede viajar un Timestamp.
 */
export function wrapFirestoreAdmin(db: Firestore): Firestore {
  return new Proxy(db, {
    get(target: any, prop, receiver) {
      if (prop === 'collection' || prop === 'collectionGroup') {
        return (...args: any[]) => wrapQuery(target[prop](...args));
      }
      if (prop === 'runTransaction') {
        return (fn: (tx: any) => Promise<any>) => target.runTransaction((tx: any) => fn(wrapTransaction(tx)));
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as Firestore;
}

function wrapQuery(q: any): any {
  return new Proxy(q, {
    get(target: any, prop, receiver) {
      if (prop === 'get') {
        return async () => wrapQuerySnapshot(await target.get());
      }
      if (prop === 'doc') {
        return (...args: any[]) => wrapDocRef(target.doc(...args));
      }
      if (prop === 'where') {
        return (field: any, op: any, value: any) => wrapQuery(target.where(field, op, aFirestore(value)));
      }
      if (prop === 'orderBy' || prop === 'limit') {
        return (...args: any[]) => wrapQuery(target[prop](...args));
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

function wrapDocRef(ref: any): any {
  return new Proxy(ref, {
    get(target: any, prop, receiver) {
      if (prop === 'get') {
        return async () => wrapDocSnapshot(await target.get());
      }
      if (prop === 'set') {
        return (data: any, opts?: any) => target.set(aFirestore(data), opts);
      }
      if (prop === 'collection') {
        return (...args: any[]) => wrapQuery(target.collection(...args));
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

function wrapDocSnapshot(snap: any): any {
  return new Proxy(snap, {
    get(target: any, prop, receiver) {
      if (prop === 'data') {
        return () => {
          const d = target.data();
          return d === undefined ? undefined : aDominio(d);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

function wrapQuerySnapshot(snap: any): any {
  return new Proxy(snap, {
    get(target: any, prop, receiver) {
      if (prop === 'docs') return target.docs.map((d: any) => wrapDocSnapshot(d));
      return Reflect.get(target, prop, receiver);
    },
  });
}

function wrapTransaction(tx: any): any {
  return new Proxy(tx, {
    get(target: any, prop, receiver) {
      if (prop === 'get') {
        return async (ref: any) => wrapDocSnapshot(await target.get(ref));
      }
      if (prop === 'set') {
        return (ref: any, data: any, opts?: any) => target.set(ref, aFirestore(data), opts);
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
