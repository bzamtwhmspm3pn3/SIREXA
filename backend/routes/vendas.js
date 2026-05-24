// backend/routes/vendas.js
const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');
const { verifyToken } = require('../middlewares/auth');
const { validateEmpresaAccess } = require('../middlewares/security');
const { logMiddleware } = require('../middlewares/logger');

// ============================================
// 🔒 Todas as rotas exigem autenticação
// ============================================
router.use(verifyToken);

// ============================================
// 📋 ROTAS COM VALIDAÇÃO DE ACESSO À EMPRESA
// ============================================

// GET - Histórico de vendas da empresa
if (vendaController.getHistorico) {
  router.get('/historico/:empresaId', logMiddleware('venda-historico'), validateEmpresaAccess, vendaController.getHistorico);
}

// POST - Emitir nova venda
if (vendaController.emitirVenda) {
  router.post('/emitir', logMiddleware('venda-emitir'), validateEmpresaAccess, vendaController.emitirVenda);
}

// ============================================
// 🔍 ROTAS COM VALIDAÇÃO MANUAL
// ============================================

// GET - Próximo número de factura
if (vendaController.getProximoNumero) {
  router.get('/proximo-numero/:empresaNif', logMiddleware('venda-proximo-numero'), vendaController.getProximoNumero);
}

// GET - Exportar SAFT
if (vendaController.exportarSAFT) {
  router.get('/exportar-saft/:empresaNif', logMiddleware('venda-exportar-saft'), vendaController.exportarSAFT);
}

// GET - Buscar venda por ID
if (vendaController.getVendaById) {
  router.get('/:id', logMiddleware('venda-consultar'), vendaController.getVendaById);
}

// DELETE - Cancelar venda
if (vendaController.cancelarVenda) {
  router.delete('/:id', logMiddleware('venda-cancelar'), vendaController.cancelarVenda);
}

// ============================================
// 📊 ROTA DE TESTE (sempre disponível)
// ============================================

router.get('/health/check', (req, res) => {
  res.json({ 
    sucesso: true, 
    mensagem: 'API de Vendas funcionando',
    controllers_carregados: {
      getHistorico: !!vendaController.getHistorico,
      emitirVenda: !!vendaController.emitirVenda,
      getProximoNumero: !!vendaController.getProximoNumero,
      exportarSAFT: !!vendaController.exportarSAFT,
      getVendaById: !!vendaController.getVendaById,
      cancelarVenda: !!vendaController.cancelarVenda
    }
  });
});

module.exports = router;