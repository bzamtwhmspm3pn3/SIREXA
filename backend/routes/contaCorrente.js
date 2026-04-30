// backend/routes/contaCorrente.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const contaCorrenteController = require('../controllers/contaCorrenteController');

router.use(verifyToken);

// Listar todas as contas
router.get('/', contaCorrenteController.listarContas);

// Resumo geral
router.get('/resumo', contaCorrenteController.getResumoGeral);

// Extrato completo por fornecedor
router.get('/extrato/completo', contaCorrenteController.obterExtratoCompleto);

// Movimentos detalhados
router.get('/movimentos', contaCorrenteController.obterMovimentosDetalhados);

// Movimentos por fornecedor
router.get('/fornecedor', contaCorrenteController.obterMovimentosPorFornecedor);

// Sincronizar com pagamentos
router.post('/sincronizar', contaCorrenteController.sincronizarComPagamentos);

// Gerar créditos antecipados
router.post('/gerar-creditos-antecipados', contaCorrenteController.gerarCreditosAntecipados);

// Registrar crédito (fatura)
router.post('/credito', contaCorrenteController.registrarCredito);

// Registrar débito (pagamento)
router.post('/debito', contaCorrenteController.registrarDebito);

// Recalcular contas
router.post('/recalcular', contaCorrenteController.recalcularContas);

module.exports = router;
