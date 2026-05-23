// backend/controllers/contabilidade/ImportacaoExportacaoController.js
const XLSX = require('xlsx');
const LancamentoContabilistico = require('../../models/LancamentoContabilistico');
const PlanoContas = require('../../models/PlanoContas');
const PeriodoFiscal = require('../../models/PeriodoFiscal');
const Venda = require('../../models/Venda');
const Pagamento = require('../../models/Pagamento');

class ImportacaoExportacaoController {
    
    // ==================== DOWNLOAD DE MODELOS ====================
    async downloadModeloBalancete(req, res) {
        try {
            const { formato } = req.query;
            const dados = [
                { codigo: "1", nome: "MEIOS FIXOS", classe: 1, debito: 0, credito: 0, saldo: 0 },
                { codigo: "2", nome: "EXISTÊNCIAS", classe: 2, debito: 0, credito: 0, saldo: 0 },
                { codigo: "3", nome: "TERCEIROS", classe: 3, debito: 0, credito: 0, saldo: 0 }
            ];
            
            if (formato === 'excel' || formato === 'xlsx') {
                const ws = XLSX.utils.json_to_sheet(dados);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Balancete");
                const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
                res.setHeader('Content-Disposition', 'attachment; filename=modelo_balancete.xlsx');
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                return res.send(buffer);
            }
            
            if (formato === 'csv') {
                const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(dados));
                res.setHeader('Content-Disposition', 'attachment; filename=modelo_balancete.csv');
                res.setHeader('Content-Type', 'text/csv');
                return res.send(csv);
            }
            
            res.json({ sucesso: true, dados });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async downloadModeloDiario(req, res) {
        try {
            const dados = [
                { data: "2024-01-15", numeroLancamento: "VND-001", descricao: "Venda", conta: "31.1.2.1", debito: 1000, credito: 0 },
                { data: "2024-01-15", numeroLancamento: "VND-001", descricao: "Venda", conta: "61.1.1", debito: 0, credito: 1000 }
            ];
            const ws = XLSX.utils.json_to_sheet(dados);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Diario");
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', 'attachment; filename=modelo_diario.xlsx');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async downloadModeloRazao(req, res) {
        try {
            const dados = [
                { data: "2024-01-15", numeroLancamento: "VND-001", descricao: "Venda", debito: 1000, credito: 0, saldo: 1000 }
            ];
            const ws = XLSX.utils.json_to_sheet(dados);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Razao");
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', 'attachment; filename=modelo_razao.xlsx');
            res.send(buffer);
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async downloadModeloSaldos(req, res) {
        try {
            const dados = [
                { codigo: "1", nome: "MEIOS FIXOS", classe: 1, saldo: 1250000, natureza: "Devedora" }
            ];
            const ws = XLSX.utils.json_to_sheet(dados);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Saldos");
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', 'attachment; filename=modelo_saldos.xlsx');
            res.send(buffer);
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async downloadModeloPeriodos(req, res) {
        try {
            const dados = [
                { ano: 2024, nome: "Exercício 2024", dataInicio: "2024-01-01", dataFim: "2024-12-31", tipo: "Exercício", status: "Aberto" }
            ];
            const ws = XLSX.utils.json_to_sheet(dados);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Periodos");
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', 'attachment; filename=modelo_periodos.xlsx');
            res.send(buffer);
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    // ==================== IMPORTAÇÃO ====================
    async importarBalancete(req, res) {
        try {
            const { empresaId } = req.body;
            const file = req.file;
            
            if (!file || !empresaId) {
                return res.status(400).json({ sucesso: false, mensagem: 'Ficheiro ou empresa não informados' });
            }
            
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const dados = XLSX.utils.sheet_to_json(sheet);
            
            let importados = 0;
            for (const row of dados) {
                if (row.codigo && row.nome) {
                    const existe = await PlanoContas.findOne({ empresaId, codigo: row.codigo });
                    if (!existe) {
                        const novaConta = new PlanoContas({
                            codigo: row.codigo, nome: row.nome, classe: row.classe || 9,
                            nivel: row.codigo.split('.').length, natureza: row.saldo >= 0 ? 'Devedora' : 'Credora',
                            empresaId, criadoPor: req.usuarioId, ativo: true
                        });
                        await novaConta.save();
                        importados++;
                    }
                }
            }
            res.json({ sucesso: true, mensagem: `Importados ${importados} registos`, totalImportados: importados });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async importarPeriodos(req, res) {
        try {
            const { empresaId } = req.body;
            const file = req.file;
            
            if (!file || !empresaId) {
                return res.status(400).json({ sucesso: false, mensagem: 'Ficheiro ou empresa não informados' });
            }
            
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const dados = XLSX.utils.sheet_to_json(sheet);
            
            let importados = 0;
            for (const row of dados) {
                if (row.ano) {
                    const existe = await PeriodoFiscal.findOne({ empresaId, ano: row.ano });
                    if (!existe) {
                        const periodo = new PeriodoFiscal({
                            ano: row.ano, nome: row.nome, dataInicio: new Date(row.dataInicio),
                            dataFim: new Date(row.dataFim), tipo: row.tipo || 'Exercício',
                            status: row.status || 'Aberto', empresaId, criadoPor: req.usuarioId
                        });
                        await periodo.save();
                        importados++;
                    }
                }
            }
            res.json({ sucesso: true, mensagem: `Importados ${importados} períodos`, totalImportados: importados });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    // ==================== SINCRONIZAÇÃO ====================
    async sincronizarBalancete(req, res) {
        try {
            const { empresaId } = req.body;
            
            // Recalcular balancete a partir dos lançamentos
            const lancamentos = await LancamentoContabilistico.find({ empresaId, status: 'Contabilizado' });
            
            const saldos = {};
            for (const lanc of lancamentos) {
                for (const partida of lanc.partidas) {
                    if (!saldos[partida.contaCodigo]) {
                        saldos[partida.contaCodigo] = { debito: 0, credito: 0 };
                    }
                    saldos[partida.contaCodigo].debito += partida.debito || 0;
                    saldos[partida.contaCodigo].credito += partida.credito || 0;
                }
            }
            
            // Atualizar ou criar contas com os saldos
            for (const [codigo, saldo] of Object.entries(saldos)) {
                const saldoFinal = saldo.debito - saldo.credito;
                await PlanoContas.findOneAndUpdate(
                    { empresaId, codigo },
                    { $set: { saldoDevedor: saldoFinal > 0 ? saldoFinal : 0, saldoCredor: saldoFinal < 0 ? Math.abs(saldoFinal) : 0 } },
                    { upsert: true }
                );
            }
            
            res.json({ sucesso: true, mensagem: 'Balancete sincronizado', resultados: { contas: Object.keys(saldos).length } });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async sincronizarDiario(req, res) {
        try {
            const { empresaId } = req.body;
            const lancamentos = await LancamentoContabilistico.find({ empresaId, status: 'Contabilizado' }).sort({ dataLancamento: -1 });
            res.json({ sucesso: true, mensagem: 'Diário sincronizado', resultados: { lancamentos: lancamentos.length } });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async sincronizarRazao(req, res) {
        try {
            const { empresaId, conta } = req.body;
            const lancamentos = await LancamentoContabilistico.find({ 
                empresaId, status: 'Contabilizado', 'partidas.contaCodigo': conta 
            }).sort({ dataLancamento: 1 });
            
            res.json({ sucesso: true, mensagem: 'Razão sincronizado', resultados: { movimentos: lancamentos.length } });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async sincronizarSaldos(req, res) {
        try {
            const { empresaId } = req.body;
            const contas = await PlanoContas.find({ empresaId, ativo: true });
            res.json({ sucesso: true, mensagem: 'Saldos sincronizados', resultados: { contas: contas.length } });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async sincronizarBalanco(req, res) {
        try {
            const { empresaId } = req.body;
            const contas = await PlanoContas.find({ empresaId, ativo: true });
            
            const ativo = contas.filter(c => c.classe === 1 || c.classe === 2).reduce((s, c) => s + (c.saldoDevedor || 0), 0);
            const passivo = contas.filter(c => c.classe === 3 && (c.saldoCredor || 0) > 0).reduce((s, c) => s + (c.saldoCredor || 0), 0);
            const patrimonio = contas.filter(c => c.classe === 5).reduce((s, c) => s + (c.saldoCredor || 0), 0);
            
            res.json({ sucesso: true, mensagem: 'Balanço sincronizado', resultados: { ativo, passivo, patrimonio, contas: contas.length } });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new ImportacaoExportacaoController();