const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireAgricultor = require('../middleware/requireAgricultor');
const {
  listMine,
  create,
  update,
  remove,
} = require('../controllers/productController');

const router = express.Router();

router.use(authMiddleware, requireAgricultor);

router.get('/mine', listMine);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
