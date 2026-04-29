// backend/routes/facturas.js
const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');
const { verifyToken } = require('../middlewares/auth');

// Aplicar verificação de token em todas as rotas
router.use(verifyToken);

// ==================== CRIAÇÃO DE DOCUMENTOS ====================
router.post('/orcamento', facturaController.gerarOrcamento);
router.post('/proforma', facturaController.gerarProforma);
router.post('/emitir', facturaController.emitirFactura);
router.post('/factura-recibo', facturaController.emitirFacturaRecibo);
router.post('/recibo/:id', facturaController.gerarRecibo);
router.post('/nota-credito/:id', facturaController.gerarNotaCredito);

// ==================== CONVERSÕES ====================
router.post('/:id/converter-orcamento', facturaController.converterOrcamentoParaProforma);
router.post('/:id/converter-proforma', facturaController.converterProformaParaFactura);
router.post('/:id/converter', facturaController.converterProformaParaFactura); // Alias para compatibilidade

// ==================== LISTAGEM ====================
router.get('/listar', facturaController.listarDocumentos);
router.get('/:id', facturaController.getDocumentoById);

// ==================== AÇÕES ====================
router.post('/:id/segunda-via', facturaController.segundaVia);
router.put('/:id/pagar', facturaController.marcarComoPago);
router.delete('/:id', facturaController.cancelarDocumento);

// ==================== ESTATÍSTICAS ====================
router.get('/stats/resumo', facturaController.getStats);

// Rota de teste para verificar se o controller está funcionando
router.get('/teste/health', (req, res) => {
  res.json({ sucesso: true, mensagem: 'API de facturas funcionando' });
});

module.exports = router;