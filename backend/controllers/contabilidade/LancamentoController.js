// backend/controllers/contabilidade/LancamentoController.js
const LancamentoContabilistico = require('../../models/LancamentoContabilistico');
const IntegracaoContabilistica = require('../../services/IntegracaoContabilistica');

class LancamentoController {
    async listar(req, res) {
        try {
            const { empresaId, pagina = 1, limite = 50, dataInicio, dataFim, status, conta } = req.query;
            if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            
            const filtro = { empresaId };
            if (dataInicio || dataFim) {
                filtro.dataLancamento = {};
                if (dataInicio) filtro.dataLancamento.$gte = new Date(dataInicio);
                if (dataFim) filtro.dataLancamento.$lte = new Date(dataFim);
            }
            if (status && status !== 'todos') filtro.status = status;
            if (conta) filtro['partidas.contaCodigo'] = conta;
            
            const skip = (parseInt(pagina) - 1) * parseInt(limite);
            const [lancamentos, total] = await Promise.all([
                LancamentoContabilistico.find(filtro).sort({ dataLancamento: -1 }).skip(skip).limit(parseInt(limite)),
                LancamentoContabilistico.countDocuments(filtro)
            ]);
            res.json({ sucesso: true, dados: lancamentos, paginacao: { total, pagina: parseInt(pagina), totalPaginas: Math.ceil(total / parseInt(limite)) } });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async criarManual(req, res) {
        try {
            const { empresaId, descricao, dataLancamento, partidas, observacoes } = req.body;
            if (!empresaId || !descricao || !partidas || partidas.length < 2) {
                return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos' });
            }
            
            let totalDebito = 0, totalCredito = 0;
            partidas.forEach(p => { totalDebito += p.debito || 0; totalCredito += p.credito || 0; });
            if (totalDebito !== totalCredito) {
                return res.status(400).json({ sucesso: false, mensagem: `Débito (${totalDebito}) deve igualar Crédito (${totalCredito})` });
            }
            
            const ultimo = await LancamentoContabilistico.findOne({ empresaId }).sort({ numeroLancamento: -1 });
            let proximo = 1;
            if (ultimo?.numeroLancamento) {
                const match = ultimo.numeroLancamento.match(/AJ-(\d+)/);
                if (match) proximo = parseInt(match[1]) + 1;
            }
            
            const dataLanc = new Date(dataLancamento || Date.now());
            const lancamento = new LancamentoContabilistico({
                numeroLancamento: `AJ-${proximo.toString().padStart(6, '0')}`,
                descricao, dataLancamento: dataLanc, dataContabilizacao: new Date(),
                empresaId, partidas: partidas.map(p => ({ ...p, documentoOrigem: p.documentoOrigem || { tipo: 'Ajuste' } })),
                totalDebito, totalCredito, status: 'Contabilizado', criadoPor: req.usuarioId,
                observacoes, periodo: { ano: dataLanc.getFullYear(), mes: dataLanc.getMonth() + 1, trimestre: Math.floor(dataLanc.getMonth() / 3) + 1 }
            });
            await lancamento.save();
            res.status(201).json({ sucesso: true, dados: lancamento });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async reconciliar(req, res) {
        try {
            const { empresaId } = req.body;
            if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            const resultado = await IntegracaoContabilistica.reconciliarAutomatico(empresaId, req.usuarioId);
            res.json({ sucesso: true, mensagem: 'Reconciliação concluída', dados: resultado });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async estornar(req, res) {
        try {
            const { id } = req.params;
            const { motivo } = req.body;
            const lancamento = await LancamentoContabilistico.findById(id);
            if (!lancamento) return res.status(404).json({ sucesso: false, mensagem: 'Lançamento não encontrado' });
            if (lancamento.status !== 'Contabilizado') {
                return res.status(400).json({ sucesso: false, mensagem: 'Apenas lançamentos contabilizados podem ser estornados' });
            }
            const estorno = await lancamento.estornar(req.usuarioId, motivo || 'Estorno solicitado');
            res.json({ sucesso: true, mensagem: 'Lançamento estornado', dados: { original: lancamento, estorno } });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async resumo(req, res) {
        try {
            const { empresaId, mes, ano } = req.query;
            if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            
            const dataInicio = new Date(ano, mes - 1, 1);
            const dataFim = new Date(ano, mes, 0);
            const lancamentos = await LancamentoContabilistico.find({
                empresaId, dataLancamento: { $gte: dataInicio, $lte: dataFim }, status: 'Contabilizado'
            });
            
            const totalDebito = lancamentos.reduce((s, l) => s + l.totalDebito, 0);
            const totalCredito = lancamentos.reduce((s, l) => s + l.totalCredito, 0);
            const ultimos = await LancamentoContabilistico.find({ empresaId, status: 'Contabilizado' }).sort({ dataLancamento: -1 }).limit(10);
            
            res.json({ sucesso: true, dados: { totalLancamentos: lancamentos.length, totalDebito, totalCredito, lancamentosMes: lancamentos.length, ultimosLancamentos: ultimos, periodo: { mes, ano } } });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new LancamentoController();