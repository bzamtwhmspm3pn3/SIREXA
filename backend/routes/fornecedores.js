// backend/routes/fornecedores.js
const express = require('express');
const router = express.Router();
const fornecedorController = require('../controllers/fornecedorController');
const { verifyToken } = require('../middlewares/auth');
const { validateEmpresaAccess } = require('../middlewares/security');
const { logMiddleware } = require('../middlewares/logger');

// ============================================
// 🔒 TODAS AS ROTAS EXIGEM AUTENTICAÇÃO
// ============================================
router.use(verifyToken);
router.use(validateEmpresaAccess);

// ============================================
// 📋 ROTAS PRINCIPAIS - CRUD
// ============================================

// GET - Listar todos os fornecedores (com filtros)
router.get('/', logMiddleware('fornecedores-listar'), fornecedorController.listarFornecedores);

// GET - Buscar fornecedor por ID
router.get('/:id', logMiddleware('fornecedores-consultar'), fornecedorController.getFornecedorById);

// POST - Criar novo fornecedor
router.post('/', logMiddleware('fornecedores-criar'), fornecedorController.criarFornecedor);

// PUT - Atualizar fornecedor
router.put('/:id', logMiddleware('fornecedores-atualizar'), fornecedorController.atualizarFornecedor);

// DELETE - Excluir/Desativar fornecedor
router.delete('/:id', logMiddleware('fornecedores-deletar'), fornecedorController.excluirFornecedor);

// ============================================
// 📊 ROTAS DE ESTATÍSTICAS E ANÁLISE
// ============================================

// GET - Estatísticas do fornecedor
router.get('/:id/estatisticas', logMiddleware('fornecedores-estatisticas'), fornecedorController.getEstatisticasFornecedor);

// GET - Top fornecedores (maiores compras)
router.get('/top/maiores-compras', logMiddleware('fornecedores-top'), fornecedorController.getTopFornecedores);

// GET - Fornecedores por tipo
router.get('/tipo/:tipoFornecedor', logMiddleware('fornecedores-por-tipo'), fornecedorController.getFornecedoresPorTipo);

// GET - Fornecedores ativos com contratos a vencer
router.get('/contratos/vencer', logMiddleware('fornecedores-contratos-vencer'), fornecedorController.getContratosAVencer);

// ============================================
// 🆕 ROTAS PARA GESTÃO DE ITENS DO FORNECEDOR
// ============================================

// POST - Adicionar item ao fornecedor
router.post('/:id/itens', logMiddleware('fornecedores-adicionar-item'), fornecedorController.adicionarItem);

// PUT - Atualizar item do fornecedor
router.put('/:id/itens/:itemId', logMiddleware('fornecedores-atualizar-item'), fornecedorController.atualizarItem);

// DELETE - Remover item do fornecedor
router.delete('/:id/itens/:itemId', logMiddleware('fornecedores-remover-item'), fornecedorController.removerItem);

// ============================================
// 🆕 ROTAS PARA GESTÃO DE CONTRATOS
// ============================================

// POST - Adicionar contrato ao fornecedor
router.post('/:id/contratos', logMiddleware('fornecedores-adicionar-contrato'), fornecedorController.adicionarContrato);

// PUT - Atualizar contrato do fornecedor
router.put('/:id/contratos/:contratoId', logMiddleware('fornecedores-atualizar-contrato'), fornecedorController.atualizarContrato);

// DELETE - Remover contrato do fornecedor
router.delete('/:id/contratos/:contratoId', logMiddleware('fornecedores-remover-contrato'), fornecedorController.removerContrato);

// POST - Gerar pagamento para contrato específico
router.post('/:id/contratos/:contratoId/gerar-pagamento', logMiddleware('fornecedores-gerar-pagamento'), fornecedorController.gerarPagamentoContrato);

// ============================================
// 🆕 ROTAS PARA ASSOCIAÇÃO COM STOCK
// ============================================

// GET - Produtos fornecidos por este fornecedor
router.get('/:id/produtos', logMiddleware('fornecedores-produtos'), fornecedorController.getProdutosFornecidos);

// POST - Registrar compra de produto (atualiza stock)
router.post('/:id/comprar-produto', logMiddleware('fornecedores-comprar-produto'), fornecedorController.registrarCompraProduto);

// ============================================
// 📊 ROTA DE TESTE
// ============================================

router.get('/health/check', (req, res) => {
  res.json({ 
    sucesso: true, 
    mensagem: 'API de Fornecedores funcionando',
    rotas_disponiveis: {
      listar: 'GET /',
      buscar: 'GET /:id',
      criar: 'POST /',
      atualizar: 'PUT /:id',
      deletar: 'DELETE /:id',
      estatisticas: 'GET /:id/estatisticas',
      top_fornecedores: 'GET /top/maiores-compras',
      por_tipo: 'GET /tipo/:tipoFornecedor',
      contratos_vencer: 'GET /contratos/vencer',
      adicionar_item: 'POST /:id/itens',
      adicionar_contrato: 'POST /:id/contratos',
      produtos_fornecidos: 'GET /:id/produtos',
      comprar_produto: 'POST /:id/comprar-produto'
    }
  });
});

module.exports = router;