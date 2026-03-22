const mongoose = require('mongoose');
const Order = require('../models/order');
const Product = require('../models/product');
const { buildDatosExtraidos, parseMonto } = require('../services/extractPagoDatos');
const { intentarOcrComprobanteEnPedido } = require('../services/enriquecerPedidoOcr');
const { validarComprobanteAutomatico } = require('../services/validarComprobanteSistema');
const {
  redactOrderForClient,
  redactOrdersForClient,
} = require('../utils/redactOrderForClient');

const MAX_COMPROBANTE = 10 * 1024 * 1024;
/** Tamaño mínimo del binario decodificado (evita íconos / payloads triviales). */
const MIN_IMAGE_BYTES = 256;

function looksLikeJpeg(buf) {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function looksLikePng(buf) {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

function looksLikeGif(buf) {
  return (
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  );
}

function looksLikeWebp(buf) {
  return (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  );
}

function validateComprobanteUrl(url) {
  if (!url || !String(url).trim()) {
    return null;
  }
  const s = String(url).trim();
  if (s.length > MAX_COMPROBANTE) {
    return 'La imagen es demasiado grande. Prueba con otra más liviana.';
  }
  if (s.startsWith('data:image/')) {
    const m = s.match(/^data:(image\/[\w+.-]+);base64,([\s\S]*)$/i);
    if (!m) {
      return 'Formato de imagen no válido (se espera JPEG/PNG en base64).';
    }
    const mime = m[1].toLowerCase();
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(mime)) {
      return 'Solo se permiten imágenes JPEG, PNG, GIF o WebP.';
    }
    const b64 = m[2].replace(/\s/g, '');
    let buf;
    try {
      buf = Buffer.from(b64, 'base64');
    } catch {
      return 'La imagen no pudo decodificarse.';
    }
    if (!buf || buf.length < MIN_IMAGE_BYTES) {
      return 'La imagen es demasiado pequeña o no es un archivo de imagen válido.';
    }
    const jpegOk = (mime === 'image/jpeg' || mime === 'image/jpg') && looksLikeJpeg(buf);
    const pngOk = mime === 'image/png' && looksLikePng(buf);
    const gifOk = mime === 'image/gif' && looksLikeGif(buf);
    const webpOk = mime === 'image/webp' && looksLikeWebp(buf);
    if (!jpegOk && !pngOk && !gifOk && !webpOk) {
      return 'El archivo no coincide con el tipo de imagen indicado (puede estar corrupto o no ser un comprobante).';
    }
    return null;
  }
  if (/^https?:\/\//i.test(s)) {
    return null;
  }
  return 'Formato de imagen no válido.';
}

const MAX_QR_PAYLOAD = 4096;

function parseComprobanteBody(body) {
  const urlRaw = body?.comprobanteUrl;
  const qrRaw = body?.comprobanteQrPayload;

  const urlTrim = urlRaw != null ? String(urlRaw).trim() : '';
  const qrTrim = qrRaw != null ? String(qrRaw).trim() : '';

  const hasUrl = urlTrim.length > 0;
  const hasQr = qrTrim.length > 0;

  if (!hasUrl && !hasQr) {
    return {
      error:
        'Escanea un QR, sube una imagen del comprobante o toma una foto.',
    };
  }

  if (hasUrl) {
    const urlErr = validateComprobanteUrl(urlTrim);
    if (urlErr) {
      return { error: urlErr };
    }
  }

  if (hasQr) {
    if (qrTrim.length > MAX_QR_PAYLOAD) {
      return { error: 'Los datos del QR son demasiado largos.' };
    }
  }

  return {
    comprobanteUrl: hasUrl ? urlTrim : '',
    comprobanteQrPayload: hasQr ? qrTrim : '',
    montoDeclarado: body?.montoDeclarado,
    referenciaDeclarada: body?.referenciaDeclarada,
  };
}

async function populateOrderLean(id) {
  return Order.findById(id)
    .populate('farmer', 'nombre apellido telefono')
    .lean();
}

async function restituirStock(orderDoc) {
  if (orderDoc.stockRestituido) return;
  for (const item of orderDoc.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { cantidadDisponible: item.cantidad },
    });
  }
  orderDoc.stockRestituido = true;
}

async function create(req, res) {
  try {
    const productId = req.body?.productId;
    const cantidad = Number(req.body?.cantidad);

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Producto no válido.' });
    }
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({ message: 'Indica una cantidad válida (entero ≥ 1).' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    if (String(product.farmer) === String(req.userId)) {
      return res.status(403).json({ message: 'No puedes comprar tu propio producto.' });
    }
    if (product.cantidadDisponible < cantidad) {
      return res.status(400).json({ message: 'No hay stock suficiente para esta cantidad.' });
    }

    const precioUnitario = product.precio;
    const total = Math.round(precioUnitario * cantidad * 100) / 100;

    const updated = await Product.findOneAndUpdate(
      { _id: productId, cantidadDisponible: { $gte: cantidad } },
      { $inc: { cantidadDisponible: -cantidad } },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({ message: 'El stock cambió. Intenta de nuevo.' });
    }

    /** Solo transferencia (política de la app). */
    const metodoPago = 'transferencia';

    const order = await Order.create({
      buyer: req.userId,
      farmer: product.farmer,
      items: [
        {
          product: product._id,
          nombre: product.nombre,
          cantidad,
          precioUnitario,
          unidad: product.unidad,
        },
      ],
      total,
      estado: 'pendiente',
      comprobanteUrl: '',
      comprobanteQrPayload: '',
      metodoPago,
    });

    const populated = await populateOrderLean(order._id);
    return res.status(201).json({ order: redactOrderForClient(populated) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al crear el pedido.' });
  }
}

async function listMine(req, res) {
  try {
    const orders = await Order.find({ buyer: req.userId })
      .sort({ createdAt: -1 })
      .populate('farmer', 'nombre apellido telefono')
      .lean();
    return res.json({ orders: redactOrdersForClient(orders) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al listar pedidos.' });
  }
}

async function getOne(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Pedido no válido.' });
    }
    const order = await Order.findOne({ _id: id, buyer: req.userId })
      .populate('farmer', 'nombre apellido telefono')
      .lean();
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    return res.json({ order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al cargar el pedido.' });
  }
}

async function uploadComprobante(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Pedido no válido.' });
    }

    const parsed = parseComprobanteBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const order = await Order.findOne({ _id: id, buyer: req.userId });
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    if (order.estado !== 'pendiente' && order.estado !== 'pendiente_comprobante') {
      return res.status(400).json({
        message: 'Este pedido ya no admite comprobante (estado actualizado).',
      });
    }

    order.comprobanteUrl = parsed.comprobanteUrl;
    order.comprobanteQrPayload = parsed.comprobanteQrPayload;

    const tieneImagen = !!(
      parsed.comprobanteUrl && String(parsed.comprobanteUrl).startsWith('data:image')
    );

    const datosExtraidos = buildDatosExtraidos({
      comprobanteQrPayload: parsed.comprobanteQrPayload,
      /** Con imagen, monto y ref manuales no se usan: solo QR + OCR. */
      montoDeclarado: tieneImagen ? undefined : parsed.montoDeclarado,
      referenciaDeclarada: tieneImagen ? undefined : parsed.referenciaDeclarada,
    });
    order.datosExtraidos = datosExtraidos;
    order.ocrYaIntentado = false;
    order.ocrResumen = '';

    await intentarOcrComprobanteEnPedido(order);

    /** Con imagen, el monto del formulario no debe usarse como “monto verificado”. */
    if (tieneImagen) {
      const base =
        order.datosExtraidos?.toObject?.() || { ...(order.datosExtraidos || {}) };
      const probado = base.fuenteOcr || base.fuenteQrMonto;
      if (!probado) {
        order.datosExtraidos = {
          ...base,
          monto: null,
          fuenteCliente: false,
          fuenteOcrMonto: false,
        };
        order.markModified('datosExtraidos');
      }
    }

    const mOcr = order.datosExtraidos?.monto;
    const montoHueco =
      mOcr == null || mOcr === '' || Number.isNaN(Number(mOcr));
    if (
      !tieneImagen &&
      montoHueco &&
      parsed.montoDeclarado != null &&
      String(parsed.montoDeclarado).trim()
    ) {
      const pm = parseMonto(parsed.montoDeclarado);
      if (pm != null) {
        const base =
          order.datosExtraidos?.toObject?.() || { ...(order.datosExtraidos || {}) };
        order.datosExtraidos = { ...base, monto: pm, fuenteCliente: true };
        order.markModified('datosExtraidos');
      }
    }

    const {
      ok,
      validacionSistema,
      referenciaPago,
    } = await validarComprobanteAutomatico(order, order.datosExtraidos);

    const deFlat = order.datosExtraidos?.toObject?.() || order.datosExtraidos || {};
    const montoProbadoPorComprobante = !!(
      deFlat.fuenteOcrMonto || deFlat.fuenteQrMonto
    );
    const refOk = validacionSistema.tieneReferencia;
    const dupOk = validacionSistema.sinDuplicado;

    order.validacionSistema = validacionSistema;
    order.referenciaPago = referenciaPago || '';

    if (ok) {
      order.estado = 'pre_validado';
      order.rechazoMotivo = '';
      order.rechazadoPor = '';
    } else if (tieneImagen && refOk && dupOk && !montoProbadoPorComprobante) {
      order.estado = 'comprobante_enviado';
      order.rechazoMotivo = '';
      order.rechazadoPor = '';
    } else {
      order.estado = 'rechazado';
      order.rechazadoPor = 'sistema';
      order.rechazoMotivo = validacionSistema.mensajes.join(' ');
      await restituirStock(order);
    }

    await order.save();

    const populated = await populateOrderLean(order._id);
    return res.json({ order: redactOrderForClient(populated) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al procesar el comprobante.' });
  }
}

module.exports = { create, listMine, getOne, uploadComprobante };
