import { ValidationError } from '../errors/DomainError.js';
import type { ConceptoCotizacion } from './Cotizacion.js';

/** Tipo de equipo con su precio: el 1er sistema de cada equipo y cada sistema adicional. */
export interface TipoEquipoCompac {
  nombre: string;
  precioPrimerSistema: number;
  precioAdicional: number;
}

/**
 * Catálogos y precios de la calculadora Compac (paridad con `configCompac` del CRM viejo): el
 * precio depende del TIPO DE EQUIPO y de cuántos sistemas lleva, no de qué sistema es.
 */
export interface ConfiguracionCalculadora {
  /** Sistemas que se pueden marcar en un grupo — cada uno es independiente, incluido "Componentes". */
  catalogoSistemas: string[];
  catalogoEquipos: TipoEquipoCompac[];
  /** Precio de SQL por equipo; solo aplica a equipos "Servidor". */
  precioSQL: number;
}

/** Tipo de equipo al que se le puede sumar SQL (igual que el viejo, por nombre). */
export const EQUIPO_CON_SQL = 'Servidor';

export const CONFIG_CALCULADORA_POR_DEFECTO: ConfiguracionCalculadora = {
  catalogoSistemas: [
    'Componentes',
    'Contabilidad',
    'Bancos',
    'Nóminas',
    'Comercial Premium',
    'XML en línea',
    'Factura Electrónica',
    'Comercial Pro',
    'Respaldos',
  ],
  catalogoEquipos: [
    { nombre: 'Servidor', precioPrimerSistema: 800, precioAdicional: 400 },
    { nombre: 'Terminal', precioPrimerSistema: 200, precioAdicional: 100 },
  ],
  precioSQL: 800,
};

const precio = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/**
 * Normaliza lo que venga de Firestore o de un respaldo. Un documento con la forma anterior de
 * ds-hd (`sistemas`/`sql`, precio por sistema) no trae estos campos y cae a los defaults.
 */
export function sanearConfigCalculadora(v: unknown): ConfiguracionCalculadora {
  const d = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const def = CONFIG_CALCULADORA_POR_DEFECTO;
  const sistemas = Array.isArray(d.catalogoSistemas)
    ? d.catalogoSistemas
        .map((s) => String(typeof s === 'object' && s ? (s as { nombre?: unknown }).nombre ?? '' : s ?? '').trim())
        .filter(Boolean)
    : null;
  const equipos = Array.isArray(d.catalogoEquipos)
    ? d.catalogoEquipos
        .map((e) => {
          const x = (e ?? {}) as Record<string, unknown>;
          return {
            nombre: String(x.nombre ?? '').trim(),
            precioPrimerSistema: precio(x.precioPrimerSistema, 0),
            precioAdicional: precio(x.precioAdicional, 0),
          };
        })
        .filter((e) => e.nombre)
    : null;
  return {
    catalogoSistemas: sistemas ?? [...def.catalogoSistemas],
    catalogoEquipos: equipos ?? def.catalogoEquipos.map((e) => ({ ...e })),
    precioSQL: precio(d.precioSQL, def.precioSQL),
  };
}

/** Un grupo de equipos iguales: N equipos del mismo tipo con los mismos sistemas. */
export interface GrupoCompac {
  tipo: string;
  cantidad: number;
  sistemas: string[];
  /** Solo cuenta si `tipo` es Servidor. */
  incluyeSql: boolean;
}

/** Precio calculado de un grupo (lo que el viejo mostraba en cada renglón del desglose). */
export interface ResultadoGrupoCompac {
  grupo: GrupoCompac;
  precioSistemasPorUnidad: number;
  precioSqlPorUnidad: number;
  precioUnitario: number;
  subtotal: number;
}

/** Conceptos listos para la cotización, desglose por grupo y conteos del parque. */
export interface ResultadoCalculadora {
  conceptos: ConceptoCotizacion[];
  grupos: ResultadoGrupoCompac[];
  total: number;
  servidores: number;
  terminales: number;
  conComponentes: number;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Calculadora de licenciamiento Compac/CONTPAQi, idéntica al CRM viejo: por equipo se cobra
 * el precio del 1er sistema de su tipo más el adicional por cada sistema extra; SQL es un
 * renglón aparte y solo para Servidor. El IVA lo pone la cotización.
 */
export class CalculadoraCompac {
  static calcularGrupo(grupo: GrupoCompac, config: ConfiguracionCalculadora): ResultadoGrupoCompac {
    const equipo = config.catalogoEquipos.find((e) => e.nombre === grupo.tipo);
    const n = grupo.sistemas.length;
    const precioSistemasPorUnidad =
      n > 0 ? (equipo?.precioPrimerSistema ?? 0) + (n - 1) * (equipo?.precioAdicional ?? 0) : 0;
    const incluyeSql = grupo.tipo === EQUIPO_CON_SQL && grupo.incluyeSql;
    const precioSqlPorUnidad = incluyeSql ? config.precioSQL : 0;
    const precioUnitario = precioSistemasPorUnidad + precioSqlPorUnidad;
    return {
      grupo: { ...grupo, incluyeSql },
      precioSistemasPorUnidad,
      precioSqlPorUnidad,
      precioUnitario,
      subtotal: r2(precioUnitario * grupo.cantidad),
    };
  }

  static calcular(grupos: GrupoCompac[], config: ConfiguracionCalculadora): ResultadoCalculadora {
    const validos = grupos.filter((g) => g.cantidad > 0 && (g.sistemas.length > 0 || g.incluyeSql));
    if (validos.length === 0) {
      throw new ValidationError('Agrega al menos un grupo con cantidad y sistemas o SQL', {
        grupos: 'Requerido',
      });
    }
    for (const g of validos) {
      if (!config.catalogoEquipos.some((e) => e.nombre === g.tipo)) {
        throw new ValidationError(`Tipo de equipo desconocido: ${g.tipo}`, { grupos: 'Tipo inválido' });
      }
    }

    const resultados = validos.map((g) => CalculadoraCompac.calcularGrupo(g, config));
    const conceptos: ConceptoCotizacion[] = [];
    for (const r of resultados) {
      const { tipo, cantidad, sistemas } = r.grupo;
      // Grupo de solo SQL: no se manda el renglón de sistemas vacío.
      if (sistemas.length > 0) {
        conceptos.push({
          descripcion: `${tipo} — ${sistemas.join(', ')}`,
          cantidad,
          precioUnitario: r.precioSistemasPorUnidad,
          descuento: 0,
          importe: r2(cantidad * r.precioSistemasPorUnidad),
          tieneIva: true,
        });
      }
      // SQL en renglón aparte, para que el cliente lo vea desglosado en el PDF.
      if (r.grupo.incluyeSql) {
        conceptos.push({
          descripcion: `${tipo} — SQL`,
          cantidad,
          precioUnitario: r.precioSqlPorUnidad,
          descuento: 0,
          importe: r2(cantidad * r.precioSqlPorUnidad),
          tieneIva: true,
        });
      }
    }

    const cuenta = (pred: (g: GrupoCompac) => boolean): number =>
      resultados.filter((r) => pred(r.grupo)).reduce((s, r) => s + r.grupo.cantidad, 0);
    return {
      conceptos,
      grupos: resultados,
      total: r2(resultados.reduce((s, r) => s + r.subtotal, 0)),
      servidores: cuenta((g) => g.tipo === 'Servidor'),
      terminales: cuenta((g) => g.tipo === 'Terminal'),
      conComponentes: cuenta((g) => g.sistemas.includes('Componentes')),
    };
  }
}
