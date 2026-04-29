const express = require('express');
const router = express.Router();
const fluxoCaixaController = require('../controllers/fluxoCaixaController');
const { verifyToken } = require('../middlewares/auth');

// Todas as rotas requerem autenticação
router.use(verifyToken);

// Rota principal - calcular fluxo de caixa
router.get('/calcular', fluxoCaixaController.calcularFluxoCaixa);

// Saldo acumulado até uma data
router.get('/saldo', fluxoCaixaController.getSaldoAcumulado);

// Histórico mensal
router.get('/historico', fluxoCaixaController.getHistorico);

module.exports = router;