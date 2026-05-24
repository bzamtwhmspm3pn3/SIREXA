// routes/inventario.js
const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { verifyToken } = require('../middlewares/auth');
const { logMiddleware } = require('../middlewares/logger'); // <-- ADICIONADO

// Todas as rotas exigem autenticação
router.use(verifyToken);

// ============================================
// ROTAS PRINCIPAIS
// ============================================

// GET - Listar inventário (com filtros e empresaId) - sem logging
router.get('/', inventarioController.listarInventario);

// GET - Dashboard com estatísticas (requer empresaId) - sem logging
router.get('/dashboard', inventarioController.getDashboard);

// GET - Estatísticas por classe PGCA (requer empresaId) - sem logging
router.get('/stats/classe', inventarioController.getStatsPorClasse);

// GET - Resumo do inventário (requer empresaId) - sem logging
router.get('/resumo', inventarioController.getResumo);

// GET - Buscar item por ID (requer empresaId) - sem logging
router.get('/:id', inventarioController.getItemById);

// ============================================
// ROTAS DE CRUD - COM LOGGER
// ============================================

// POST - Criar novo item (requer empresaId no body)
router.post('/', logMiddleware('inventario'), inventarioController.criarItem);

// PUT - Atualizar item (requer empresaId no body)
router.put('/:id', logMiddleware('inventario'), inventarioController.atualizarItem);

// DELETE - Soft delete (dar baixa) - requer empresaId no body
router.delete('/:id', logMiddleware('inventario'), inventarioController.excluirItem);

// DELETE - Hard delete (excluir permanentemente) - requer empresaId na query
router.delete('/hard/:id', logMiddleware('inventario-hard'), inventarioController.excluirPermanente);

// ============================================
// ROTAS DE IMPORTAÇÃO - COM LOGGER
// ============================================

// POST - Importar produtos do stock (requer empresaId na query)
router.post('/importar/stock', logMiddleware('inventario-importacao-stock'), inventarioController.importarDeStock);

// POST - Importar viaturas (requer empresaId na query)
router.post('/importar/viaturas', logMiddleware('inventario-importacao-viaturas'), inventarioController.importarDeViaturas);

// ============================================
// ROTAS DE DEPRECIAÇÃO - COM LOGGER
// ============================================

// POST - Calcular depreciação de um item (requer empresaId na query)
router.post('/:id/calcular-depreciacao', logMiddleware('inventario-depreciacao'), inventarioController.calcularDepreciacao);

// POST - Calcular depreciação de todos os itens da empresa (requer empresaId na query)
router.post('/calcular-depreciacoes', logMiddleware('inventario-depreciacoes-massa'), inventarioController.calcularDepreciacoesEmMassa);

module.exports = router;