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
// 📋 ROTAS PRINCIPAIS
// ============================================

// GET - Histórico de vendas da empresa
router.get('/historico/:empresaId', validateEmpresaAccess, vendaController.getHistorico);

// POST - Emitir nova venda
router.post('/emitir', validateEmpresaAccess, vendaController.emitirVenda);

// GET - Próximo número de factura
router.get('/proximo-numero/:empresaNif', vendaController.getProximoNumero);

// GET - Exportar SAFT
router.get('/exportar-saft/:empresaNif', vendaController.exportarSAFT);

// GET - Buscar venda por ID
router.get('/:id', vendaController.getVendaById);

// DELETE - Cancelar venda
router.delete('/:id', vendaController.cancelarVenda);

// ============================================
// 🆕 ROTA PARA PAGAMENTO DE PARCELA (ADICIONAR)
// ============================================
router.put('/:id/pagar-parcela', vendaController.registrarPagamentoParcela);

// ============================================
// 🆕 ROTA PARA VENDAS PENDENTES
// ============================================
router.get('/pendentes/:empresaId', vendaController.getVendasPendentes);

// ============================================
// 🆕 ROTA PARA SERVIÇOS AGENDADOS
// ============================================
router.get('/servicos/agendados/:empresaId', vendaController.getServicosAgendados);

// ============================================
// 📊 ROTA DE TESTE
// ============================================
router.get('/health/check', (req, res) => {
  res.json({ 
    sucesso: true, 
    mensagem: 'API de Vendas funcionando',
    rotas: {
      historico: '/historico/:empresaId',
      emitir: '/emitir',
      pagarParcela: '/:id/pagar-parcela',
      pendentes: '/pendentes/:empresaId'
    }
  });
});

module.exports = router;