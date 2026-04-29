// backend/routes/stock.js
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { verifyToken } = require('../middlewares/auth');

// Todas as rotas exigem autenticação
router.use(verifyToken);

// ============================================
// DASHBOARD E ESTATÍSTICAS
// ============================================
router.get('/dashboard', stockController.getDashboardStock);
router.get('/stats', stockController.getStockStats);

// ============================================
// ALERTAS
// ============================================
router.get('/baixo-estoque', stockController.getEstoqueBaixo);
router.get('/proximos-vencer', stockController.getProximosVencer);
router.get('/vencidos', stockController.getProdutosVencidos);

// ============================================
// BUSCAS ESPECÍFICAS
// ============================================
router.get('/por-codigo-barras/:codigo', stockController.getStockByCodigoBarras);
router.get('/por-lote/:lote', stockController.getStockByLote);
router.get('/por-armazem/:armazem', stockController.getStockByArmazem);

// ============================================
// CRUD PRINCIPAL
// ============================================
router.get('/', stockController.getAllStock);
router.get('/:id', stockController.getStockById);
router.post('/', stockController.createStock);
router.put('/:id', stockController.updateStock);
router.delete('/:id', stockController.deleteStock);

// ============================================
// OPERAÇÕES DE ESTOQUE
// ============================================
router.patch('/:id/ajustar-estoque', stockController.ajustarEstoque);
router.post('/:id/entrada', stockController.registrarEntrada);
router.post('/:id/saida', stockController.registrarSaida);

// ============================================
// DEVOLUÇÕES E DESCARTES
// ============================================
router.post('/:id/devolver', stockController.devolverProduto);
router.post('/:id/descartar', stockController.descartarProduto);

// ============================================
// RELATÓRIOS
// ============================================
router.get('/relatorio/validade', stockController.relatorioValidade);
router.get('/relatorio/movimentacoes', stockController.relatorioMovimentacoes);

module.exports = router;