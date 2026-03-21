const mongoose = require('mongoose');
const Product = require('../models/product');

const UNIDADES = Product.schema.path('unidad').enumValues;
const CATEGORIAS = Product.schema.path('categoria').enumValues;

function parseProductBody(body, partial) {
  const out = {};
  if (!partial || body.nombre !== undefined) {
    out.nombre = body.nombre != null ? String(body.nombre).trim() : '';
  }
  if (!partial || body.descripcion !== undefined) {
    out.descripcion =
      body.descripcion != null ? String(body.descripcion).trim() : '';
  }
  if (!partial || body.precio !== undefined) {
    out.precio = body.precio !== undefined && body.precio !== ''
      ? Number(body.precio)
      : NaN;
  }
  if (!partial || body.unidad !== undefined) {
    out.unidad =
      body.unidad != null ? String(body.unidad).trim().toLowerCase() : '';
  }
  if (!partial || body.categoria !== undefined) {
    let c =
      body.categoria != null
        ? String(body.categoria).trim().toLowerCase()
        : 'otros';
    if (!CATEGORIAS.includes(c)) c = 'otros';
    out.categoria = c;
  }
  if (!partial || body.cantidadDisponible !== undefined) {
    const q = body.cantidadDisponible;
    out.cantidadDisponible =
      q !== undefined && q !== '' ? Number(q) : partial ? undefined : 0;
  }
  if (!partial || body.imagenUrl !== undefined) {
    out.imagenUrl =
      body.imagenUrl != null ? String(body.imagenUrl).trim() : '';
  }
  return out;
}

function validateParsed(p, partial) {
  if (!partial || p.nombre !== undefined) {
    if (!p.nombre) {
      return 'El nombre del producto es obligatorio.';
    }
  }
  if (!partial || p.precio !== undefined) {
    if (Number.isNaN(p.precio) || p.precio < 0) {
      return 'Indica un precio válido (número mayor o igual a 0).';
    }
  }
  if (!partial || p.unidad !== undefined) {
    if (!p.unidad || !UNIDADES.includes(p.unidad)) {
      return 'Selecciona una unidad de venta válida.';
    }
  }
  if (!partial || p.cantidadDisponible !== undefined) {
    const c = p.cantidadDisponible;
    if (c !== undefined && (Number.isNaN(c) || c < 0)) {
      return 'La cantidad disponible debe ser un número mayor o igual a 0.';
    }
  }
  if (p.imagenUrl !== undefined && p.imagenUrl) {
    const max = 10 * 1024 * 1024;
    if (p.imagenUrl.length > max) {
      return 'La imagen es demasiado grande. Prueba con otra foto más liviana.';
    }
    const ok =
      p.imagenUrl.startsWith('data:image/') ||
      /^https?:\/\//i.test(p.imagenUrl);
    if (!ok) {
      return 'Formato de imagen no válido.';
    }
  }
  return null;
}

async function listMine(req, res) {
  try {
    const products = await Product.find({ farmer: req.userId })
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ products });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al listar productos.' });
  }
}

async function create(req, res) {
  try {
    const parsed = parseProductBody(req.body, false);
    const errMsg = validateParsed(parsed, false);
    if (errMsg) {
      return res.status(400).json({ message: errMsg });
    }

    const doc = await Product.create({
      farmer: req.userId,
      nombre: parsed.nombre,
      descripcion: parsed.descripcion,
      precio: parsed.precio,
      unidad: parsed.unidad,
      categoria: parsed.categoria,
      cantidadDisponible: Number.isNaN(parsed.cantidadDisponible)
        ? 0
        : parsed.cantidadDisponible,
      imagenUrl: parsed.imagenUrl || '',
    });
    return res.status(201).json({ product: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al crear el producto.' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Producto no válido.' });
    }

    const existing = await Product.findOne({ _id: id, farmer: req.userId });
    if (!existing) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const parsed = parseProductBody(req.body, true);
    const errMsg = validateParsed(parsed, true);
    if (errMsg) {
      return res.status(400).json({ message: errMsg });
    }

    const update = {};
    if (parsed.nombre !== undefined) update.nombre = parsed.nombre;
    if (parsed.descripcion !== undefined) update.descripcion = parsed.descripcion;
    if (parsed.precio !== undefined) update.precio = parsed.precio;
    if (parsed.unidad !== undefined) update.unidad = parsed.unidad;
    if (parsed.categoria !== undefined) update.categoria = parsed.categoria;
    if (parsed.cantidadDisponible !== undefined) {
      update.cantidadDisponible = parsed.cantidadDisponible;
    }
    if (parsed.imagenUrl !== undefined) {
      update.imagenUrl = parsed.imagenUrl;
    }

    if (Object.keys(update).length === 0) {
      return res.json({ product: existing });
    }

    const doc = await Product.findOneAndUpdate(
      { _id: id, farmer: req.userId },
      { $set: update },
      { new: true, runValidators: true }
    );
    return res.json({ product: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al actualizar el producto.' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Producto no válido.' });
    }
    const deleted = await Product.findOneAndDelete({
      _id: id,
      farmer: req.userId,
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    return res.json({ ok: true, message: 'Producto eliminado.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al eliminar el producto.' });
  }
}

module.exports = { listMine, create, update, remove };
