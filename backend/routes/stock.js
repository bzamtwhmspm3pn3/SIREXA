// backend/routes/stock.js
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { verifyToken } = require('../middlewares/auth');
const { validateEmpresaAccess } = require('../middlewares/security');
const { logMiddleware } = require('../middlewares/logger');

router.use(verifyToken);
router.use(validateEmpresaAccess);

// ============================================
// 📊 DASHBOARD E ESTATÍSTICAS
// ============================================
router.get('/dashboard', stockController.getDashboardStock);
router.get('/stats', stockController.getStockStats);

// ============================================
// ⚠️ ALERTAS
// ============================================
router.get('/baixo-estoque', stockController.getEstoqueBaixo);
router.get('/proximos-vencer', stockController.getProximosVencer);
router.get('/vencidos', stockController.getProdutosVencidos);

// ============================================
// 🔍 BUSCAS ESPECÍFICAS
// ============================================
router.get('/por-codigo-barras/:codigo', stockController.getStockByCodigoBarras);
router.get('/por-lote/:lote', stockController.getStockByLote);
router.get('/por-armazem/:armazem', stockController.getStockByArmazem);

// ============================================
// 📦 CRUD PRINCIPAL
// ============================================
router.get('/', stockController.getAllStock);
router.get('/:id', stockController.getStockById);
router.post('/', logMiddleware('stock-criar'), stockController.createStock);
router.put('/:id', logMiddleware('stock-atualizar'), stockController.updateStock);
router.delete('/:id', logMiddleware('stock-deletar'), stockController.deleteStock);

// ============================================
// 🆕 ROTA PARA COMPRA COM FORNECEDOR
// ============================================
router.post('/:id/compra-fornecedor', logMiddleware('stock-compra-fornecedor'), stockController.registrarEntradaComFornecedor);

// ============================================
// 📦 OPERAÇÕES DE ESTOQUE
// ============================================
router.patch('/:id/ajustar-estoque', logMiddleware('stock-ajuste'), stockController.ajustarEstoque);
router.post('/:id/entrada', logMiddleware('stock-entrada'), stockController.registrarEntrada);
router.post('/:id/saida', logMiddleware('stock-saida'), stockController.registrarSaida);

// ============================================
// 🔄 DEVOLUÇÕES E DESCARTES
// ============================================
router.post('/:id/devolver', logMiddleware('stock-devolucao'), stockController.devolverProduto);
router.post('/:id/descartar', logMiddleware('stock-descarte'), stockController.descartarProduto);

// ============================================
// 📄 RELATÓRIOS
// ============================================
router.get('/relatorio/validade', stockController.relatorioValidade);
router.get('/relatorio/movimentacoes', stockController.relatorioMovimentacoes);
router.get('/servicos', (req, res, next) => { req.query.tipo = 'servico'; next(); }, stockController.getAllStock);

// ============================================
// 📊 ROTA DE TESTE
// ============================================
router.get('/health/check', (req, res) => {
  res.json({ sucesso: true, mensagem: 'API de Stock funcionando' });
});

module.exports = router;