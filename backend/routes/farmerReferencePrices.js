const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireAgricultor = require('../middleware/requireAgricultor');
const { listReferencePrices } = require('../controllers/farmerReferencePricesController');

const router = express.Router();

router.use(authMiddleware, requireAgricultor);
router.get('/', listReferencePrices);

module.exports = router;
