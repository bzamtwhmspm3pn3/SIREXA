// routes/inventario.js
const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { verifyToken } = require('../middlewares/auth');

// Todas as rotas exigem autenticação
router.use(verifyToken);

// ============================================
// ROTAS PRINCIPAIS
// ============================================

// GET - Listar inventário (com filtros e empresaId)
router.get('/', inventarioController.listarInventario);

// GET - Dashboard com estatísticas (requer empresaId)
router.get('/dashboard', inventarioController.getDashboard);

// GET - Estatísticas por classe PGCA (requer empresaId)
router.get('/stats/classe', inventarioController.getStatsPorClasse);

// GET - Resumo do inventário (requer empresaId)
router.get('/resumo', inventarioController.getResumo);

// GET - Buscar item por ID (requer empresaId)
router.get('/:id', inventarioController.getItemById);

// POST - Criar novo item (requer empresaId no body)
router.post('/', inventarioController.criarItem);

// PUT - Atualizar item (requer empresaId no body)
router.put('/:id', inventarioController.atualizarItem);

// DELETE - Soft delete (dar baixa) - requer empresaId no body
router.delete('/:id', inventarioController.excluirItem);

// DELETE - Hard delete (excluir permanentemente) - requer empresaId na query
router.delete('/hard/:id', inventarioController.excluirPermanente);

// ============================================
// ROTAS DE IMPORTAÇÃO
// ============================================

// POST - Importar produtos do stock (requer empresaId na query)
router.post('/importar/stock', inventarioController.importarDeStock);

// POST - Importar viaturas (requer empresaId na query)
router.post('/importar/viaturas', inventarioController.importarDeViaturas);

// ============================================
// ROTAS DE DEPRECIAÇÃO
// ============================================

// POST - Calcular depreciação de um item (requer empresaId na query)
router.post('/:id/calcular-depreciacao', inventarioController.calcularDepreciacao);

// POST - Calcular depreciação de todos os itens da empresa
router.post('/calcular-depreciacoes', inventarioController.calcularDepreciacoesEmMassa);

module.exports = router;