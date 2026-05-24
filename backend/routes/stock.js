// backend/routes/stock.js
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { verifyToken } = require('../middlewares/auth');
const { validateEmpresaAccess } = require('../middlewares/security');
const { logMiddleware } = require('../middlewares/logger');

// ============================================
// 🔒 TODAS AS ROTAS EXIGEM AUTENTICAÇÃO E VALIDAÇÃO DE EMPRESA
// ============================================
router.use(verifyToken);
router.use(validateEmpresaAccess);

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
// 📦 CRUD PRINCIPAL (produtos e serviços)
// ============================================
router.get('/', stockController.getAllStock);
router.get('/:id', stockController.getStockById);
router.post('/', stockController.createStock);
router.put('/:id', stockController.updateStock);
router.delete('/:id', stockController.deleteStock);

// ============================================
// 🆕 ROTA PARA COMPRA COM FORNECEDOR (ADICIONAR)
// ============================================
router.post('/:id/compra-fornecedor', stockController.registrarEntradaComFornecedor);

// ============================================
// 📦 OPERAÇÕES DE ESTOQUE (apenas produtos)
// ============================================
router.patch('/:id/ajustar-estoque', stockController.ajustarEstoque);
router.post('/:id/entrada', stockController.registrarEntrada);
router.post('/:id/saida', stockController.registrarSaida);

// ============================================
// 🔄 DEVOLUÇÕES E DESCARTES (apenas produtos)
// ============================================
router.post('/:id/devolver', stockController.devolverProduto);
router.post('/:id/descartar', stockController.descartarProduto);

// ============================================
// 📄 RELATÓRIOS
// ============================================
router.get('/relatorio/validade', stockController.relatorioValidade);
router.get('/relatorio/movimentacoes', stockController.relatorioMovimentacoes);

// ============================================
// 🆕 ROTA ESPECÍFICA PARA SERVIÇOS
// ============================================
router.get('/servicos', (req, res, next) => {
  req.query.tipo = 'servico';
  next();
}, stockController.getAllStock);

// ============================================
// 📊 ROTA DE TESTE
// ============================================
router.get('/health/check', (req, res) => {
  res.json({ 
    sucesso: true, 
    mensagem: 'API de Stock funcionando',
    controllers: {
      getAllStock: typeof stockController.getAllStock === 'function',
      getStockById: typeof stockController.getStockById === 'function',
      createStock: typeof stockController.createStock === 'function',
      updateStock: typeof stockController.updateStock === 'function',
      deleteStock: typeof stockController.deleteStock === 'function',
      registrarEntradaComFornecedor: typeof stockController.registrarEntradaComFornecedor === 'function'
    }
  });
});

module.exports = router;