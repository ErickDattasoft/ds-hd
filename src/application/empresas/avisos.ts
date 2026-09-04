import type { Empresa } from '../../core/entities/Empresa.js';
import type { ContactoSoporte } from '../../core/entities/ConfiguracionAvisos.js';
import { estadoActualizacion } from '../../core/entities/value-objects/version.js';

/** Sistemas de `empresa` cuya versión instalada está por debajo de la oficial, una línea por sistema. */
export function formatearSistemasPendientes(empresa: Empresa, oficialPorSistema: Record<string, string>): string {
  const lineas = empresa.sistemasContratados
    .filter((s) => estadoActualizacion(empresa.versionesInstaladas[s], oficialPorSistema[s]) === 'desactualizada')
    .map((s) => `- ${s}: instalada ${empresa.versionesInstaladas[s] || 'sin dato'}, oficial ${oficialPorSistema[s]}`);
  return lineas.join('\n') || '(sin sistemas pendientes de actualizar)';
}

/** Licencias de `empresa` vencidas o por vencer, una línea por sistema. */
export function formatearLicenciasPendientes(empresa: Empresa, hoy: Date): string {
  const lineas = empresa.licenciasEnRiesgo(hoy).map((l) => {
    const etiqueta = l.estado === 'vencida' ? `vencida hace ${Math.abs(l.dias)} días` : `vence en ${l.dias} días`;
    return `- ${l.sistema}: ${etiqueta} (${l.fecha})`;
  });
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
