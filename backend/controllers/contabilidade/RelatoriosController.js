// backend/controllers/contabilidade/RelatoriosController.js
const LancamentoContabilistico = require('../../models/LancamentoContabilistico');
const mongoose = require('mongoose');

class RelatoriosController {
    async balancete(req, res) {
        try {
            const { empresaId, dataInicio, dataFim } = req.query;
            if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            
            const match = { empresaId: new mongoose.Types.ObjectId(empresaId), status: 'Contabilizado' };
            if (dataInicio || dataFim) {
                match.dataLancamento = {};
                if (dataInicio) match.dataLancamento.$gte = new Date(dataInicio);
                if (dataFim) match.dataLancamento.$lte = new Date(dataFim);
            }
            
            const pipeline = [
                { $match: match },
                { $unwind: '$partidas' },
                { $group: { _id: { codigo: '$partidas.contaCodigo', descricao: '$partidas.contaDescricao', classe: '$partidas.classe' }, debito: { $sum: '$partidas.debito' }, credito: { $sum: '$partidas.credito' } } },
                { $project: { contaCodigo: '$_id.codigo', contaDescricao: '$_id.descricao', classe: '$_id.classe', debito: 1, credito: 1, saldo: { $subtract: ['$debito', '$credito'] } } },
                { $sort: { contaCodigo: 1 } }
            ];
            
            const balancete = await LancamentoContabilistico.aggregate(pipeline);
            const totais = balancete.reduce((acc, i) => ({
                totalDebito: acc.totalDebito + i.debito,
                totalCredito: acc.totalCredito + i.credito,
                totalSaldoDevedor: acc.totalSaldoDevedor + (i.saldo > 0 ? i.saldo : 0),
                totalSaldoCredor: acc.totalSaldoCredor + (i.saldo < 0 ? Math.abs(i.saldo) : 0)
            }), { totalDebito: 0, totalCredito: 0, totalSaldoDevedor: 0, totalSaldoCredor: 0 });
            
            res.json({ sucesso: true, dados: { periodo: { dataInicio: dataInicio || 'início', dataFim: dataFim || 'actual' }, balancete, totais } });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async dre(req, res) {
        try {
            const { empresaId, dataInicio, dataFim } = req.query;
            if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            
            const match = { empresaId: new mongoose.Types.ObjectId(empresaId), status: 'Contabilizado' };
            if (dataInicio || dataFim) {
                match.dataLancamento = {};
                if (dataInicio) match.dataLancamento.$gte = new Date(dataInicio);
                if (dataFim) match.dataLancamento.$lte = new Date(dataFim);
            }
            
            const pipelineProveitos = [
                { $match: match }, { $unwind: '$partidas' },
                { $match: { 'partidas.classe': 6, 'partidas.credito': { $gt: 0 } } },
                { $group: { _id: { codigo: '$partidas.contaCodigo', descricao: '$partidas.contaDescricao' }, total: { $sum: '$partidas.credito' } } },
                { $sort: { '_id.codigo': 1 } }
            ];
            
            const pipelineCustos = [
                { $match: match }, { $unwind: '$partidas' },
                { $match: { 'partidas.classe': 7, 'partidas.debito': { $gt: 0 } } },
                { $group: { _id: { codigo: '$partidas.contaCodigo', descricao: '$partidas.contaDescricao' }, total: { $sum: '$partidas.debito' } } },
                { $sort: { '_id.codigo': 1 } }
            ];
            
            const [proveitos, custos] = await Promise.all([
                LancamentoContabilistico.aggregate(pipelineProveitos),
                LancamentoContabilistico.aggregate(pipelineCustos)
            ]);
            
            const totalProveitos = proveitos.reduce((s, p) => s + p.total, 0);
            const totalCustos = custos.reduce((s, c) => s + c.total, 0);
            
            res.json({ sucesso: true, dados: { periodo: { dataInicio: dataInicio || 'início', dataFim: dataFim || 'actual' }, proveitos: { detalhes: proveitos, total: totalProveitos }, custos: { detalhes: custos, total: totalCustos }, resultado: { valor: totalProveitos - totalCustos, tipo: totalProveitos >= totalCustos ? 'Lucro' : 'Prejuízo', percentual: totalProveitos > 0 ? ((totalProveitos - totalCustos) / totalProveitos) * 100 : 0 } } });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new RelatoriosController();