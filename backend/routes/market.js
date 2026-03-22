const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireComprador = require('../middleware/requireComprador');
const {
  listProducts,
  getProduct,
  alertsResumen,
  alertsRecientesLista,
} = require('../controllers/marketController');

const router = express.Router();

router.use(authMiddleware, requireComprador);

router.get('/alerts/resumen', alertsResumen);
router.get('/alerts/recientes', alertsRecientesLista);
router.get('/products', listProducts);
router.get('/products/:id', getProduct);

module.exports = router;
