/** Contacto de soporte citado en un aviso (comodín `[contacto_soporte]`). */
export interface ContactoSoporte {
  nombre: string;
  telefono: string;
}

/** Config de los avisos masivos de Versiones/Licencias a empresas (documento `configuracion/avisos`). */
export interface ConfiguracionAvisos {
  /** Comodines: `[contacto]`, `[empresa]`, `[sistemas_pendientes]`, `[contacto_soporte]`. */
  plantillaVersiones: string;
  /** Comodines: `[contacto]`, `[empresa]`, `[licencias_pendientes]`, `[contacto_soporte]`. */
  plantillaLicencias: string;
  contactosSoporteVersiones: ContactoSoporte[];
  contactosSoporteLicencias: ContactoSoporte[];
}

// Textos idénticos a los del CRM viejo (`plantillaMensaje` / `plantillaLicencias` en index.astro).
export const CONFIG_AVISOS_POR_DEFECTO: ConfiguracionAvisos = {
  plantillaVersiones:
    'Hola [contacto] de [empresa].\n\n' +
    'Te saludamos de parte del equipo de DATTASOFT By INFOXPERT. Te escribimos para comentarte que ya se ' +
    'encuentran disponibles las últimas versiones oficiales y estables para tus sistemas CONTPAQi.\n\n' +
    'Revisando tu perfil, notamos que tienes la oportunidad de actualizar los siguientes módulos:\n\n' +
    '[sistemas_pendientes]\n\n' +
    'Mantenerlos al día te garantiza la mayor estabilidad, seguridad y el cumplimiento de los cambios ' +
    'fiscales más recientes.\n\n' +
    'Si deseas agendar la actualización, contáctanos:\n[contacto_soporte]\n\n' +
    'Estamos para atenderles con gusto.\n\nSaludos cordiales,\nEquipo DATTASOFT BY INFOXPERT',
  plantillaLicencias:
    'Hola [contacto] de [empresa].\n\n' +
    'Te saludamos de parte del equipo de DATTASOFT By INFOXPERT. Te escribimos para recordarte el estado ' +
    'de las licencias de tus sistemas CONTPAQi:\n\n' +
    '[licencias_pendientes]\n\n' +
    'Si ya venció o está por vencer, contáctanos para renovarla y evitar interrupciones en el servicio:\n' +
    '[contacto_soporte]\n\n' +
    'Estamos para atenderles con gusto.\n\nSaludos cordiales,\nEquipo DATTASOFT BY INFOXPERT',
  contactosSoporteVersiones: [],
  contactosSoporteLicencias: [],
};
