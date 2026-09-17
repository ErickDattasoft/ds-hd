/**
 * Teléfono en formato internacional sin "+" (el que piden wa.me, Meta y Twilio): deja solo
 * dígitos y a un número mexicano de 10 dígitos le antepone la lada 52. `''` si no es válido.
 */
export function normalizarTelefonoMx(telefono: string): string {
  const d = telefono.replace(/\D/g, '');
  if (d.length === 10) return `52${d}`;
  return d.length >= 11 && d.length <= 15 ? d : '';
}
