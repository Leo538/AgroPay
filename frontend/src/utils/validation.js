/** Longitud mínima de contraseña (login y registro). */
export const MIN_PASSWORD_LENGTH = 8;

/** Nombre y apellido: mínimo de letras. */
export const MIN_NAME_LENGTH = 2;

/** Celular: exactamente esta cantidad de dígitos (solo números). */
export const PHONE_DIGITS = 10;

/**
 * Comprueba formato básico de correo (texto@texto.dominio).
 * @param {string} value
 */
export function isValidEmail(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Solo dígitos del teléfono (sin letras ni símbolos).
 * @param {string} value
 */
export function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Celular: exactamente 10 dígitos numéricos.
 * @param {string} value
 */
export function isValidPhone(value) {
  const n = normalizePhone(value);
  return n.length === PHONE_DIGITS && /^[0-9]+$/.test(n);
}

/**
 * Solo letras (con tildes ñ ü) y espacios. Sin números ni caracteres especiales.
 * @param {string} value
 */
export function isValidPersonName(value) {
  const raw = String(value || '').trim();
  const t = raw.replace(/\s+/g, ' ');
  if (t.length < MIN_NAME_LENGTH || t.length > 60) return false;
  if (/[0-9]/.test(t)) return false;
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/.test(t);
}

/**
 * Al escribir nombre/apellido: bloquea números y símbolos.
 * @param {string} text
 */
export function sanitizeNameInput(text) {
  return String(text || '').replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
}

/**
 * Al escribir celular: solo dígitos, máximo 10.
 * @param {string} text
 */
export function sanitizePhoneInput(text) {
  return String(text || '')
    .replace(/\D/g, '')
    .slice(0, PHONE_DIGITS);
}
