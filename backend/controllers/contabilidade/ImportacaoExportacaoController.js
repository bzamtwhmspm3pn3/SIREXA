// backend/controllers/contabilidade/ImportacaoExportacaoController.js
const XLSX = require('xlsx');
const LancamentoContabilistico = require('../../models/LancamentoContabilistico');
const PlanoContas = require('../../models/PlanoContas');
const PeriodoFiscal = require('../../models/PeriodoFiscal');

class ImportacaoExportacaoController {
    
    // ==================== DOWNLOAD DE MODELOS ====================
    async downloadModeloBalancete(req, res) {
        try {
            const { formato } = req.query;
            const dados = [
                { codigo: "1", nome: "MEIOS FIXOS", classe: 1, debito: 0, credito: 0, saldo: 0 },
                { codigo: "2", nome: "EXISTÊNCIAS", classe: 2, debito: 0, credito: 0, saldo: 0 },
                { codigo: "3", nome: "TERCEIROS", classe: 3, debito: 0, credito: 0, saldo: 0 },
                { codigo: "4", nome: "MEIOS MONETÁRIOS", classe: 4, debito: 0, credito: 0, saldo: 0 },
                { codigo: "5", nome: "CAPITAL", classe: 5, debito: 0, credito: 0, saldo: 0 }
            ];
            
            if (formato === 'excel' || formato === 'xlsx' || !formato) {
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
            
            if (formato === 'json') {
                return res.json({ sucesso: true, dados });
            }
            
            if (formato === 'xml') {
                let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<balancete>\n';
                dados.forEach(item => {
                    xml += `  <conta>\n`;
                    xml += `    <codigo>${item.codigo}</codigo>\n`;
                    xml += `    <nome>${item.nome}</nome>\n`;
                    xml += `    <classe>${item.classe}</classe>\n`;
                    xml += `    <debito>${item.debito}</debito>\n`;
                    xml += `    <credito>${item.credito}</credito>\n`;
                    xml += `    <saldo>${item.saldo}</saldo>\n`;
                    xml += `  </conta>\n`;
                });
                xml += '</balancete>';
                res.setHeader('Content-Disposition', 'attachment; filename=modelo_balancete.xml');
                res.setHeader('Content-Type', 'application/xml');
                return res.send(xml);
            }
            
            res.json({ sucesso: true, dados });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async downloadModeloDiario(req, res) {
        try {
            const dados = [
                { data: "2024-01-15", numeroLancamento: "VND-001", descricao: "Venda de mercadorias", conta: "31.1.2.1", debito: 1000, credito: 0 },
                { data: "2024-01-15", numeroLancamento: "VND-001", descricao: "Venda de mercadorias", conta: "61.1.1", debito: 0, credito: 1000 }
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
                { data: "2024-01-15", numeroLancamento: "VND-001", descricao: "Venda", debito: 1000, credito: 0, saldo: 1000 },
                { data: "2024-01-20", numeroLancamento: "PGT-001", descricao: "Pagamento", debito: 0, credito: 500, saldo: 500 }
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
                { codigo: "1", nome: "MEIOS FIXOS", classe: 1, saldo: 1250000, natureza: "Devedora" },
                { codigo: "2", nome: "EXISTÊNCIAS", classe: 2, saldo: 500000, natureza: "Devedora" },
                { codigo: "3", nome: "TERCEIROS", classe: 3, saldo: 300000, natureza: "Credora" }
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
            let erros = [];
            
            for (const row of dados) {
                if (row.codigo && row.nome) {
                    try {
                        const existe = await PlanoContas.findOne({ empresaId, codigo: row.codigo });
                        if (!existe) {
                            const nivel = row.codigo.split('.').length;
                            const classe = parseInt(row.codigo.split('.')[0]) || 9;
                            const natureza = row.saldo >= 0 ? 'Devedora' : 'Credora';
                            
                            const novaConta = new PlanoContas({
                                codigo: row.codigo,
                                nome: row.nome,
                                classe: classe,
                                nivel: nivel,
                                natureza: natureza,
                                empresaId,
                                criadoPor: req.usuarioId,
                                ativo: true
                            });
                            await novaConta.save();
                            importados++;
                        }
                    } catch (error) {
                        erros.push(`Erro ao importar ${row.codigo}: ${error.message}`);
                    }
                }
            }
            
            res.json({ 
                sucesso: true, 
                mensagem: `Importados ${importados} registos`,
                totalImportados: importados,
                erros: erros.length > 0 ? erros : undefined
            });
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
                            ano: row.ano,
                            nome: row.nome || `Exercício ${row.ano}`,
                            dataInicio: new Date(row.dataInicio || `${row.ano}-01-01`),
                            dataFim: new Date(row.dataFim || `${row.ano}-12-31`),
                            tipo: row.tipo || 'Exercício',
                            status: row.status || 'Aberto',
                            empresaId,
                            criadoPor: req.usuarioId
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
            
            if (!empresaId) {
                return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            }
            
            // Recalcular balancete a partir dos lançamentos
            const lancamentos = await LancamentoContabilistico.find({ empresaId, status: 'Contabilizado' });
            
            const saldos = {};
            for (const lanc of lancamentos) {
                for (const partida of lanc.partidas) {
                    if (!saldos[partida.contaCodigo]) {
                        saldos[partida.contaCodigo] = { debito: 0, credito: 0, descricao: partida.contaDescricao, classe: partida.classe };
                    }
                    saldos[partida.contaCodigo].debito += partida.debito || 0;
                    saldos[partida.contaCodigo].credito += partida.credito || 0;
                }
            }
            
            // Atualizar ou criar contas com os saldos
            let atualizadas = 0;
            for (const [codigo, saldo] of Object.entries(saldos)) {
                const saldoFinal = saldo.debito - saldo.credito;
                const existe = await PlanoContas.findOne({ empresaId, codigo });
                
                if (existe) {
                    await PlanoContas.updateOne(
                        { empresaId, codigo },
                        { 
                            $set: { 
                                saldoDevedor: saldoFinal > 0 ? saldoFinal : 0,
                                saldoCredor: saldoFinal < 0 ? Math.abs(saldoFinal) : 0
                            }
                        }
                    );
                } else {
                    const nivel = codigo.split('.').length;
                    const classe = parseInt(codigo.split('.')[0]) || 9;
                    const natureza = saldoFinal >= 0 ? 'Devedora' : 'Credora';
                    
                    const novaConta = new PlanoContas({
                        codigo,
                        nome: saldo.descricao || `Conta ${codigo}`,
                        classe,
                        nivel,
                        natureza,
                        empresaId,
                        criadoPor: req.usuarioId,
                        ativo: true,
                        saldoDevedor: saldoFinal > 0 ? saldoFinal : 0,
                        saldoCredor: saldoFinal < 0 ? Math.abs(saldoFinal) : 0
                    });
                    await novaConta.save();
                }
                atualizadas++;
            }
            
            res.json({ 
                sucesso: true, 
                mensagem: 'Balancete sincronizado', 
                resultados: { contas: Object.keys(saldos).length, atualizadas }
            });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async sincronizarDiario(req, res) {
        try {
            const { empresaId } = req.body;
            
            if (!empresaId) {
                return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            }
            
            const lancamentos = await LancamentoContabilistico.find({ empresaId, status: 'Contabilizado' }).sort({ dataLancamento: -1 });
            
            res.json({ 
                sucesso: true, 
                mensagem: 'Diário sincronizado', 
                resultados: { lancamentos: lancamentos.length }
            });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async sincronizarRazao(req, res) {
        try {
            const { empresaId, conta } = req.body;
            
            if (!empresaId || !conta) {
                return res.status(400).json({ sucesso: false, mensagem: 'Empresa e conta são obrigatórios' });
            }
            
            const lancamentos = await LancamentoContabilistico.find({ 
                empresaId, 
                status: 'Contabilizado',
                'partidas.contaCodigo': conta
            }).sort({ dataLancamento: 1 });
            
            let saldoAcumulado = 0;
            const movimentos = [];
            
            for (const lanc of lancamentos) {
                for (const partida of lanc.partidas) {
                    if (partida.contaCodigo === conta) {
                        const debito = partida.debito || 0;
                        const credito = partida.credito || 0;
                        saldoAcumulado += debito - credito;
                        movimentos.push({
                            data: lanc.dataLancamento,
                            numeroLancamento: lanc.numeroLancamento,
                            descricao: lanc.descricao,
                            debito,
                            credito,
                            saldo: saldoAcumulado
                        });
                    }
                }
            }
            
            res.json({ 
                sucesso: true, 
                mensagem: 'Razão sincronizado', 
                resultados: { movimentos: movimentos.length, saldoAtual: saldoAcumulado }
            });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async sincronizarSaldos(req, res) {
        try {
            const { empresaId } = req.body;
            
            if (!empresaId) {
                return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            }
            
            const contas = await PlanoContas.find({ empresaId, ativo: true });
            
            // Calcular saldos totais
            const totalDevedor = contas.reduce((s, c) => s + (c.saldoDevedor || 0), 0);
            const totalCredor = contas.reduce((s, c) => s + (c.saldoCredor || 0), 0);
            
            res.json({ 
                sucesso: true, 
                mensagem: 'Saldos sincronizados', 
                resultados: { 
                    contas: contas.length,
                    totalDevedor,
                    totalCredor,
                    diferenca: totalDevedor - totalCredor
                }
            });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async sincronizarBalanco(req, res) {
        try {
            const { empresaId } = req.body;
            
            if (!empresaId) {
                return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            }
            
            const contas = await PlanoContas.find({ empresaId, ativo: true });
            
            // Classificar contas por tipo (Ativo, Passivo, Patrimônio)
            const ativo = contas.filter(c => c.classe === 1 || c.classe === 2).reduce((s, c) => s + (c.saldoDevedor || 0), 0);
            const passivo = contas.filter(c => c.classe === 3 && (c.saldoCredor || 0) > 0).reduce((s, c) => s + (c.saldoCredor || 0), 0);
            const patrimonio = contas.filter(c => c.classe === 5).reduce((s, c) => s + (c.saldoCredor || 0), 0);
            
            res.json({ 
                sucesso: true, 
                mensagem: 'Balanço sincronizado', 
                resultados: { 
                    ativo, 
                    passivo, 
                    patrimonio,
                    totalPassivoPL: passivo + patrimonio,
                    equilibrado: Math.abs(ativo - (passivo + patrimonio)) < 1,
                    contas: contas.length
                }
            });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new ImportacaoExportacaoController();