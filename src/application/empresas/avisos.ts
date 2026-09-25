import type { Empresa } from '../../core/entities/Empresa.js';
import type { ContactoSoporte } from '../../core/entities/ConfiguracionAvisos.js';
import { estadoActualizacion } from '../../core/entities/value-objects/version.js';

/** Un pendiente que puede incluirse en el aviso (un sistema desactualizado o una licencia en riesgo). */
export interface PendienteAviso {
  /** Sistema; es la clave con la que se selecciona el pendiente en el formulario. */
  sistema: string;
  /** Línea como aparece en el mensaje. */
  linea: string;
  /** Versión que tiene instalada la empresa (solo sistemas desactualizados). */
  versionInstalada?: string | null;
  /** Versión oficial vigente (solo sistemas desactualizados). */
  versionOficial?: string | null;
  /** Fecha de vencimiento `YYYY-MM-DD` (solo licencias). */
  fechaVencimiento?: string | null;
  /** Cuándo se avisó ya este mismo pendiente (misma versión oficial o misma fecha de vencimiento). */
  avisadoEl?: Date | null;
}

/**
 * Clave con la que se reconoce que un pendiente ya se avisó, con la misma regla del CRM viejo:
 * un sistema cuenta como avisado si hubo aviso para esa empresa y ese sistema con la **misma
 * versión oficial** (si sale una versión nueva, vuelve a estar pendiente); una licencia, si fue
 * con la **misma fecha de vencimiento** (si se renovó y volvió a vencer, vuelve a estar pendiente).
 */
export function claveAviso(
  empresaId: string,
  tipo: 'sistema' | 'licencia',
  sistema: string,
  referencia: string | null | undefined,
): string {
  return [tipo, empresaId, sistema, referencia ?? ''].join('|');
}

/** Clave de un pendiente ya calculado (ver {@link claveAviso}). */
export function clavePendiente(empresaId: string, tipo: 'versiones' | 'licencias', p: PendienteAviso): string {
  return tipo === 'versiones'
    ? claveAviso(empresaId, 'sistema', p.sistema, p.versionOficial)
    : claveAviso(empresaId, 'licencia', p.sistema, p.fechaVencimiento);
}

/**
 * Sistemas de `empresa` cuya versión instalada está por debajo de la oficial. Si el sistema
 * tiene carta técnica registrada, se incluye su enlace (igual que el CRM viejo).
 */
export function sistemasPendientes(
  empresa: Empresa,
  oficialPorSistema: Record<string, string>,
  cartaPorSistema: Record<string, string | null> = {},
): PendienteAviso[] {
  return empresa.sistemasContratados
    .filter((s) => estadoActualizacion(empresa.versionesInstaladas[s], oficialPorSistema[s]) === 'desactualizada')
    .map((s) => ({
      sistema: s,
      linea:
        `- ${s}: instalada ${empresa.versionesInstaladas[s] || 'sin dato'}, oficial ${oficialPorSistema[s]}` +
        (cartaPorSistema[s] ? ` — Carta técnica: ${cartaPorSistema[s]}` : ''),
      versionInstalada: empresa.versionesInstaladas[s] || null,
      versionOficial: oficialPorSistema[s] ?? null,
    }));
}

/** Licencias de `empresa` vencidas o por vencer. */
export function licenciasPendientes(empresa: Empresa, hoy: Date): PendienteAviso[] {
  return empresa.licenciasEnRiesgo(hoy).map((l) => ({
    sistema: l.sistema,
    linea: `- ${l.sistema}: ${l.estado === 'vencida' ? `vencida hace ${Math.abs(l.dias)} días` : `vence en ${l.dias} días`} (${l.fecha})`,
    fechaVencimiento: l.fecha,
  }));
}

/** Deja solo los pendientes elegidos (`undefined` = todos, como antes de la pantalla de selección). */
export function filtrarPendientes(pendientes: PendienteAviso[], sistemas?: readonly string[]): PendienteAviso[] {
  return sistemas ? pendientes.filter((p) => sistemas.includes(p.sistema)) : pendientes;
}

/** Sistemas desactualizados, una línea por sistema. */
export function formatearSistemasPendientes(
  empresa: Empresa,
  oficialPorSistema: Record<string, string>,
  sistemas?: readonly string[],
  cartaPorSistema: Record<string, string | null> = {},
): string {
  const lineas = filtrarPendientes(sistemasPendientes(empresa, oficialPorSistema, cartaPorSistema), sistemas).map(
    (p) => p.linea,
  );
  return lineas.join('\n') || '(sin sistemas pendientes de actualizar)';
}

/** Licencias vencidas o por vencer, una línea por sistema. */
export function formatearLicenciasPendientes(empresa: Empresa, hoy: Date, sistemas?: readonly string[]): string {
  const lineas = filtrarPendientes(licenciasPendientes(empresa, hoy), sistemas).map((p) => p.linea);
  return lineas.join('\n') || '(sin licencias pendientes)';
}

/** Lista de contactos de soporte, `Nombre: teléfono` uno por línea. */
export function formatearContactoSoporte(contactos: ContactoSoporte[]): string {
  return contactos.map((c) => `${c.nombre}: ${c.telefono}`).join('\n') || '';
}

/** Sustituye los comodines `[clave]` de una plantilla por su valor. */
export function renderizarPlantilla(plantilla: string, valores: Record<string, string>): string {
  return Object.entries(valores).reduce(
    (texto, [clave, valor]) => texto.replaceAll(`[${clave}]`, valor),
    plantilla,
  );
}
