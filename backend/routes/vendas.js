// routes/vendas.js
const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');
const { verifyToken } = require('../middlewares/auth');
const { validateEmpresaAccess } = require('../middlewares/security');

// Todas as rotas requerem autenticação
router.use(verifyToken);

// 🔒 CORRIGIDO: Adiciona validação de acesso à empresa
router.get('/historico/:empresaId', validateEmpresaAccess, vendaController.getHistorico);

// GET /api/vendas/proximo-numero/:empresaNif
router.get('/proximo-numero/:empresaNif', vendaController.getProximoNumero);

// 🔒 CORRIGIDO: Adiciona validação de acesso à empresa
router.post('/emitir', validateEmpresaAccess, vendaController.emitirVenda);

// GET /api/vendas/exportar-saft/:empresaNif
router.get('/exportar-saft/:empresaNif', vendaController.exportarSAFT);

// GET /api/vendas/:id
router.get('/:id', vendaController.getVendaById);

// DELETE /api/vendas/:id (cancelar)
router.delete('/:id', vendaController.cancelarVenda);

module.exports = router;