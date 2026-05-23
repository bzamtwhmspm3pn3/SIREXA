// backend/controllers/contabilidade/EncerramentoController.js
const LancamentoContabilistico = require('../../models/LancamentoContabilistico');
const PeriodoFiscal = require('../../models/PeriodoFiscal');
const PlanoContas = require('../../models/PlanoContas');

class EncerramentoController {
    async executarEncerramento(req, res) {
        try {
            const { empresaId, ano } = req.body;
            
            if (!empresaId || !ano) {
                return res.status(400).json({ sucesso: false, mensagem: 'Empresa e ano são obrigatórios' });
            }
            
            // Verificar se período existe
            let periodo = await PeriodoFiscal.findOne({ empresaId, ano });
            if (!periodo) {
                periodo = new PeriodoFiscal({
                    ano,
                    nome: `Exercício ${ano}`,
                    dataInicio: new Date(`${ano}-01-01`),
                    dataFim: new Date(`${ano}-12-31`),
                    tipo: 'Exercício',
                    status: 'Aberto',
                    empresaId,
                    criadoPor: req.usuarioId
                });
                await periodo.save();
            }
            
            // Buscar lançamentos do período
            const lancamentos = await LancamentoContabilistico.find({
                empresaId,
                dataLancamento: { $gte: periodo.dataInicio, $lte: periodo.dataFim },
                status: 'Contabilizado'
            });
            
            // Calcular resultado
            let receitas = 0, despesas = 0;
            for (const lanc of lancamentos) {
                for (const partida of lanc.partidas) {
                    if (partida.classe === 6) receitas += partida.credito || 0;
                    if (partida.classe === 7) despesas += partida.debito || 0;
                }
            }
            
            const lucroPrejuizo = receitas - despesas;
            
            // Criar lançamento de encerramento
            const contaResultado = await PlanoContas.findOne({ empresaId, codigo: '55.1.1' });
            if (!contaResultado) {
                const novaConta = new PlanoContas({
                    codigo: '55.1.1',
                    nome: 'Resultado Líquido do Exercício',
                    classe: 5,
                    nivel: 3,
                    natureza: lucroPrejuizo >= 0 ? 'Credora' : 'Devedora',
                    empresaId,
                    criadoPor: req.usuarioId,
                    ativo: true
                });
                await novaConta.save();
            }
            
            const partidas = lucroPrejuizo >= 0 ? [
                { contaCodigo: '54.1.1', contaDescricao: 'Resultados Transitados', classe: 5, debito: lucroPrejuizo, credito: 0 },
                { contaCodigo: '55.1.1', contaDescricao: 'Resultado Líquido', classe: 5, debito: 0, credito: lucroPrejuizo }
            ] : [
                { contaCodigo: '55.1.1', contaDescricao: 'Resultado Líquido', classe: 5, debito: Math.abs(lucroPrejuizo), credito: 0 },
                { contaCodigo: '54.1.1', contaDescricao: 'Resultados Transitados', classe: 5, debito: 0, credito: Math.abs(lucroPrejuizo) }
            ];
            
            const encerramento = new LancamentoContabilistico({
                numeroLancamento: `ENC-${ano}-001`,
                descricao: `Encerramento do exercício ${ano} - Apuração de resultado`,
                dataLancamento: new Date(),
                empresaId,
                partidas,
                totalDebito: Math.abs(lucroPrejuizo),
                totalCredito: Math.abs(lucroPrejuizo),
                status: 'Contabilizado',
                criadoPor: req.usuarioId,
                periodo: { ano, mes: 12, trimestre: 4 },
                observacoes: `Resultado do exercício: ${lucroPrejuizo >= 0 ? 'Lucro' : 'Prejuízo'} de ${Math.abs(lucroPrejuizo)} Kz`
            });
            await encerramento.save();
            
            // Atualizar período
            periodo.status = 'Fechado';
            periodo.fechadoPor = req.usuarioId;
            periodo.dataFechamento = new Date();
            periodo.resultado = { receitas, despesas, lucroPrejuizo };
            await periodo.save();
            
            res.json({ 
                sucesso: true, 
                mensagem: `Exercício ${ano} encerrado com sucesso`,
                dados: { resultado: lucroPrejuizo, tipo: lucroPrejuizo >= 0 ? 'Lucro' : 'Prejuízo', receitas, despesas }
            });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async verificarPreEncerramento(req, res) {
        try {
            const { empresaId, ano } = req.query;
            
            if (!empresaId || !ano) {
                return res.status(400).json({ sucesso: false, mensagem: 'Empresa e ano são obrigatórios' });
            }
            
            const verificacoes = {
                balanceteOk: false,
                inventarioOk: true,
                pagamentosOk: true,
                vendasOk: true
            };
            
            // Verificar se há lançamentos no período
            const lancamentos = await LancamentoContabilistico.countDocuments({
                empresaId,
                dataLancamento: { $gte: new Date(`${ano}-01-01`), $lte: new Date(`${ano}-12-31`) }
            });
            verificacoes.balanceteOk = lancamentos > 0;
            
            res.json({ sucesso: true, dados: verificacoes });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new EncerramentoController();