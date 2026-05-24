// routes/orcamentos.js
const express = require('express');
const router = express.Router();
const orcamentoController = require('../controllers/orcamentoController');
const { verifyToken } = require('../middlewares/auth');
const { logMiddleware } = require('../middlewares/logger');

router.use(verifyToken);

// =============================================
// ROTAS ESPECÍFICAS (DEVEM VIR PRIMEIRO)
// =============================================

// GET - Anos disponíveis
router.get('/anos', logMiddleware('orcamento-anos'), orcamentoController.getAnosDisponiveis);

// GET - Dashboard
router.get('/dashboard', logMiddleware('orcamento-dashboard'), orcamentoController.getDashboard);

// GET - Comparar orçamento com dados reais
router.get('/comparar', logMiddleware('orcamento-comparar'), orcamentoController.compararOrcamentoReal);

// GET - Obter previsões e tendências
router.get('/previsao', logMiddleware('orcamento-previsao'), orcamentoController.obterPrevisao);

// GET - Exportar relatório
router.get('/exportar/relatorio', logMiddleware('orcamento-exportar-relatorio'), orcamentoController.exportarRelatorio);

// GET - Exportar para Excel
router.get('/exportar/excel', logMiddleware('orcamento-exportar-excel'), orcamentoController.exportarExcel);

// GET - Exportar para PDF
router.get('/exportar/pdf', logMiddleware('orcamento-exportar-pdf'), orcamentoController.exportarPDF);

// =============================================
// ROTAS CRUD (COM PARÂMETROS - DEVEM VIR DEPOIS)
// =============================================

// GET - Listar todos os orçamentos
router.get('/', logMiddleware('orcamento-listar'), orcamentoController.listarOrcamentos);

// GET - Obter um orçamento por ID (deve vir depois das rotas específicas)
router.get('/:id', logMiddleware('orcamento-consultar'), orcamentoController.getOrcamentoById);

// POST - Criar novo orçamento
router.post('/', logMiddleware('orcamento-criar'), orcamentoController.criarOrcamento);

// PUT - Atualizar orçamento
router.put('/:id', logMiddleware('orcamento-atualizar'), orcamentoController.atualizarOrcamento);

// DELETE - Excluir orçamento
router.delete('/:id', logMiddleware('orcamento-deletar'), orcamentoController.excluirOrcamento);

// =============================================
// ROTAS DE APROVAÇÃO E COMENTÁRIOS
// =============================================

// POST - Aprovar orçamento
router.post('/:id/aprovar', logMiddleware('orcamento-aprovar'), orcamentoController.aprovarOrcamento);

// POST - Rejeitar orçamento
router.post('/:id/rejeitar', logMiddleware('orcamento-rejeitar'), orcamentoController.rejeitarOrcamento);

// POST - Adicionar comentário
router.post('/:id/comentarios', logMiddleware('orcamento-comentario'), orcamentoController.adicionarComentario);

// =============================================
// ROTAS DE CÓPIA E CENÁRIOS
// =============================================

// POST - Copiar orçamento de um período para outro
router.post('/copiar', logMiddleware('orcamento-copiar'), orcamentoController.copiarOrcamento);

// POST - Criar cenário a partir de orçamento existente
router.post('/criar-cenario', logMiddleware('orcamento-criar-cenario'), orcamentoController.criarCenario);

module.exports = router;