const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireComprador = require('../middleware/requireComprador');
const {
  create,
  listMine,
  getOne,
  uploadComprobante,
} = require('../controllers/orderController');

const router = express.Router();

router.use(authMiddleware, requireComprador);

router.post('/', create);
router.get('/mine', listMine);
router.put('/:id/comprobante', uploadComprobante);
router.get('/:id', getOne);

module.exports = router;
