/** Misma tolerancia que el backend (validarComprobanteSistema). */
export const MONTO_EPS = 0.02;

/**
 * @param {number|string} totalPedido
 * @param {number|string|null|undefined} montoDetectado
 * @returns {{ tipo: 'ok'|'diff'|'sin_monto', esperado: number, detectado: number|null, diff: number }}
 */
export function comparacionMontoComprobante(totalPedido, montoDetectado) {
  const esperado = Math.round(Number(totalPedido) * 100) / 100;
  if (
    montoDetectado === null ||
    montoDetectado === undefined ||
    montoDetectado === '' ||
    Number.isNaN(Number(montoDetectado))
  ) {
    return { tipo: 'sin_monto', esperado, detectado: null, diff: 0 };
  }
  const d = Math.round(Number(montoDetectado) * 100) / 100;
  if (Number.isNaN(d)) {
    return { tipo: 'sin_monto', esperado, detectado: null, diff: 0 };
  }
  const absDiff = Math.abs(d - esperado);
  if (absDiff <= MONTO_EPS) {
    return { tipo: 'ok', esperado, detectado: d, diff: 0 };
  }
  return { tipo: 'diff', esperado, detectado: d, diff: d - esperado };
}
