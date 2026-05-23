// backend/controllers/contabilidade/PeriodosController.js
const PeriodoFiscal = require('../../models/PeriodoFiscal');
const LancamentoContabilistico = require('../../models/LancamentoContabilistico');

class PeriodosController {
    async listar(req, res) {
        try {
            const { empresaId } = req.query;
            if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            const periodos = await PeriodoFiscal.find({ empresaId }).sort({ ano: -1 });
            res.json({ sucesso: true, dados: periodos });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async criar(req, res) {
        try {
            const { empresaId, ano, nome, dataInicio, dataFim, tipo, status } = req.body;
            if (!empresaId || !ano || !dataInicio || !dataFim) {
                return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos' });
            }
            
            const existe = await PeriodoFiscal.findOne({ empresaId, ano });
            if (existe) return res.status(400).json({ sucesso: false, mensagem: `Já existe um período para o ano ${ano}` });
            
            const periodo = new PeriodoFiscal({ empresaId, ano, nome, dataInicio, dataFim, tipo, status: status || 'Aberto', criadoPor: req.usuarioId });
            await periodo.save();
            res.status(201).json({ sucesso: true, dados: periodo });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { nome, dataInicio, dataFim, tipo, status } = req.body;
            const periodo = await PeriodoFiscal.findById(id);
            if (!periodo) return res.status(404).json({ sucesso: false, mensagem: 'Período não encontrado' });
            
            if (nome) periodo.nome = nome;
            if (dataInicio) periodo.dataInicio = dataInicio;
            if (dataFim) periodo.dataFim = dataFim;
            if (tipo) periodo.tipo = tipo;
            if (status) periodo.status = status;
            await periodo.save();
            res.json({ sucesso: true, dados: periodo });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async fechar(req, res) {
        try {
            const { id } = req.params;
            const periodo = await PeriodoFiscal.findById(id);
            if (!periodo) return res.status(404).json({ sucesso: false, mensagem: 'Período não encontrado' });
            
            // Calcular resultado do período
            const lancamentos = await LancamentoContabilistico.find({
                empresaId: periodo.empresaId,
                dataLancamento: { $gte: periodo.dataInicio, $lte: periodo.dataFim },
                status: 'Contabilizado'
            });
            
            const receitas = lancamentos.reduce((s, l) => s + l.partidas.filter(p => p.classe === 6).reduce((ss, p) => ss + p.credito, 0), 0);
            const despesas = lancamentos.reduce((s, l) => s + l.partidas.filter(p => p.classe === 7).reduce((ss, p) => ss + p.debito, 0), 0);
            
            periodo.status = 'Fechado';
            periodo.fechadoPor = req.usuarioId;
            periodo.dataFechamento = new Date();
            periodo.resultado = { receitas, despesas, lucroPrejuizo: receitas - despesas };
            await periodo.save();
            res.json({ sucesso: true, dados: periodo, mensagem: 'Período fechado com sucesso' });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async reabrir(req, res) {
        try {
            const { id } = req.params;
            const periodo = await PeriodoFiscal.findById(id);
            if (!periodo) return res.status(404).json({ sucesso: false, mensagem: 'Período não encontrado' });
            periodo.status = 'Aberto';
            await periodo.save();
            res.json({ sucesso: true, dados: periodo, mensagem: 'Período reaberto com sucesso' });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async excluir(req, res) {
        try {
            const { id } = req.params;
            const periodo = await PeriodoFiscal.findByIdAndDelete(id);
            if (!periodo) return res.status(404).json({ sucesso: false, mensagem: 'Período não encontrado' });
            res.json({ sucesso: true, mensagem: 'Período excluído com sucesso' });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new PeriodosController();