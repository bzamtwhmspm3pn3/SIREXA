// backend/routes/pagamentos.js
const express = require('express');
const router = express.Router();
const pagamentoController = require('../controllers/pagamentoController');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// Rotas para contas de débito
router.get('/contas-debito', pagamentoController.listarContasDebito);
router.get('/saldo-conta', pagamentoController.getSaldoConta);

// Rotas principais
router.get('/', pagamentoController.listarPagamentos);
router.get('/dashboard', pagamentoController.getDashboard);
router.get('/proximos', pagamentoController.getProximosPagamentos);
router.get('/estatisticas', pagamentoController.getEstatisticasPorCategoria);
router.get('/folha', pagamentoController.buscarPagamentosFolha);

// 🔥 NOVAS ROTAS - Pagamento com seleção de conta
router.get('/preparar-pagamento', pagamentoController.prepararPagamento);
router.post('/processar-pagamento/:id', pagamentoController.processarPagamento);

// Rotas de criação e atualização
router.post('/', pagamentoController.criarPagamentoManual);
router.put('/:id/status', pagamentoController.atualizarStatusPagamento);
router.put('/:id', pagamentoController.atualizarStatus);
router.delete('/:id', pagamentoController.cancelarPagamento);

module.exports = router;