const mongoose = require('mongoose');
const Order = require('../models/order');
const Product = require('../models/product');

const MAX_COMPROBANTE = 10 * 1024 * 1024;

function validateComprobanteUrl(url) {
  if (!url || !String(url).trim()) {
    return null;
  }
  const s = String(url).trim();
  if (s.length > MAX_COMPROBANTE) {
    return 'La imagen es demasiado grande. Prueba con otra más liviana.';
  }
  const ok =
    s.startsWith('data:image/') || /^https?:\/\//i.test(s);
  if (!ok) {
    return 'Formato de imagen no válido.';
  }
  return null;
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
  };
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

    const metodoPago =
      req.body?.metodoPago != null
        ? String(req.body.metodoPago).trim().slice(0, 80)
        : '';

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
      estado: 'pendiente_comprobante',
      comprobanteUrl: '',
      metodoPago,
    });

    const populated = await Order.findById(order._id)
      .populate('farmer', 'nombre apellido telefono')
      .lean();

    return res.status(201).json({ order: populated });
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
    return res.json({ orders });
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
    if (order.estado !== 'pendiente_comprobante') {
      return res.status(400).json({ message: 'Este pedido ya tiene comprobante enviado.' });
    }

    order.comprobanteUrl = parsed.comprobanteUrl;
    order.comprobanteQrPayload = parsed.comprobanteQrPayload;
    order.estado = 'comprobante_enviado';
    await order.save();

    const populated = await Order.findById(order._id)
      .populate('farmer', 'nombre apellido telefono')
      .lean();

    return res.json({ order: populated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al guardar el comprobante.' });
  }
}

module.exports = { create, listMine, getOne, uploadComprobante };
