const mongoose = require('mongoose');

const UNIDADES = [
  'kg',
  'lb',
  'unidad',
  'docena',
  'litro',
  'arroba',
  'atado',
  'otro',
];

const CATEGORIAS = [
  'frutas',
  'verduras',
  'granos',
  'tuberculos',
  'lacteos',
  'otros',
];

const productSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    descripcion: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    precio: {
      type: Number,
      required: true,
      min: 0,
    },
    unidad: {
      type: String,
      required: true,
      enum: UNIDADES,
    },
    categoria: {
      type: String,
      enum: CATEGORIAS,
      default: 'otros',
    },
    cantidadDisponible: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Data URL (data:image/...) o URL absoluta; vacío si no hay foto */
    imagenUrl: {
      type: String,
      default: '',
      maxlength: 12 * 1024 * 1024,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
