/**
 * No exponer texto crudo de OCR (puede contener nombres, cuentas, etc.).
 * @param {Record<string, unknown>|null|undefined} order
 */
function redactOrderForClient(order) {
  if (!order || typeof order !== 'object') return order;
  const o = { ...order };
  delete o.ocrResumen;
  return o;
}

function redactOrdersForClient(orders) {
  if (!Array.isArray(orders)) return orders;
  return orders.map((x) => redactOrderForClient(x));
}

module.exports = { redactOrderForClient, redactOrdersForClient };
