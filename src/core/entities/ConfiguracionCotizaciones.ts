/** Un concepto reutilizable del catálogo — evita reescribir descripción/precio en cada cotización. */
export interface ConceptoCatalogo {
  descripcion: string;
  precioUnitario: number;
  /** Descuento (%) que se precarga al elegir este concepto; 0 = ninguno. */
  descuentoPorDefecto: number;
}

/** Config del módulo de cotizaciones (documento `configuracion/cotizaciones`). */
export interface ConfiguracionCotizaciones {
  /** Condiciones / términos que se precargan al crear una cotización. */
  condicionesPorDefecto: string;
  /** Cargo del emisor que se sugiere si el usuario no llena el campo. */
  emisorCargoPorDefecto: string;
  /** Teléfono del emisor que se sugiere si el usuario no llena el campo. */
  emisorTelefonoPorDefecto: string;
  /** Conceptos frecuentes (descripción + precio) para autocompletar al armar una cotización. */
  catalogoConceptos: ConceptoCatalogo[];
}

export const CONFIG_COTIZACIONES_POR_DEFECTO: ConfiguracionCotizaciones = {
  condicionesPorDefecto:
    'Precios en pesos mexicanos (MXN). Los precios no incluyen IVA salvo que se indique en el concepto. ' +
    'Cotización válida por 15 días naturales. Forma de pago: transferencia electrónica.',
  emisorCargoPorDefecto: '',
  emisorTelefonoPorDefecto: '',
  catalogoConceptos: [],
};

/** Rellena una config parcial de Firestore con los valores por defecto. */
export function sanearConfigCotizaciones(d: unknown): ConfiguracionCotizaciones {
  const o = (d ?? {}) as Record<string, unknown>;
  const catalogo = Array.isArray(o.catalogoConceptos)
    ? o.catalogoConceptos
        .map((it): ConceptoCatalogo | null => {
          const r = it as Record<string, unknown>;
          const descripcion = typeof r.descripcion === 'string' ? r.descripcion.trim() : '';
          if (!descripcion) return null;
          return {
            descripcion,
            precioUnitario: Number(r.precioUnitario) || 0,
            descuentoPorDefecto: Math.min(100, Math.max(0, Number(r.descuentoPorDefecto) || 0)),
          };
        })
        .filter((it): it is ConceptoCatalogo => it !== null)
    : [];
  return {
    condicionesPorDefecto:
      typeof o.condicionesPorDefecto === 'string'
        ? o.condicionesPorDefecto
        : CONFIG_COTIZACIONES_POR_DEFECTO.condicionesPorDefecto,
    emisorCargoPorDefecto: typeof o.emisorCargoPorDefecto === 'string' ? o.emisorCargoPorDefecto : '',
    emisorTelefonoPorDefecto:
      typeof o.emisorTelefonoPorDefecto === 'string' ? o.emisorTelefonoPorDefecto : '',
    catalogoConceptos: catalogo,
  };
}
