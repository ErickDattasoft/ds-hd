import { ValidationError } from '../errors/DomainError.js';
import type { ConceptoCotizacion } from './Cotizacion.js';

export type TipoEquipo = 'Servidor' | 'Terminal';

export interface SistemaCompac {
  clave: string;
  nombre: string;
  /** Precio si es el sistema principal (más caro) del equipo. */
  precioPrimero: number;
  /** Precio como sistema adicional en el mismo equipo. */
  precioAdicional: number;
}

export interface ConfiguracionCalculadora {
  sistemas: SistemaCompac[];
  /**
   * SQL se cobra como complemento por equipo (no participa en la regla "1º + adicionales").
   * `precioServidor` aplica a equipos Servidor; `precioTerminal` a Terminales.
   */
  sql: { clave: string; nombre: string; precioServidor: number; precioTerminal: number };
  ivaTasa: number;
  moneda: string;
}

export const CONFIG_CALCULADORA_POR_DEFECTO: ConfiguracionCalculadora = {
  sistemas: [
    { clave: 'CONTABILIDAD', nombre: 'Contabilidad', precioPrimero: 9800, precioAdicional: 4900 },
    { clave: 'BANCOS', nombre: 'Bancos', precioPrimero: 7200, precioAdicional: 3600 },
    { clave: 'NOMINAS', nombre: 'Nóminas', precioPrimero: 12500, precioAdicional: 6250 },
    { clave: 'COMERCIAL_PREMIUM', nombre: 'Comercial Premium', precioPrimero: 15900, precioAdicional: 7950 },
    { clave: 'COMERCIAL_PRO', nombre: 'Comercial Pro', precioPrimero: 8900, precioAdicional: 4450 },
    { clave: 'FACTURA_ELECTRONICA', nombre: 'Factura Electrónica', precioPrimero: 3500, precioAdicional: 1750 },
    { clave: 'XML_EN_LINEA', nombre: 'XML en línea', precioPrimero: 2900, precioAdicional: 1450 },
  ],
  sql: { clave: 'SQL', nombre: 'Motor SQL', precioServidor: 6900, precioTerminal: 0 },
  ivaTasa: 0.16,
  moneda: 'MXN',
};

export interface EquipoInput {
  tipo: TipoEquipo;
  /** Claves de sistemas seleccionados para este equipo (puede incluir la clave de SQL). */
  sistemas: string[];
}

export interface ResultadoCalculadora {
  conceptos: ConceptoCotizacion[];
  subtotal: number;
  iva: number;
  total: number;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Calculadora de licenciamiento Compac/CONTPAQi. Regla base: en cada equipo, el sistema más
 * caro se cobra a "precioPrimero" y los demás a "precioAdicional". SQL es un complemento
 * aparte por equipo (según tipo).
 */
export class CalculadoraCompac {
  static calcular(equipos: EquipoInput[], config: ConfiguracionCalculadora): ResultadoCalculadora {
    if (equipos.length === 0) {
      throw new ValidationError('Agrega al menos un equipo', { equipos: 'Requerido' });
    }
    const porClave = new Map(config.sistemas.map((s) => [s.clave, s]));
    const conceptos: ConceptoCotizacion[] = [];

    equipos.forEach((equipo, i) => {
      const etiquetaEquipo = `${equipo.tipo} ${i + 1}`;
      const sistemasClave = equipo.sistemas.filter((c) => c !== config.sql.clave);
      const sistemas = sistemasClave.map((c) => {
        const s = porClave.get(c);
        if (!s) throw new ValidationError(`Sistema desconocido: ${c}`);
        return s;
      });

      if (sistemas.length > 0) {
        const ordenados = [...sistemas].sort((a, b) => b.precioPrimero - a.precioPrimero);
        ordenados.forEach((s, idx) => {
          const precio = idx === 0 ? s.precioPrimero : s.precioAdicional;
          conceptos.push({
            descripcion: `${s.nombre} — ${etiquetaEquipo}${idx === 0 ? ' (principal)' : ' (adicional)'}`,
            cantidad: 1,
            precioUnitario: precio,
            importe: precio,
          });
        });
      }

      if (equipo.sistemas.includes(config.sql.clave)) {
        const precio = equipo.tipo === 'Servidor' ? config.sql.precioServidor : config.sql.precioTerminal;
        if (precio > 0) {
          conceptos.push({
            descripcion: `${config.sql.nombre} — ${etiquetaEquipo}`,
            cantidad: 1,
            precioUnitario: precio,
            importe: precio,
          });
        }
      }
    });

    const subtotal = r2(conceptos.reduce((s, c) => s + c.importe, 0));
    const iva = r2(subtotal * config.ivaTasa);
    return { conceptos, subtotal, iva, total: r2(subtotal + iva) };
  }
}
