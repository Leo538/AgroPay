const { createWorker, PSM } = require('tesseract.js');

const MAX_IMAGE_BYTES = 9 * 1024 * 1024;

/** Un solo worker reutilizable (la primera llamada descarga idiomas; puede tardar). */
let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(['spa', 'eng'], 1, {
      logger: () => {},
    });
  }
  return workerPromise;
}

/**
 * OCR sobre imagen en data URL (JPEG/PNG/WebP en base64).
 * @param {string} dataUrl
 * @returns {Promise<{ text: string, ok: boolean }>}
 */
async function ocrFromDataImageUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return { text: '', ok: false };
  }
  const i = dataUrl.indexOf('base64,');
  if (i === -1) return { text: '', ok: false };
  const b64 = dataUrl.slice(i + 7);
  let buffer;
  try {
    buffer = Buffer.from(b64, 'base64');
  } catch {
    return { text: '', ok: false };
  }
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    return { text: '', ok: false };
  }

  try {
    const worker = await getWorker();
    /**
     * SINGLE_BLOCK (por defecto en tesseract.js) suele perder líneas aisladas del importe
     * en comprobantes tipo app (monto grande centrado). AUTO reparte mejor la página.
     */
    await worker.setParameters({
      preserve_interword_spaces: '1',
      user_defined_dpi: '220',
      tessedit_pageseg_mode: PSM.AUTO,
      /** Motor neuronal; mejor en texto impreso / pantallas. */
      tessedit_ocr_engine_mode: '1',
    });
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return { text: String(text || '').trim(), ok: true };
  } catch (e) {
    console.error('[ocrComprobanteImagen]', e.message);
    return { text: '', ok: false };
  }
}

module.exports = { ocrFromDataImageUrl, getWorker };
