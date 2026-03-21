const jwt = require('jsonwebtoken');

/**
 * Protege rutas: header Authorization: Bearer <token>
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Error' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    return next();
  } catch {
    return res.status(401).json({ message: 'Error' });
  }
}

module.exports = authMiddleware;
