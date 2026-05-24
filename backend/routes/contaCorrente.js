// backend/routes/contaCorrente.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { logMiddleware } = require('../middlewares/logger');
const contaCorrenteController = require('../controllers/contaCorrenteController');

router.use(verifyToken);

// Listar todas as contas (GET - sem logging)
router.get('/', contaCorrenteController.listarContas);

// Resumo geral (GET - sem logging)
router.get('/resumo', contaCorrenteController.getResumoGeral);

// Extrato completo por fornecedor (GET - sem logging)
router.get('/extrato/completo', contaCorrenteController.obterExtratoCompleto);

// Movimentos detalhados (GET - sem logging)
router.get('/movimentos', contaCorrenteController.obterMovimentosDetalhados);

// Movimentos por fornecedor (GET - sem logging)
router.get('/fornecedor', contaCorrenteController.obterMovimentosPorFornecedor);

// ============================================
// ROTAS COM LOGGER (operações que modificam dados)
// ============================================

// Sincronizar com pagamentos (POST - COM LOGGER)
router.post('/sincronizar', logMiddleware('conta-corrente-sincronizar'), contaCorrenteController.sincronizarComPagamentos);

// Gerar créditos antecipados (POST - COM LOGGER)
router.post('/gerar-creditos-antecipados', logMiddleware('conta-corrente-creditos-antecipados'), contaCorrenteController.gerarCreditosAntecipados);

// Registrar crédito (fatura) (POST - COM LOGGER)
router.post('/credito', logMiddleware('conta-corrente-credito'), contaCorrenteController.registrarCredito);

// Registrar débito (pagamento) (POST - COM LOGGER)
router.post('/debito', logMiddleware('conta-corrente-debito'), contaCorrenteController.registrarDebito);

// Recalcular contas (POST - COM LOGGER)
router.post('/recalcular', logMiddleware('conta-corrente-recalcular'), contaCorrenteController.recalcularContas);

module.exports = router;