/**
 * Correo entrante: el CRM revisa cada hora un buzón de Zoho Mail y mete las respuestas de los
 * clientes como nota en su ticket (documento `configuracion/correo_entrante`).
 *
 * Usa la API de Zoho Mail con OAuth, así que NO hace falta tocar el DNS del dominio: basta
 * autorizar una vez la aplicación en la consola de Zoho y pegar aquí el refresh token.
 */
export interface ConfiguracionCorreoEntrante {
  habilitado: boolean;
  /** Dominio de Zoho de la cuenta: `com`, `eu`, `in`, `com.au`, `jp`, `ca`. */
  region: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Id de la cuenta de Zoho Mail (lo descubre el botón "Probar conexión"). */
  accountId: string;
  /** Carpeta a revisar; vacío = Inbox. */
  carpeta: string;
  /** Solo se aceptan respuestas del correo del contacto del ticket (recomendado). */
  soloContactoDelTicket: boolean;
  /** Resultado de la última revisión, para verlo en Configuración. */
  ultimaRevision: string | null;
  ultimoResultado: string | null;
}

export const CONFIG_CORREO_ENTRANTE_POR_DEFECTO: ConfiguracionCorreoEntrante = {
  habilitado: false,
  region: 'com',
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  accountId: '',
  carpeta: '',
  soloContactoDelTicket: true,
  ultimaRevision: null,
  ultimoResultado: null,
};

/** Rellena una config parcial de Firestore con los valores por defecto. */
export function sanearConfigCorreoEntrante(d: unknown): ConfiguracionCorreoEntrante {
  const o = (d ?? {}) as Partial<ConfiguracionCorreoEntrante>;
  return {
    ...CONFIG_CORREO_ENTRANTE_POR_DEFECTO,
    ...o,
    habilitado: o.habilitado === true,
    soloContactoDelTicket: o.soloContactoDelTicket !== false,
    region: String(o.region ?? 'com'),
  };
}

/**
 * Número de ticket en un asunto (`[Ticket #123] …`, `Re: Ticket #123`, `#123`).
 * `null` si el asunto no trae ninguno: sin número no hay a qué ticket pegar la respuesta.
 */
export function numeroTicketDeAsunto(asunto: string): number | null {
  const m = /#\s*(\d{1,9})/.exec(asunto ?? '');
  return m ? Number(m[1]) : null;
}

/**
 * Deja solo lo que el cliente escribió: corta en la primera línea de cita ("El ... escribió:",
 * "-----Original Message-----", "> …") para no repetir el hilo completo en cada nota.
 */
export function cuerpoSinCita(texto: string): string {
  const lineas = (texto ?? '').replace(/\r\n/g, '\n').split('\n');
  const corte = lineas.findIndex((l) =>
    /^\s*(>|-{2,}\s*(mensaje|original)|de:|from:|el .+ escribió:|on .+ wrote:|_{5,})/i.test(l),
  );
  return (corte >= 0 ? lineas.slice(0, corte) : lineas).join('\n').trim();
}
