// backend/routes/contabilidadeRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PlanoContasController = require('../controllers/contabilidade/PlanoContasController');
const LancamentoController = require('../controllers/contabilidade/LancamentoController');
const RelatoriosController = require('../controllers/contabilidade/RelatoriosController');
const PeriodosController = require('../controllers/contabilidade/PeriodosController');
const { logMiddleware } = require('../middlewares/logger'); // 


// ==================== PLANO DE CONTAS ====================
router.get('/plano-contas', (req, res) => PlanoContasController.listar(req, res));
router.post('/plano-contas', logMiddleware('plano-contas'), (req, res) => PlanoContasController.criar(req, res));
router.post('/plano-contas/auto', logMiddleware('plano-contas-auto'), (req, res) => PlanoContasController.criarAuto(req, res));
router.post('/plano-contas/inicializar', logMiddleware('plano-contas-inicializar'), (req, res) => PlanoContasController.inicializarPadrao(req, res));
router.put('/plano-contas/:id', logMiddleware('plano-contas'), (req, res) => PlanoContasController.atualizar(req, res));
router.delete('/plano-contas/:id', logMiddleware('plano-contas'), (req, res) => PlanoContasController.desativar(req, res));

// ==================== LANÇAMENTOS ====================
router.get('/lancamentos', (req, res) => LancamentoController.listar(req, res));
router.post('/lancamentos/manual', logMiddleware('lancamentos'), (req, res) => LancamentoController.criarManual(req, res));
router.post('/lancamentos/:id/estornar', logMiddleware('lancamentos-estorno'), (req, res) => LancamentoController.estornar(req, res));
router.post('/reconciliar', logMiddleware('reconciliacao'), (req, res) => LancamentoController.reconciliar(req, res));
router.get('/resumo', (req, res) => LancamentoController.resumo(req, res));

// ==================== RELATÓRIOS ====================
router.get('/relatorios/balancete', (req, res) => RelatoriosController.balancete(req, res));
router.get('/relatorios/dre', (req, res) => RelatoriosController.dre(req, res));

// ==================== PERÍODOS FISCAIS ====================
router.get('/periodos', (req, res) => PeriodosController.listar(req, res));
router.post('/periodos', logMiddleware('periodos'), (req, res) => PeriodosController.criar(req, res));
router.put('/periodos/:id', logMiddleware('periodos'), (req, res) => PeriodosController.atualizar(req, res));
router.post('/periodos/:id/fechar', logMiddleware('periodos-fechar'), (req, res) => PeriodosController.fechar(req, res));
router.post('/periodos/:id/reabrir', logMiddleware('periodos-reabrir'), (req, res) => PeriodosController.reabrir(req, res));
router.delete('/periodos/:id', logMiddleware('periodos'), (req, res) => PeriodosController.excluir(req, res));

// ==================== MODELOS EXCEL (DOWNLOAD) ====================
const XLSX = require('xlsx');

// Modelo de Lançamentos
router.get('/modelo-excel', (req, res) => {
    try {
        const wb = XLSX.utils.book_new();
        const dados = [
            { codigo: "45.1.1", descricao: "Caixa - Pagamento fornecedor", debito: 0, credito: 1000, data: new Date().toISOString().split('T')[0] },
            { codigo: "32.1.2.1", descricao: "Fornecedor XYZ", debito: 1000, credito: 0, data: new Date().toISOString().split('T')[0] }
        ];
        const ws = XLSX.utils.json_to_sheet(dados);
        XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
        
        const instrucoes = [
            { coluna: "codigo", descricao: "Código da conta (ex: 45.1.1, 32.1.2.1)", obrigatorio: "Sim" },
            { coluna: "descricao", descricao: "Descrição do lançamento", obrigatorio: "Sim" },
            { coluna: "debito", descricao: "Valor de Débito (se aplicável)", obrigatorio: "Não (0 se crédito)" },
            { coluna: "credito", descricao: "Valor de Crédito (se aplicável)", obrigatorio: "Não (0 se débito)" },
            { coluna: "data", descricao: "Data do lançamento (AAAA-MM-DD)", obrigatorio: "Sim" }
        ];
        const wsInstrucoes = XLSX.utils.json_to_sheet(instrucoes);
        XLSX.utils.book_append_sheet(wb, wsInstrucoes, "Instruções");
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename=modelo_lancamentos.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Erro ao gerar modelo:', error);
        res.status(500).json({ sucesso: false, mensagem: error.message });
    }
});

// ==================== SINCRONIZAÇÃO ====================
router.post('/sincronizar', logMiddleware('sincronizacao'), async (req, res) => {
    try {
        const { empresaId } = req.body;
        
        if (!empresaId) {
            return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
        }
        
        const Venda = require('../models/Venda');
        const Pagamento = require('../models/Pagamento');
        const IntegracaoContabilistica = require('../services/IntegracaoContabilistica');
        
        // Buscar vendas não contabilizadas
        const vendasNaoContabilizadas = await Venda.find({
            empresaId,
            contabilizado: { $ne: true }
        });
        
        // Buscar pagamentos não contabilizados
        const pagamentosNaoContabilizados = await Pagamento.find({
            empresaId,
            contabilizado: { $ne: true },
            status: 'Pago'
        });
        
        let vendasProcessadas = 0;
        let pagamentosProcessados = 0;
        const erros = [];
        
        for (const venda of vendasNaoContabilizadas) {
            try {
                await IntegracaoContabilistica.integrarVenda(venda, empresaId, req.usuarioId);
                venda.contabilizado = true;
                await venda.save();
                vendasProcessadas++;
            } catch (error) {
                erros.push(`Venda ${venda.numeroFactura}: ${error.message}`);
                console.error(`Erro ao integrar venda ${venda.numeroFactura}:`, error.message);
            }
        }
        
        for (const pagamento of pagamentosNaoContabilizados) {
            try {
                await IntegracaoContabilistica.integrarPagamento(pagamento, empresaId, req.usuarioId);
                pagamento.contabilizado = true;
                await pagamento.save();
                pagamentosProcessados++;
            } catch (error) {
                erros.push(`Pagamento ${pagamento.referencia}: ${error.message}`);
                console.error(`Erro ao integrar pagamento ${pagamento.referencia}:`, error.message);
            }
        }
        
        res.json({
            sucesso: true,
            mensagem: 'Sincronização concluída',
            resultados: { vendas: vendasProcessadas, pagamentos: pagamentosProcessados },
            erros: erros.length > 0 ? erros : undefined
        });
        
    } catch (error) {
        console.error('Erro na sincronização:', error);
        res.status(500).json({ sucesso: false, mensagem: error.message });
    }
});

// ==================== IMPORTAÇÃO/EXPORTAÇÃO ====================
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const ImportacaoExportacaoController = require('../controllers/contabilidade/ImportacaoExportacaoController');

// Download de modelos (GET - sem logging)
router.get('/modelo-balancete', (req, res) => ImportacaoExportacaoController.downloadModeloBalancete(req, res));
router.get('/modelo-diario', (req, res) => ImportacaoExportacaoController.downloadModeloDiario(req, res));
router.get('/modelo-razao', (req, res) => ImportacaoExportacaoController.downloadModeloRazao(req, res));
router.get('/modelo-saldos', (req, res) => ImportacaoExportacaoController.downloadModeloSaldos(req, res));
router.get('/modelo-periodos', (req, res) => ImportacaoExportacaoController.downloadModeloPeriodos(req, res));

// Importação (POST - com logging)
router.post('/importar-balancete', logMiddleware('importar-balancete'), upload.single('file'), (req, res) => ImportacaoExportacaoController.importarBalancete(req, res));
router.post('/importar-periodos', logMiddleware('importar-periodos'), upload.single('file'), (req, res) => ImportacaoExportacaoController.importarPeriodos(req, res));
router.post('/importar-excel', logMiddleware('importar-excel'), upload.single('file'), (req, res) => ImportacaoExportacaoController.importarExcel(req, res));

// Sincronização (POST - com logging)
router.post('/sincronizar-balancete', logMiddleware('sincronizar-balancete'), (req, res) => ImportacaoExportacaoController.sincronizarBalancete(req, res));
router.post('/sincronizar-diario', logMiddleware('sincronizar-diario'), (req, res) => ImportacaoExportacaoController.sincronizarDiario(req, res));
router.post('/sincronizar-razao', logMiddleware('sincronizar-razao'), (req, res) => ImportacaoExportacaoController.sincronizarRazao(req, res));
router.post('/sincronizar-saldos', logMiddleware('sincronizar-saldos'), (req, res) => ImportacaoExportacaoController.sincronizarSaldos(req, res));
router.post('/sincronizar-balanco', logMiddleware('sincronizar-balanco'), (req, res) => ImportacaoExportacaoController.sincronizarBalanco(req, res));

// ==================== ENCERRAMENTO ====================
const EncerramentoController = require('../controllers/contabilidade/EncerramentoController');
router.post('/encerrar', logMiddleware('encerramento'), (req, res) => EncerramentoController.executarEncerramento(req, res));
router.get('/verificar-pre-encerramento', (req, res) => EncerramentoController.verificarPreEncerramento(req, res));

module.exports = router;