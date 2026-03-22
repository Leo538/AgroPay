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

const VENTANA_ALERTAS_HORAS = 48;

/** Productos publicados en las últimas N horas con stock (novedades en mercado). */
async function alertsResumen(req, res) {
  try {
    const ms = VENTANA_ALERTAS_HORAS * 60 * 60 * 1000;
    const desde = new Date(Date.now() - ms);
    const productosNuevos = await Product.countDocuments({
      cantidadDisponible: { $gt: 0 },
      createdAt: { $gte: desde },
    });
    return res.json({
      ventanaHoras: VENTANA_ALERTAS_HORAS,
      productosNuevos,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Error al contar productos nuevos en el mercado.' });
  }
}

/** Lista breve de productos nuevos en mercado (acceso rápido en inicio). */
async function alertsRecientesLista(req, res) {
  try {
    const ms = VENTANA_ALERTAS_HORAS * 60 * 60 * 1000;
    const desde = new Date(Date.now() - ms);
    const products = await Product.find({
      cantidadDisponible: { $gt: 0 },
      createdAt: { $gte: desde },
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .populate('farmer', FARMER_FIELDS)
      .lean();

    const items = products.map((p) => {
      const f = p.farmer;
      const vendedor = f
        ? `${f.nombre || ''} ${f.apellido || ''}`.trim()
        : 'Agricultor';
      return {
        _id: String(p._id),
        nombre: p.nombre,
        precio: p.precio,
        unidad: p.unidad,
        vendedor,
        createdAt: p.createdAt,
      };
    });

    return res.json({
      ventanaHoras: VENTANA_ALERTAS_HORAS,
      items,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Error al listar productos nuevos en el mercado.' });
  }
}

module.exports = {
  listProducts,
  getProduct,
  alertsResumen,
  alertsRecientesLista,
};
