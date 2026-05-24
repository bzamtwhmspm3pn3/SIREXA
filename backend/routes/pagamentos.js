// backend/routes/pagamentos.js
const express = require('express');
const router = express.Router();
const pagamentoController = require('../controllers/pagamentoController');
const { verifyToken } = require('../middlewares/auth');
const { logMiddleware } = require('../middlewares/logger');

router.use(verifyToken);

// Rotas para contas de débito
router.get('/contas-debito', pagamentoController.listarContasDebito);
router.get('/saldo-conta', pagamentoController.getSaldoConta);

// Rotas principais (GET - sem logging)
router.get('/', pagamentoController.listarPagamentos);
router.get('/dashboard', pagamentoController.getDashboard);
router.get('/proximos', pagamentoController.getProximosPagamentos);
router.get('/estatisticas', pagamentoController.getEstatisticasPorCategoria);
router.get('/folha', pagamentoController.buscarPagamentosFolha);

// 🔥 ROTAS DE PAGAMENTO COM LOGGER
router.get('/preparar-pagamento', pagamentoController.prepararPagamento);
router.post('/processar-pagamento/:id', logMiddleware('pagamentos-processar'), pagamentoController.processarPagamento);

// Rotas de criação e atualização - COM LOGGER
router.post('/', logMiddleware('pagamentos'), pagamentoController.criarPagamentoManual);
router.put('/:id/status', logMiddleware('pagamentos-status'), pagamentoController.atualizarStatusPagamento);
router.put('/:id', logMiddleware('pagamentos'), pagamentoController.atualizarStatus);
router.delete('/:id', logMiddleware('pagamentos'), pagamentoController.cancelarPagamento);

module.exports = router;