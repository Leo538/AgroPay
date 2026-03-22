/**
 * Lee la página pública de lista de precios del EP-EMA (Ambato) y extrae enlaces PDF.
 * @see https://ambato-ema.gob.ec/listaprecios/
 */

const LISTA_PRECIOS_URL = 'https://ambato-ema.gob.ec/listaprecios/';

/** href=".../precios-YYYY-MM-DD.pdf" o precios-YYYY-MM-DD-N.pdf (revisión el mismo día) */
const RE_PDF_HREF =
  /href="(https:\/\/ambato-ema\.gob\.ec\/wp-content\/uploads\/[^"]+?\/precios-(\d{4})-(\d{2})-(\d{2})(?:-(\d+))?\.pdf)"/gi;

const CACHE_TTL_MS = 12 * 60 * 1000; // no saturar el sitio institucional
const FETCH_TIMEOUT_MS = 18_000;

let cache = { at: 0, payload: null };

function parseEntradas(html) {
  const porDia = new Map();
  let m;
  RE_PDF_HREF.lastIndex = 0;
  while ((m = RE_PDF_HREF.exec(html)) !== null) {
    const url = m[1];
    const iso = `${m[2]}-${m[3]}-${m[4]}`;
    const rev = m[5] ? parseInt(m[5], 10) : 0;
    const prev = porDia.get(iso);
    if (!prev || rev > prev.rev) {
      porDia.set(iso, { url, fecha: iso, rev });
    }
  }
  const entradas = Array.from(porDia.values()).sort((a, b) => {
    const cmp = b.fecha.localeCompare(a.fecha);
    return cmp !== 0 ? cmp : b.rev - a.rev;
  });
  return entradas;
}

async function fetchListaPreciosAmbato() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(LISTA_PRECIOS_URL, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'AgroPay/1.0 (precios referencia EP-EMA; contacto técnico proyecto académico)',
      },
    });
    if (!res.ok) {
      const err = new Error(`EP-EMA HTTP ${res.status}`);
      err.code = 'HTTP';
      throw err;
    }
    const html = await res.text();
    const historial = parseEntradas(html);
    if (!historial.length) {
      const err = new Error('No se encontraron PDFs de precios en la página');
      err.code = 'PARSE';
      throw err;
    }
    const masReciente = historial[0];
    return {
      ok: true,
      paginaUrl: LISTA_PRECIOS_URL,
      masReciente: { url: masReciente.url, fecha: masReciente.fecha },
      historial: historial.map((e) => ({ url: e.url, fecha: e.fecha })),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @returns {Promise<{ ok: true, paginaUrl: string, masReciente: {url, fecha}, historial: Array<{url, fecha}> } | { ok: false, code?: string, message: string }>}
 */
async function fetchListaPreciosAmbatoCached() {
  const now = Date.now();
  if (cache.payload && now - cache.at < CACHE_TTL_MS) {
    return cache.payload;
  }
  try {
    const payload = await fetchListaPreciosAmbato();
    cache = { at: now, payload };
    return payload;
  } catch (e) {
    const failed = {
      ok: false,
      code: e.code || (e.name === 'AbortError' ? 'TIMEOUT' : 'UNKNOWN'),
      message:
        e.name === 'AbortError'
          ? 'Tiempo de espera al consultar EP-EMA.'
          : e.message || 'Error al leer la lista oficial.',
    };
    return failed;
  }
}

module.exports = {
  LISTA_PRECIOS_URL,
  fetchListaPreciosAmbatoCached,
};
