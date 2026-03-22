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

const datosExtraidosSchema = new mongoose.Schema(
  {
    monto: { type: Number, default: null },
    referencia: { type: String, default: '', maxlength: 120 },
    fuenteQr: { type: Boolean, default: false },
    /** El monto vino explícitamente del texto/URL del QR (no solo referencia). */
    fuenteQrMonto: { type: Boolean, default: false },
    fuenteCliente: { type: Boolean, default: false },
    /** Hubo texto OCR útil (monto y/o referencia desde la imagen). */
    fuenteOcr: { type: Boolean, default: false },
    /** El monto proviene explícitamente del OCR (no confundir con solo referencia OCR). */
    fuenteOcrMonto: { type: Boolean, default: false },
  },
  { _id: false }
);

const validacionSistemaSchema = new mongoose.Schema(
  {
    montoCoincide: { type: Boolean, default: false },
    tieneReferencia: { type: Boolean, default: false },
    sinDuplicado: { type: Boolean, default: false },
    mensajes: { type: [String], default: [] },
  },
  { _id: false }
);

/** Incluye valores legacy por pedidos creados antes del flujo pre_validado */
const ESTADOS = [
  'pendiente',
  'pendiente_comprobante',
  'pre_validado',
  'comprobante_enviado',
  'rechazado',
  'pagado',
  'entregado',
];

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
      enum: ESTADOS,
      default: 'pendiente',
      index: true,
    },
    comprobanteUrl: {
      type: String,
      default: '',
      maxlength: 12 * 1024 * 1024,
    },
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
    datosExtraidos: {
      type: datosExtraidosSchema,
      default: () => ({}),
    },
    validacionSistema: {
      type: validacionSistemaSchema,
      default: () => ({
        montoCoincide: false,
        tieneReferencia: false,
        sinDuplicado: false,
        mensajes: [],
      }),
    },
    /** Referencia normalizada para anti-duplicados */
    referenciaPago: {
      type: String,
      default: '',
      maxlength: 64,
      index: true,
    },
    rechazoMotivo: {
      type: String,
      default: '',
      maxlength: 500,
    },
    rechazadoPor: {
      type: String,
      enum: ['', 'sistema', 'agricultor'],
      default: '',
    },
    /** Uso interno legado; no se envía al cliente (ver redactOrderForClient). */
    ocrResumen: {
      type: String,
      default: '',
      maxlength: 4000,
    },
    /** Evita ejecutar OCR en cada GET del agricultor */
    ocrYaIntentado: {
      type: Boolean,
      default: false,
    },
    stockRestituido: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
Order.ESTADOS = ESTADOS;
module.exports = Order;
