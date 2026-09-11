/** Config del resumen diario por correo (documento `configuracion/resumen`). */
export interface ConfiguracionResumen {
  habilitado: boolean;
  /** Correos que reciben el resumen. */
  destinatarios: string[];
  /** Hora local (America/Mexico_City), 0-23, en la que el job de cron lo envía. */
  horaEnvio: number;
  /** Fecha local (`YYYY-MM-DD`) del último envío automático, para no repetirlo el mismo día. */
  ultimoEnvio: string | null;
}

export const CONFIG_RESUMEN_POR_DEFECTO: ConfiguracionResumen = {
  habilitado: false,
  destinatarios: [],
  horaEnvio: 7,
  ultimoEnvio: null,
};

/** Rellena una config parcial de Firestore con los valores por defecto. */
export function sanearConfigResumen(d: unknown): ConfiguracionResumen {
  const o = (d ?? {}) as Record<string, unknown>;
  const hora = Number(o.horaEnvio);
  return {
    habilitado: Boolean(o.habilitado),
    destinatarios: Array.isArray(o.destinatarios) ? o.destinatarios.map(String) : [],
    horaEnvio: Number.isFinite(hora) && hora >= 0 && hora <= 23 ? hora : CONFIG_RESUMEN_POR_DEFECTO.horaEnvio,
    ultimoEnvio: typeof o.ultimoEnvio === 'string' ? o.ultimoEnvio : null,
  };
}
