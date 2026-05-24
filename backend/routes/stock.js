// backend/routes/stock.js
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { verifyToken } = require('../middlewares/auth');
const { validateEmpresaAccess } = require('../middlewares/security');
const { logMiddleware } = require('../middlewares/logger'); // <-- ADICIONADO

// ============================================
// 🔒 TODAS AS ROTAS EXIGEM AUTENTICAÇÃO E VALIDAÇÃO DE EMPRESA
// ============================================
router.use(verifyToken);
router.use(validateEmpresaAccess); // Garante que apenas dados da empresa autorizada sejam acessados

// ============================================
// 📊 DASHBOARD E ESTATÍSTICAS
// ============================================
router.get('/dashboard', stockController.getDashboardStock);
router.get('/stats', stockController.getStockStats);

// ============================================
// ⚠️ ALERTAS (apenas para produtos físicos)
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
// 📦 CRUD PRINCIPAL (produtos e serviços) - COM LOGGER
// ============================================
router.get('/', stockController.getAllStock);
router.get('/:id', stockController.getStockById);
router.post('/', logMiddleware('stock'), stockController.createStock);
router.put('/:id', logMiddleware('stock'), stockController.updateStock);
router.delete('/:id', logMiddleware('stock'), stockController.deleteStock);

// ============================================
// 📦 OPERAÇÕES DE ESTOQUE (apenas produtos) - COM LOGGER
// ============================================
router.patch('/:id/ajustar-estoque', logMiddleware('stock-ajuste'), stockController.ajustarEstoque);
router.post('/:id/entrada', logMiddleware('stock-entrada'), stockController.registrarEntrada);
router.post('/:id/saida', logMiddleware('stock-saida'), stockController.registrarSaida);

// ============================================
// 🔄 DEVOLUÇÕES E DESCARTES (apenas produtos) - COM LOGGER
// ============================================
router.post('/:id/devolver', logMiddleware('stock-devolucao'), stockController.devolverProduto);
router.post('/:id/descartar', logMiddleware('stock-descarte'), stockController.descartarProduto);

// ============================================
// 📄 RELATÓRIOS (produtos e serviços separados)
// ============================================
router.get('/relatorio/validade', stockController.relatorioValidade);
router.get('/relatorio/movimentacoes', stockController.relatorioMovimentacoes);

// ============================================
// 🆕 ROTA ESPECÍFICA PARA SERVIÇOS (opcional)
// ============================================
router.get('/servicos', (req, res, next) => {
  req.query.tipo = 'servico';
  next();
}, stockController.getAllStock);

module.exports = router;