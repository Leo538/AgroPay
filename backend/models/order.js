const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    nombre: { type: String, required: true, trim: true },
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true, min: 0 },
    unidad: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [itemSchema],
      validate: [(arr) => Array.isArray(arr) && arr.length > 0, 'Al menos un ítem'],
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    estado: {
      type: String,
      enum: ['pendiente_comprobante', 'comprobante_enviado'],
      default: 'pendiente_comprobante',
    },
    /** Captura de transferencia, voucher o foto del QR (data URL o https) */
    comprobanteUrl: {
      type: String,
      default: '',
      maxlength: 12 * 1024 * 1024,
    },
    /** Texto leído al escanear un QR (pago, URL, referencia) */
    comprobanteQrPayload: {
      type: String,
      default: '',
      maxlength: 4096,
    },
    metodoPago: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
