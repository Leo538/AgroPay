/** Longitud mínima de contraseña (login y registro). */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Comprueba formato básico de correo (texto@texto.dominio).
 * @param {string} value
 */
export function isValidEmail(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
