const mongoose = require('mongoose');
const Order = require('../models/order');
const Product = require('../models/product');
const { intentarOcrComprobanteEnPedido } = require('../services/enriquecerPedidoOcr');
const {
  redactOrderForClient,
  redactOrdersForClient,
} = require('../utils/redactOrderForClient');

/** Pedidos listos para que el agricultor confirme o rechace (flujo nuevo + legacy). */
function estadoPermiteDecisionAgricultor(estado) {
  return estado === 'pre_validado' || estado === 'comprobante_enviado';
}

async function populateFarmerOrder(id) {
  return Order.findById(id)
    .populate('buyer', 'nombre apellido telefono email')
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

async function listReceived(req, res) {
  try {
    const orders = await Order.find({ farmer: req.userId })
      .sort({ updatedAt: -1 })
      .populate('buyer', 'nombre apellido telefono email')
      .lean();
    return res.json({ orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al listar pedidos recibidos.' });
  }
}

async function getOne(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Pedido no válido.' });
    }
    const order = await Order.findOne({ _id: id, farmer: req.userId }).populate(
      'buyer',
      'nombre apellido telefono email'
    );
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    await intentarOcrComprobanteEnPedido(order);
    if (order.isModified()) {
      await order.save();
    }

    const populated = await populateFarmerOrder(order._id);
    return res.json({ order: redactOrderForClient(populated) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al cargar el pedido.' });
  }
}

async function confirmarPago(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Pedido no válido.' });
    }
    const order = await Order.findOne({ _id: id, farmer: req.userId });
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    if (!estadoPermiteDecisionAgricultor(order.estado)) {
      return res.status(400).json({
        message:
          'Solo puedes confirmar pedidos con comprobante recibido (pre-validado o pendiente de tu revisión).',
      });
    }
    order.estado = 'pagado';
    order.rechazoMotivo = '';
    order.rechazadoPor = '';
    await order.save();
    const populated = await populateFarmerOrder(order._id);
    return res.json({ order: redactOrderForClient(populated) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al confirmar el pago.' });
  }
}

async function rechazarPedido(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Pedido no válido.' });
    }
    const motivo =
      req.body?.motivo != null ? String(req.body.motivo).trim().slice(0, 500) : '';
    if (!motivo) {
      return res.status(400).json({ message: 'Indica el motivo del rechazo.' });
    }

    const order = await Order.findOne({ _id: id, farmer: req.userId });
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    if (!estadoPermiteDecisionAgricultor(order.estado)) {
      return res.status(400).json({
        message:
          'Solo puedes rechazar pedidos con comprobante recibido (pre-validado o pendiente de tu revisión).',
      });
    }

    order.estado = 'rechazado';
    order.rechazadoPor = 'agricultor';
    order.rechazoMotivo = motivo;
    await restituirStock(order);
    await order.save();

    const populated = await populateFarmerOrder(order._id);
    return res.json({ order: redactOrderForClient(populated) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al rechazar el pedido.' });
  }
}

async function marcarEntregado(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Pedido no válido.' });
    }
    const order = await Order.findOne({ _id: id, farmer: req.userId });
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    if (order.estado !== 'pagado') {
      return res.status(400).json({
        message: 'Solo puedes marcar como entregado un pedido ya pagado.',
      });
    }
    order.estado = 'entregado';
    await order.save();
    const populated = await populateFarmerOrder(order._id);
    return res.json({ order: redactOrderForClient(populated) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al marcar entregado.' });
  }
}

module.exports = {
  listReceived,
  getOne,
  confirmarPago,
  rechazarPedido,
  marcarEntregado,
};
