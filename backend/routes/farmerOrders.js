const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireAgricultor = require('../middleware/requireAgricultor');
const {
  listReceived,
  getOne,
  confirmarPago,
  rechazarPedido,
  marcarEntregado,
  alertsResumen,
  alertsRecientesLista,
} = require('../controllers/farmerOrderController');

const router = express.Router();

router.use(authMiddleware, requireAgricultor);

router.get('/', listReceived);
router.get('/alerts/resumen', alertsResumen);
router.get('/alerts/recientes', alertsRecientesLista);
router.put('/:id/confirmar', confirmarPago);
router.put('/:id/rechazar', rechazarPedido);
router.put('/:id/entregado', marcarEntregado);
router.get('/:id', getOne);

module.exports = router;
