// backend/routes/facturas.js
const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');
const { verifyToken } = require('../middlewares/auth');
const { logMiddleware } = require('../middlewares/logger');

// Aplicar verificação de token em todas as rotas
router.use(verifyToken);

// ==================== CRIAÇÃO DE DOCUMENTOS ====================
router.post('/orcamento', logMiddleware('factura-gerar-orcamento'), facturaController.gerarOrcamento);
router.post('/proforma', logMiddleware('factura-gerar-proforma'), facturaController.gerarProforma);
router.post('/emitir', logMiddleware('factura-emitir'), facturaController.emitirFactura);
router.post('/factura-recibo', logMiddleware('factura-emitir-recibo'), facturaController.emitirFacturaRecibo);
router.post('/recibo/:id', logMiddleware('factura-gerar-recibo'), facturaController.gerarRecibo);
router.post('/nota-credito/:id', logMiddleware('factura-gerar-nota-credito'), facturaController.gerarNotaCredito);

// ==================== CONVERSÕES ====================
router.post('/:id/converter-orcamento', logMiddleware('factura-converter-orcamento-proforma'), facturaController.converterOrcamentoParaProforma);
router.post('/:id/converter-proforma', logMiddleware('factura-converter-proforma-factura'), facturaController.converterProformaParaFactura);
router.post('/:id/converter', logMiddleware('factura-converter'), facturaController.converterProformaParaFactura); // Alias para compatibilidade

// ==================== LISTAGEM ====================
router.get('/listar', logMiddleware('factura-listar'), facturaController.listarDocumentos);
router.get('/:id', logMiddleware('factura-consultar'), facturaController.getDocumentoById);

// ==================== FILTROS ESPECÍFICOS ====================
router.get('/tipo-item/:empresaId/:tipoItem', logMiddleware('factura-por-tipo-item'), facturaController.getDocumentosPorTipoItem);

// ==================== AÇÕES ====================
router.post('/:id/segunda-via', logMiddleware('factura-segunda-via'), facturaController.segundaVia);
router.put('/:id/pagar', logMiddleware('factura-marcar-pago'), facturaController.marcarComoPago);
router.delete('/:id', logMiddleware('factura-cancelar'), facturaController.cancelarDocumento);

// ==================== ESTATÍSTICAS ====================
router.get('/stats/resumo', logMiddleware('factura-estatisticas'), facturaController.getStats);

// Rota de teste para verificar se o controller está funcionando
router.get('/teste/health', (req, res) => {
  res.json({ sucesso: true, mensagem: 'API de facturas funcionando' });
});

module.exports = router;