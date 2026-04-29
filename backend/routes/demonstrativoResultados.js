const express = require('express');
const router = express.Router();
const dreController = require('../controllers/demonstracaoResultadosController');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// Rotas principais
router.get('/calcular', dreController.calcularDRE);
router.get('/', dreController.listarDREs);
router.get('/:id', dreController.getDREById);
router.get('/comparar/periodos', dreController.compararPeriodos);

module.exports = router;