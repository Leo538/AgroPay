const Order = require('../models/order');
const { normalizeReferenciaKey } = require('./extractPagoDatos');

const MONTO_EPS = 0.02;

/**
 * @param {import('mongoose').Document & { total: number, comprobanteUrl?: string }} order
 * @param {{ monto: number|null, referencia: string, fuenteQr?: boolean, fuenteQrMonto?: boolean, fuenteCliente?: boolean, fuenteOcr?: boolean, fuenteOcrMonto?: boolean }} datos
 * @returns {{ ok: boolean, validacionSistema: object, referenciaPago: string, mensajes: string[] }}
 */
async function validarComprobanteAutomatico(order, datos) {
  const mensajes = [];
  const validacionSistema = {
    montoCoincide: false,
    tieneReferencia: false,
    sinDuplicado: false,
    mensajes: [],
  };

  const total = Math.round(Number(order.total) * 100) / 100;
  const refKey = normalizeReferenciaKey(datos.referencia);
  const tieneImagen = !!(
    order.comprobanteUrl && String(order.comprobanteUrl).startsWith('data:image')
  );
  const montoProbadoPorComprobante =
    !!datos.fuenteOcrMonto || !!datos.fuenteQrMonto;

  if (datos.monto == null || Number.isNaN(datos.monto)) {
    mensajes.push(
      'No hay monto extraído del comprobante ni del QR. Si subiste imagen, debe leerse el importe; si no, indica el monto o un QR que lo traiga.'
    );
  } else if (tieneImagen && !montoProbadoPorComprobante) {
    mensajes.push(
      'El importe del formulario no cuenta como verificación automática: hay imagen pero no se leyó el monto en el comprobante. El agricultor revisará la captura.'
    );
  } else {
    const diff = Math.abs(datos.monto - total);
    if (diff <= MONTO_EPS) {
      validacionSistema.montoCoincide = true;
      mensajes.push(
        `Monto verificado: $${datos.monto.toFixed(2)} coincide con el pedido ($${total.toFixed(2)}).`
      );
    } else {
      mensajes.push(
        `El monto del comprobante ($${datos.monto.toFixed(2)}) no coincide con el total del pedido ($${total.toFixed(2)}).`
      );
    }
  }

  if (!refKey || refKey.length < 3) {
    mensajes.push(
      'Falta una referencia de pago reconocible. Escanea un QR o escribe la referencia del banco/comprobante.'
    );
  } else {
    validacionSistema.tieneReferencia = true;
    mensajes.push(
      `Referencia registrada: ${refKey.slice(0, 24)}${refKey.length > 24 ? '…' : ''}`
    );
  }

  let sinDuplicado = true;
  if (refKey.length >= 3) {
    const dup = await Order.findOne({
      _id: { $ne: order._id },
      farmer: order.farmer,
      referenciaPago: refKey,
      estado: { $in: ['pre_validado', 'pagado', 'entregado'] },
    })
      .select('_id')
      .lean();
    if (dup) {
      sinDuplicado = false;
      mensajes.push(
        'Esta referencia ya fue usada en otro pedido aceptado. Comprueba que no sea un duplicado.'
      );
    } else {
      mensajes.push('Sin duplicados detectados para esta referencia.');
    }
  }
  validacionSistema.sinDuplicado = sinDuplicado;

  const ok =
    validacionSistema.montoCoincide &&
    validacionSistema.tieneReferencia &&
    validacionSistema.sinDuplicado;

  validacionSistema.mensajes = mensajes;
  return {
    ok,
    validacionSistema,
    referenciaPago: refKey,
    mensajes,
  };
}

module.exports = { validarComprobanteAutomatico, MONTO_EPS };
