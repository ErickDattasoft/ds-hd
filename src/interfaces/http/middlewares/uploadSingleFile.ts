import busboy from 'busboy';
import type { RequestHandler } from 'express';

/** Archivo recibido por `uploadSingleFile`, guardado en memoria (nunca toca disco). */
export interface ArchivoSubido {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/**
 * Parsea un único campo de archivo de un `multipart/form-data` y lo deja en `req.file`
 * como buffer en memoria. Reemplaza a `multer` porque su `index.js` importa
 * incondicionalmente `storage/disk.js` (que requiere `node:os`), lo que rompe el build
 * de Cloudflare Workers aunque solo se use `memoryStorage()` — `busboy` (que multer usa
 * por dentro para parsear) no tiene esa dependencia.
 */
export function uploadSingleFile(fieldName: string, maxBytes: number): RequestHandler {
  return (req, res, next) => {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.startsWith('multipart/form-data')) return next();

    const bb = busboy({ headers: req.headers, limits: { fileSize: maxBytes, files: 1 } });
    let recibido = false;

    bb.on('file', (name, stream, info) => {
      if (name !== fieldName) {
        stream.resume();
        return;
      }
      recibido = true;
      const partes: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => partes.push(chunk));
      stream.on('end', () => {
        req.file = { buffer: Buffer.concat(partes), originalname: info.filename, mimetype: info.mimeType };
      });
    });
    bb.on('error', (err) => next(err instanceof Error ? err : new Error('No se pudo leer el archivo subido')));
    bb.on('close', () => {
      if (!recibido) req.file = undefined;
      next();
    });
    req.pipe(bb);
  };
}
