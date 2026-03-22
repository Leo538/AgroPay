const crypto = require('crypto');

/**
 * Convierte texto de importe (OCR / pantalla) a número.
 * Soporta: 10 · 10.00 · 10,50 · 1.234,56 · 1,234.56
 * @param {string} raw
 * @returns {number|null}
 */
function parseMonto(raw) {
  if (raw == null || raw === '') return null;
  let s = String(raw).trim().replace(/\s/g, '');
  if (!/^[\d.,]+$/.test(s)) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2 && /^\d+$/.test(parts[0])) {
      s = `${parts[0]}.${parts[1]}`;
    } else if (parts.length === 2 && parts[1].length === 3 && /^\d+$/.test(parts[0])) {
      s = parts[0] + parts[1];
    } else {
      s = s.replace(/,/g, '');
    }
  } else {
    s = s.replace(',', '.');
  }

  const n = parseFloat(s);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Monto capturado desde OCR: corrige O→0 y espacios antes de parseMonto.
 * No usar para URLs ni datos pegados por el usuario.
 */
function parseMontoOcr(raw) {
  if (raw == null || raw === '') return null;
  const compact = String(raw).trim().replace(/\s/g, '').replace(/[Oo]/g, '0');
  return parseMonto(compact);
}

/** Limpia artefactos típicos del OCR en comprobantes bancarios. */
function normalizarTextoComprobanteOcr(text) {
  return String(text)
    .replace(/[\u00A0\u2000-\u200B\uFEFF]/g, ' ')
    .replace(/\u00A4/g, '$')
    .replace(/\uFF04/g, '$')
    .replace(/(\d)\s+([.,])\s*(\d)/g, '$1$2$3');
}

/**
 * El total del pedido aparece literal en el voucher ($ 10,00, 10.00, etc.).
 * @param {string} flat
 * @param {number} orderTotal
 */
function inferirMontoPorCoincidenciaLiteral(flat, orderTotal) {
  if (orderTotal == null || Number.isNaN(Number(orderTotal))) return null;
  const t = Math.round(Number(orderTotal) * 100) / 100;
  const f2 = t.toFixed(2);
  const [w, dec] = f2.split('.');
  const literales = [
    `$ ${w}.${dec}`,
    `$${w}.${dec}`,
    `$ ${w},${dec}`,
    `$${w},${dec}`,
    `S ${w}.${dec}`,
    `S ${w},${dec}`,
    `S${w}.${dec}`,
    `${w}.${dec}`,
    `${w},${dec}`,
  ];
  const f = String(flat);
  for (const c of literales) {
    if (f.includes(c)) return t;
  }
  const intStr = String(Math.trunc(t));
  if (dec === '00') {
    if (new RegExp(`\\$\\s*${intStr}(?!\\d)`).test(f)) return t;
    if (new RegExp(`[Ss5]\\s*${intStr}(?!\\d)`).test(f)) return t;
  }
  return null;
}

/**
 * Intenta extraer monto y referencia de texto QR, URL, OCR u nota.
 * @param {string} text
 * @param {{ orderTotal?: number }} [opts] — si el OCR no lee «$», ayuda a encontrar el monto del pedido.
 * @returns {{ monto: number|null, referencia: string|null }}
 */
function extractFromText(text, opts = {}) {
  if (!text || typeof text !== 'string') {
    return { monto: null, referencia: null };
  }
  const t = text.trim();
  if (!t) return { monto: null, referencia: null };

  const orderTotal =
    opts.orderTotal != null && !Number.isNaN(Number(opts.orderTotal))
      ? Math.round(Number(opts.orderTotal) * 100) / 100
      : null;

  let monto = null;
  let referencia = null;

  try {
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      const params = u.searchParams;
      const keysAmount = ['amount', 'monto', 'total', 'valor', 'value', 'amt'];
      const keysRef = ['ref', 'reference', 'referencia', 'numero', 'nro', 'id', 'trx'];
      for (const k of keysAmount) {
        const v = params.get(k) || params.get(k.toUpperCase());
        if (v) {
          const p = parseMonto(v);
          if (p != null) {
            monto = p;
            break;
          }
        }
      }
      for (const k of keysRef) {
        const v = params.get(k) || params.get(k.toUpperCase());
        if (v && String(v).trim().length >= 3) {
          referencia = String(v).trim();
          break;
        }
      }
    }
  } catch {
    /* ignore URL parse */
  }

  /** Texto en una línea para OCR / capturas de banca móvil (ej. «Total pagado $ 4.67»). */
  const flatRaw = normalizarTextoComprobanteOcr(t).replace(/\s+/g, ' ');
  const flat = flatRaw;

  /**
   * Banco Pichincha: importe grande bajo «Transferencia exitosa» (cualquier valor: 10, 60.5, 1.234,56…).
   * Entre medias pueden ir fechas con dígitos; no restringir el tramo intermedio.
   */
  const importeTrasSimbolo = /([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|[\d]{1,9}(?:[.,]\d{1,2})?)/;

  /**
   * OCR: «¡» omitido; «transferencia» / «ransferencia» (pierde la T inicial).
   * «Transfenencia» → rama enencia|erencia.
   */
  /** Espacio opcional entre palabras (OCR a veces junta «transferenciaexitosa»). */
  const bloqueExitosa =
    '(?:¡\\s*)?t?[Rr]ansf[ea]?(?:rencia|enencia|erencia)\\s*exitos[aáÁ]?!?';

  if (monto == null) {
    const txOk = flat.match(
      new RegExp(
        `${bloqueExitosa}[\\s\\S]{0,2000}?\\$\\s*${importeTrasSimbolo.source}`,
        'i'
      )
    );
    if (txOk) {
      const p = parseMontoOcr(txOk[1]);
      if (p != null && p >= 0.01) monto = p;
    }
  }
  if (monto == null) {
    const txOk2 = flat.match(
      new RegExp(
        `\\$\\s*${importeTrasSimbolo.source}[\\s\\S]{0,800}?${bloqueExitosa}`,
        'i'
      )
    );
    if (txOk2) {
      const p = parseMontoOcr(txOk2[1]);
      if (p != null && p >= 0.01) monto = p;
    }
  }
  /**
   * OCR a veces lee «$» como «S» (mayúscula). No usar el dígito 5: en «10,50» haría
   * coincidir la coma y capturar «0» como monto.
   */
  if (monto == null) {
    const txS = flat.match(
      new RegExp(
        `${bloqueExitosa}[\\s\\S]{0,2000}?(?:\\$|USD\\b\\s*|€\\s*|\\bS\\s+)${importeTrasSimbolo.source}\\b`,
        'i'
      )
    );
    if (txS) {
      const p = parseMontoOcr(txS[1]);
      if (p != null && p >= 0.01) monto = p;
    }
  }

  /**
   * Pichincha (app): el importe va en grande justo después de «exitosa» pero el OCR
   * a menudo **no** deja el carácter $; queda solo «10.00» o «10,00».
   */
  if (monto == null) {
    const idxEx = flat.search(/exitos[aáÁ]?(?:!|\?|\.|,)?/i);
    if (idxEx >= 0) {
      const ventana = flat.slice(idxEx, idxEx + 900);
      const sinSimbolo = ventana.match(
        /exitos[aáÁ]?(?:!|\?|\.|,)?[\s\S]{0,550}?([\dOo]{1,6}[.,][\dOo]{2})\b/i
      );
      if (sinSimbolo) {
        const p = parseMontoOcr(sinSimbolo[1]);
        if (p != null && p >= 0.01 && p <= 500000) monto = p;
      }
    }
  }

  const etiquetasTotalPago = [
    /total\s+pagad[oa]\s*[:\s]*\$?\s*(\d+[.,]\d{1,2}|\d+)/gi,
    /valor\s+pagad[oa]\s*[:\s]*\$?\s*(\d+[.,]\d{1,2}|\d+)/gi,
    /total\s+a\s+pagar\s*[:\s]*\$?\s*(\d+[.,]\d{1,2}|\d+)/gi,
    /importe\s+total\s*[:\s]*\$?\s*(\d+[.,]\d{1,2}|\d+)/gi,
    /monto\s+total\s*[:\s]*\$?\s*(\d+[.,]\d{1,2}|\d+)/gi,
    /monto\s+pagad[oa]\s*[:\s]*\$?\s*(\d+[.,]\d{1,2}|\d+)/gi,
  ];
  if (monto == null) {
    for (const re of etiquetasTotalPago) {
      re.lastIndex = 0;
      const m = re.exec(flat);
      if (m && m[1]) {
        const p = parseMontoOcr(m[1]);
        if (p != null && p >= 0.01) {
          monto = p;
          break;
        }
      }
    }
  }

  const montoPatterns = [
    /(?:monto|amount|total|valor|pag(?:ado|aste)?)[\s:=]+\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d{1,9}(?:[.,]\d{1,2})?|\d+)/gi,
    /\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d{1,9}(?:[.,]\d{1,2})?)/g,
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})\s*(?:USD|usd|\$)?/g,
  ];
  if (monto == null) {
    for (const re of montoPatterns) {
      re.lastIndex = 0;
      const m = re.exec(flat);
      if (m && m[1]) {
        const p = parseMontoOcr(m[1]);
        if (p != null && p >= 0.01) {
          monto = p;
          break;
        }
      }
    }
  }

  /**
   * Tras «exitosa», el importe de la transferencia suele ser el **primer** $ / S claro,
   * no el máximo del texto (evita tomar cifras de cuentas u otros montos).
   */
  if (monto == null) {
    const idxEx = flat.search(/exitos[aáÁ]?!?/i);
    const tail = idxEx >= 0 ? flat.slice(idxEx) : flat;
    const amounts = [];
    const reUsd = new RegExp(
      `(?:\\$|[Ss5])\\s*${importeTrasSimbolo.source}\\b`,
      'g'
    );
    let mm;
    while ((mm = reUsd.exec(tail)) !== null) {
      const p = parseMontoOcr(mm[1]);
      if (p != null && p >= 0.01 && p <= 500000) amounts.push(p);
    }
    if (amounts.length) {
      monto = amounts[0];
    }
  }

  /**
   * Si conocemos el total del pedido: buscar en el texto un importe que coincida (cualquier formato).
   */
  if (monto == null && orderTotal != null) {
    const EPS = 0.02;
    const candidatos = [];
    const reNum = new RegExp(`\\b${importeTrasSimbolo.source}\\b`, 'g');
    let dm;
    while ((dm = reNum.exec(flat)) !== null) {
      const p = parseMontoOcr(dm[1]);
      if (p != null && p >= 0.01 && p <= 500000) candidatos.push(p);
    }
    const hit = candidatos.find((p) => Math.abs(p - orderTotal) <= EPS);
    if (hit != null) monto = hit;
  }

  /** Último recurso: el mismo texto que ves en pantalla ($ 10,00) sin palabras clave. */
  if (monto == null && orderTotal != null) {
    const lit = inferirMontoPorCoincidenciaLiteral(flat, orderTotal);
    if (lit != null) monto = lit;
  }

  /** «exitosa» sola + importe cerca (marca de agua rompe «transferencia»). */
  if (monto == null) {
    const soloEx = flat.match(
      new RegExp(
        `exitos[aáÁ]?(?:!|\\?)?[\\s\\S]{0,1200}?(?:\\$\\s*|USD\\s*)?${importeTrasSimbolo.source}\\b`,
        'i'
      )
    );
    if (soloEx) {
      const p = parseMontoOcr(soloEx[1]);
      if (p != null && p >= 0.01) monto = p;
    }
  }
  if (monto == null) {
    const soloExNum = flat.match(
      /exitos[aáÁ]?(?:!|\?)?[\s\S]{0,600}?([\dOo]{1,6}[.,][\dOo]{2})\b/i
    );
    if (soloExNum) {
      const p = parseMontoOcr(soloExNum[1]);
      if (p != null && p >= 0.01 && p <= 500000) monto = p;
    }
  }

  if (!referencia) {
    const compPich = flat.match(
      /n[°º\u00B0]?\s*de\s+comprobante\s+(\d{6,14})\b/i
    );
    if (compPich) referencia = compPich[1];
  }
  if (!referencia) {
    const comp2 = flat.match(/\bcomprobante\s+(\d{8,14})\b/i);
    if (comp2) referencia = comp2[1];
  }

  const refPatterns = [
    /(?:ref|referencia|reference|comprobante|auth|n[°o]?\s*op|trx|id)[\s:=#]+([A-Za-z0-9\-]{4,48})/i,
    /\b([A-Z]{2,4}[-_]?\d{6,14})\b/,
    /\b(\d{10,14})\b/,
  ];
  if (!referencia) {
    for (const re of refPatterns) {
      const m = t.match(re);
      if (m && m[1]) {
        referencia = m[1].trim();
        break;
      }
    }
  }

  return { monto, referencia };
}

/**
 * Referencia estable derivada del payload del QR si no hay otra (evita duplicados vacíos).
 */
function referenciaDesdePayload(payload) {
  if (!payload || !String(payload).trim()) return null;
  const h = crypto
    .createHash('sha256')
    .update(String(payload).trim())
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
  return `QR-${h}`;
}

/**
 * Combina extracción QR + datos declarados por el cliente.
 * @param {{ comprobanteQrPayload: string, montoDeclarado?: unknown, referenciaDeclarada?: string }} input
 */
function buildDatosExtraidos(input) {
  const qr = input.comprobanteQrPayload ? String(input.comprobanteQrPayload).trim() : '';
  const fromQr = extractFromText(qr);

  let montoCliente = null;
  if (input.montoDeclarado !== undefined && input.montoDeclarado !== null && input.montoDeclarado !== '') {
    montoCliente = parseMonto(input.montoDeclarado);
  }

  const refCliente =
    input.referenciaDeclarada != null && String(input.referenciaDeclarada).trim()
      ? String(input.referenciaDeclarada).trim()
      : null;

  const monto = fromQr.monto != null ? fromQr.monto : montoCliente;
  let referencia = fromQr.referencia || refCliente;
  let fuenteQr = fromQr.monto != null || fromQr.referencia != null;
  const fuenteCliente = montoCliente != null || !!refCliente;

  if (!referencia && qr) {
    referencia = referenciaDesdePayload(qr);
    fuenteQr = true;
  }

  return {
    monto,
    referencia: referencia || '',
    fuenteQr,
    fuenteQrMonto: fromQr.monto != null,
    fuenteCliente,
    fuenteOcr: false,
    fuenteOcrMonto: false,
  };
}

function refEsSoloDerivadaQr(ref) {
  const s = ref != null ? String(ref).trim() : '';
  return !s || /^QR-[A-F0-9]+$/i.test(s);
}

/**
 * Fusiona OCR del comprobante. Nunca usa orderTotal aquí (evita forzar el monto del pedido sobre la imagen).
 * Si el OCR ve un monto, sustituye el que viniera del formulario.
 * @param {{ monto?: number|null, referencia?: string, fuenteQr?: boolean, fuenteQrMonto?: boolean, fuenteCliente?: boolean, fuenteOcr?: boolean, fuenteOcrMonto?: boolean }} datos
 * @param {string} ocrText
 */
function enriquecerDatosDesdeOcrSiFalta(datos, ocrText) {
  if (!datos) {
    datos = {};
  }
  const fromOcr = extractFromText(ocrText, {});
  let next = {
    ...datos,
    fuenteOcr: datos.fuenteOcr || false,
    fuenteOcrMonto: datos.fuenteOcrMonto || false,
  };

  if (fromOcr.monto != null) {
    next.monto = fromOcr.monto;
    next.fuenteOcr = true;
    next.fuenteOcrMonto = true;
  }

  if (fromOcr.referencia && refEsSoloDerivadaQr(next.referencia)) {
    next.referencia = fromOcr.referencia;
    next.fuenteOcr = true;
  }

  return next;
}

function normalizeReferenciaKey(ref) {
  if (!ref || !String(ref).trim()) return '';
  return String(ref)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 64);
}

module.exports = {
  extractFromText,
  buildDatosExtraidos,
  enriquecerDatosDesdeOcrSiFalta,
  enriquecerMontoDesdeOcrSiFalta: enriquecerDatosDesdeOcrSiFalta,
  refEsSoloDerivadaQr,
  normalizeReferenciaKey,
  parseMonto,
  referenciaDesdePayload,
};
