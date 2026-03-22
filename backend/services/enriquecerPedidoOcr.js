const { ocrFromDataImageUrl } = require('./ocrComprobanteImagen');
const { enriquecerDatosDesdeOcrSiFalta } = require('./extractPagoDatos');

/**
 * Con imagen adjunta: siempre intentamos OCR una vez para leer monto/referencia del comprobante.
 * Antes se omitía si el comprador ya tenía el total del pedido en el formulario → jamás se leía el $10 del voucher.
 * @param {import('mongoose').Document} order
 */
async function intentarOcrComprobanteEnPedido(order) {
  const url = order.comprobanteUrl;
  if (!url || typeof url !== 'string' || !url.startsWith('data:image')) return;
  if (order.ocrYaIntentado) return;

  order.ocrYaIntentado = true;
  order.ocrResumen = '';

  const { text, ok } = await ocrFromDataImageUrl(url);

  if (!ok || !text || text.length < 2) {
    return;
  }

  const base =
    order.datosExtraidos && typeof order.datosExtraidos.toObject === 'function'
      ? order.datosExtraidos.toObject()
      : { ...(order.datosExtraidos || {}) };
  order.datosExtraidos = enriquecerDatosDesdeOcrSiFalta(base, text);
  order.markModified('datosExtraidos');
}

module.exports = { intentarOcrComprobanteEnPedido };
