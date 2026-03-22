const User = require('../models/user');

/**
 * Debe ir después de authMiddleware (req.userId).
 */
async function requireComprador(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'comprador') {
      return res.status(403).json({
        message: 'Solo los compradores pueden usar el mercado y los pedidos.',
      });
    }
    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error' });
  }
}

module.exports = requireComprador;
