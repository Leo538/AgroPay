const mongoose = require('mongoose');
const Product = require('../models/product');

const FARMER_FIELDS = 'nombre apellido telefono';

function productToJson(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (o.farmer && o.farmer._id) {
    o.farmer = {
      _id: o.farmer._id,
      nombre: o.farmer.nombre || '',
      apellido: o.farmer.apellido || '',
      telefono: o.farmer.telefono || '',
    };
  }
  return o;
}

async function listProducts(req, res) {
  try {
    const products = await Product.find({ cantidadDisponible: { $gt: 0 } })
      .sort({ updatedAt: -1 })
      .populate('farmer', FARMER_FIELDS)
      .lean();

    return res.json({
      products: products.map((p) => ({
        ...p,
        farmer: p.farmer
          ? {
              _id: p.farmer._id,
              nombre: p.farmer.nombre || '',
              apellido: p.farmer.apellido || '',
              telefono: p.farmer.telefono || '',
            }
          : null,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al cargar el mercado.' });
  }
}

async function getProduct(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Producto no válido.' });
    }
    const doc = await Product.findOne({
      _id: id,
      cantidadDisponible: { $gt: 0 },
    }).populate('farmer', FARMER_FIELDS);

    if (!doc) {
      return res.status(404).json({ message: 'Producto no disponible.' });
    }
    return res.json({ product: productToJson(doc) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al cargar el producto.' });
  }
}

module.exports = { listProducts, getProduct };
