// routes/orcamentos.js
const express = require('express');
const router = express.Router();
const orcamentoController = require('../controllers/orcamentoController');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// =============================================
// ROTAS ESPECÍFICAS (DEVEM VIR PRIMEIRO)
// =============================================

// GET - Anos disponíveis
router.get('/anos', orcamentoController.getAnosDisponiveis);

// GET - Dashboard
router.get('/dashboard', orcamentoController.getDashboard);

// GET - Comparar orçamento com dados reais
router.get('/comparar', orcamentoController.compararOrcamentoReal);

// GET - Obter previsões e tendências
router.get('/previsao', orcamentoController.obterPrevisao);

// GET - Exportar relatório
router.get('/exportar/relatorio', orcamentoController.exportarRelatorio);

// GET - Exportar para Excel
router.get('/exportar/excel', orcamentoController.exportarExcel);

// GET - Exportar para PDF
router.get('/exportar/pdf', orcamentoController.exportarPDF);

// =============================================
// ROTAS CRUD (COM PARÂMETROS - DEVEM VIR DEPOIS)
// =============================================

// GET - Listar todos os orçamentos
router.get('/', orcamentoController.listarOrcamentos);

// GET - Obter um orçamento por ID (deve vir depois das rotas específicas)
router.get('/:id', orcamentoController.getOrcamentoById);

// POST - Criar novo orçamento
router.post('/', orcamentoController.criarOrcamento);

// PUT - Atualizar orçamento
router.put('/:id', orcamentoController.atualizarOrcamento);

// DELETE - Excluir orçamento
router.delete('/:id', orcamentoController.excluirOrcamento);

// =============================================
// ROTAS DE APROVAÇÃO E COMENTÁRIOS
// =============================================

// POST - Aprovar orçamento
router.post('/:id/aprovar', orcamentoController.aprovarOrcamento);

// POST - Rejeitar orçamento
router.post('/:id/rejeitar', orcamentoController.rejeitarOrcamento);

// POST - Adicionar comentário
router.post('/:id/comentarios', orcamentoController.adicionarComentario);

// =============================================
// ROTAS DE CÓPIA E CENÁRIOS
// =============================================

// POST - Copiar orçamento de um período para outro
router.post('/copiar', orcamentoController.copiarOrcamento);

// POST - Criar cenário a partir de orçamento existente
router.post('/criar-cenario', orcamentoController.criarCenario);

module.exports = router;