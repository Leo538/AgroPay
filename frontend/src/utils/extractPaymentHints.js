/**
 * Pistas de monto/referencia desde texto de QR (misma idea que el backend, versión ligera).
 * @param {string} text
 * @returns {{ monto: string, referencia: string }}
 */
export function extractPaymentHints(text) {
  if (!text || typeof text !== 'string') {
    return { monto: '', referencia: '' };
  }
  const t = text.trim();
  let monto = '';
  let referencia = '';

  try {
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      for (const k of ['amount', 'monto', 'total', 'valor']) {
        const v = u.searchParams.get(k) || u.searchParams.get(k.toUpperCase());
        if (v) {
          monto = String(v).replace(',', '.');
          break;
        }
      }
      for (const k of ['ref', 'reference', 'referencia', 'id', 'trx']) {
        const v = u.searchParams.get(k) || u.searchParams.get(k.toUpperCase());
        if (v && String(v).trim().length >= 3) {
          referencia = String(v).trim();
          break;
        }
      }
    }
  } catch {
    /* ignore */
  }

  if (!monto) {
    const m = t.match(
      /(?:monto|amount|total|valor)[\s:=]+\$?\s*(\d+[.,]\d{1,2}|\d+)/i
    );
    if (m) monto = m[1].replace(',', '.');
  }
  if (!referencia) {
    const r = t.match(
      /(?:ref|referencia|reference)[\s:=#]+([A-Za-z0-9\-]{4,40})/i
    );
    if (r) referencia = r[1].trim();
  }

  return { monto, referencia };
}
