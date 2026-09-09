/** Config del módulo de cotizaciones (documento `configuracion/cotizaciones`). */
export interface ConfiguracionCotizaciones {
  /** Condiciones / términos que se precargan al crear una cotización. */
  condicionesPorDefecto: string;
  /** Cargo del emisor que se sugiere si el usuario no llena el campo. */
  emisorCargoPorDefecto: string;
  /** Teléfono del emisor que se sugiere si el usuario no llena el campo. */
  emisorTelefonoPorDefecto: string;
}

export const CONFIG_COTIZACIONES_POR_DEFECTO: ConfiguracionCotizaciones = {
  condicionesPorDefecto:
    'Precios en pesos mexicanos (MXN). Los precios no incluyen IVA salvo que se indique en el concepto. ' +
    'Cotización válida por 15 días naturales. Forma de pago: transferencia electrónica.',
  emisorCargoPorDefecto: '',
  emisorTelefonoPorDefecto: '',
};

/** Rellena una config parcial de Firestore con los valores por defecto. */
export function sanearConfigCotizaciones(d: unknown): ConfiguracionCotizaciones {
  const o = (d ?? {}) as Record<string, unknown>;
  return {
    condicionesPorDefecto:
      typeof o.condicionesPorDefecto === 'string'
        ? o.condicionesPorDefecto
        : CONFIG_COTIZACIONES_POR_DEFECTO.condicionesPorDefecto,
    emisorCargoPorDefecto: typeof o.emisorCargoPorDefecto === 'string' ? o.emisorCargoPorDefecto : '',
    emisorTelefonoPorDefecto:
      typeof o.emisorTelefonoPorDefecto === 'string' ? o.emisorTelefonoPorDefecto : '',
  };
}
