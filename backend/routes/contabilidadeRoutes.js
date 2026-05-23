// backend/routes/contabilidadeRoutes.js
const express = require('express');
const router = express.Router();
const PlanoContasController = require('../controllers/contabilidade/PlanoContasController');
const LancamentoController = require('../controllers/contabilidade/LancamentoController');
const RelatoriosController = require('../controllers/contabilidade/RelatoriosController');
const PeriodosController = require('../controllers/contabilidade/PeriodosController');

// ==================== PLANO DE CONTAS ====================
router.get('/plano-contas', (req, res) => PlanoContasController.listar(req, res));
router.post('/plano-contas', (req, res) => PlanoContasController.criar(req, res));
router.post('/plano-contas/auto', (req, res) => PlanoContasController.criarAuto(req, res));
router.post('/plano-contas/inicializar', (req, res) => PlanoContasController.inicializarPadrao(req, res));
router.put('/plano-contas/:id', (req, res) => PlanoContasController.atualizar(req, res));
router.delete('/plano-contas/:id', (req, res) => PlanoContasController.desativar(req, res));

// ==================== LANÇAMENTOS ====================
router.get('/lancamentos', (req, res) => LancamentoController.listar(req, res));
router.post('/lancamentos/manual', (req, res) => LancamentoController.criarManual(req, res));
router.post('/lancamentos/:id/estornar', (req, res) => LancamentoController.estornar(req, res));
router.post('/reconciliar', (req, res) => LancamentoController.reconciliar(req, res));
router.get('/resumo', (req, res) => LancamentoController.resumo(req, res));

// ==================== RELATÓRIOS ====================
router.get('/relatorios/balancete', (req, res) => RelatoriosController.balancete(req, res));
router.get('/relatorios/dre', (req, res) => RelatoriosController.dre(req, res));

// ==================== PERÍODOS FISCAIS ====================
router.get('/periodos', (req, res) => PeriodosController.listar(req, res));
router.post('/periodos', (req, res) => PeriodosController.criar(req, res));
router.put('/periodos/:id', (req, res) => PeriodosController.atualizar(req, res));
router.post('/periodos/:id/fechar', (req, res) => PeriodosController.fechar(req, res));
router.post('/periodos/:id/reabrir', (req, res) => PeriodosController.reabrir(req, res));
router.delete('/periodos/:id', (req, res) => PeriodosController.excluir(req, res));


// ==================== IMPORTAÇÃO/EXPORTAÇÃO ====================
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const ImportacaoExportacaoController = require('../controllers/contabilidade/ImportacaoExportacaoController');

// Download de modelos
router.get('/modelo-balancete', (req, res) => ImportacaoExportacaoController.downloadModeloBalancete(req, res));
router.get('/modelo-diario', (req, res) => ImportacaoExportacaoController.downloadModeloDiario(req, res));
router.get('/modelo-razao', (req, res) => ImportacaoExportacaoController.downloadModeloRazao(req, res));
router.get('/modelo-saldos', (req, res) => ImportacaoExportacaoController.downloadModeloSaldos(req, res));
router.get('/modelo-periodos', (req, res) => ImportacaoExportacaoController.downloadModeloPeriodos(req, res));

// Importação
router.post('/importar-balancete', upload.single('file'), (req, res) => ImportacaoExportacaoController.importarBalancete(req, res));
router.post('/importar-periodos', upload.single('file'), (req, res) => ImportacaoExportacaoController.importarPeriodos(req, res));

// Sincronização
router.post('/sincronizar-balancete', (req, res) => ImportacaoExportacaoController.sincronizarBalancete(req, res));
router.post('/sincronizar-diario', (req, res) => ImportacaoExportacaoController.sincronizarDiario(req, res));
router.post('/sincronizar-razao', (req, res) => ImportacaoExportacaoController.sincronizarRazao(req, res));
router.post('/sincronizar-saldos', (req, res) => ImportacaoExportacaoController.sincronizarSaldos(req, res));
router.post('/sincronizar-balanco', (req, res) => ImportacaoExportacaoController.sincronizarBalanco(req, res));

// ==================== ENCERRAMENTO ====================
const EncerramentoController = require('../controllers/contabilidade/EncerramentoController');
router.post('/encerrar', (req, res) => EncerramentoController.executarEncerramento(req, res));
router.get('/verificar-pre-encerramento', (req, res) => EncerramentoController.verificarPreEncerramento(req, res));

module.exports = router;