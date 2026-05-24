// backend/routes/vendas.js
const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');
const { verifyToken } = require('../middlewares/auth');
const { validateEmpresaAccess } = require('../middlewares/security');

// ============================================
// 🔒 Todas as rotas exigem autenticação
// ============================================
router.use(verifyToken);

// ============================================
// 📋 ROTAS COM VALIDAÇÃO DE ACESSO À EMPRESA
// ============================================

// GET - Histórico de vendas da empresa
// 🔒 middleware validateEmpresaAccess usa o parâmetro :empresaId da URL
router.get('/historico/:empresaId', validateEmpresaAccess, vendaController.getHistorico);

// POST - Emitir nova venda
// 🔒 middleware validateEmpresaAccess usa o body empresaId ou a empresa do token
router.post('/emitir', validateEmpresaAccess, vendaController.emitirVenda);

// ============================================
// 🔍 ROTAS COM VALIDAÇÃO MANUAL (sem middleware, controller valida)
// ============================================

// GET - Próximo número de factura (validação manual no controller)
router.get('/proximo-numero/:empresaNif', vendaController.getProximoNumero);

// GET - Exportar SAFT (validação manual no controller)
router.get('/exportar-saft/:empresaNif', vendaController.exportarSAFT);

// GET - Buscar venda por ID (validação manual no controller)
router.get('/:id', vendaController.getVendaById);

// DELETE - Cancelar venda por ID (validação manual no controller)
router.delete('/:id', vendaController.cancelarVenda);

module.exports = router;