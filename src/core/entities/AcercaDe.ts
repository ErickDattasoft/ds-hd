/**
 * "Acerca de" — ficha de identidad de la aplicación (paridad con el modal del CRM viejo).
 *
 * Se divide en dos: {@link INFO_APP} es fijo (nombre, autoría, stack, enlaces de infraestructura)
 * y vive en el código; {@link AcercaDe} es la parte editable por un admin y se guarda en el
 * documento singleton `configuracion/acercaDe`.
 */
export interface AcercaDe {
  /** Sobrescribe la versión leída de `package.json`. Vacío = usar `APP_VERSION`. */
  version: string;
  /** Texto libre, p. ej. "Septiembre 2026". */
  ultimaActualizacion: string;
  /** Notas / bitácora de cambios que el admin quiera dejar a la vista. */
  notas: string;
}

export const ACERCA_DE_POR_DEFECTO: AcercaDe = {
  version: '',
  ultimaActualizacion: '',
  notas: '',
};

/** Enlace útil que se muestra en "Acerca de" (solo a quien pueda editar la config). */
export interface EnlaceApp {
  etiqueta: string;
  url: string;
  icono: string;
}

/** Datos fijos de la app — no se editan desde la UI. */
export const INFO_APP = {
  nombre: 'DATTASOFT CRM',
  descripcion: 'Sistema de gestión de clientes y soporte técnico',
  desarrolladoPor: 'Erick Casas',
  empresa: 'DATTASOFT BY INFOXPERT',
  stack: 'Node · Express · TypeScript · Nunjucks · Firestore · Cloudflare Workers · Brevo',
  enlaces: [
    { etiqueta: 'GitHub — ErickDattasoft/ds-hd', url: 'https://github.com/ErickDattasoft/ds-hd', icono: '🐙' },
    { etiqueta: 'Cloudflare Workers — ds-hd.erick-casas.workers.dev', url: 'https://ds-hd.erick-casas.workers.dev', icono: '☁️' },
    { etiqueta: 'Firebase Firestore — ds-hd-b4939', url: 'https://console.firebase.google.com/project/ds-hd-b4939/firestore', icono: '🔥' },
    { etiqueta: 'Brevo — envío de correos', url: 'https://app.brevo.com', icono: '✉️' },
  ] satisfies EnlaceApp[],
} as const;

/** Normaliza el documento leído de Firestore, rellenando lo que falte con los valores por defecto. */
export function sanearAcercaDe(v: unknown): AcercaDe {
  const d = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    version: String(d.version ?? ACERCA_DE_POR_DEFECTO.version),
    ultimaActualizacion: String(d.ultimaActualizacion ?? ACERCA_DE_POR_DEFECTO.ultimaActualizacion),
    notas: String(d.notas ?? ACERCA_DE_POR_DEFECTO.notas),
  };
}
