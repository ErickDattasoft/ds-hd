/**
 * Teléfono en formato internacional sin "+" (el que piden wa.me, Meta y Twilio): deja solo
 * dígitos y a un número mexicano de 10 dígitos le antepone la lada 52. `''` si no es válido.
 */
export function normalizarTelefonoMx(telefono: string): string {
  const d = telefono.replace(/\D/g, '');
  if (d.length === 10) return `52${d}`;
  return d.length >= 11 && d.length <= 15 ? d : '';
}

/**
 * Valida un teléfono capturado en un formulario público, con las mismas reglas que el CRM
 * anterior: 10 a 13 dígitos, ni todos iguales (5555555555) ni una secuencia corrida
 * (1234567890). No pretende verificar que el número exista, solo descartar relleno obvio.
 */
export function esTelefonoPlausible(telefono: string): boolean {
  const d = telefono.replace(/\D/g, '');
  if (d.length < 10 || d.length > 13) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  return !['0123456789', '1234567890', '9876543210'].some((s) => d.includes(s.slice(0, 10)));
}
