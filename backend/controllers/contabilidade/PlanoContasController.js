// backend/controllers/contabilidade/PlanoContasController.js
const PlanoContas = require('../../models/PlanoContas');
const CodificadorPGCA = require('../../services/codificadorPGCA');

class PlanoContasController {
    async listar(req, res) {
        try {
            const { empresaId } = req.query;
            if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            
            const contas = await PlanoContas.find({ empresaId, ativo: true }).sort({ codigo: 1 });
            res.json({ sucesso: true, dados: contas });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async criar(req, res) {
        try {
            const { empresaId, codigo, nome, classe, nivel, natureza, pai } = req.body;
            if (!empresaId || !codigo || !nome) {
                return res.status(400).json({ sucesso: false, mensagem: 'Empresa, código e nome são obrigatórios' });
            }
            
            const existe = await PlanoContas.findOne({ empresaId, codigo });
            if (existe) return res.status(400).json({ sucesso: false, mensagem: `Código ${codigo} já existe` });
            
            const novaConta = new PlanoContas({
                codigo, nome, classe: classe || parseInt(codigo.split('.')[0]) || 9,
                nivel: nivel || codigo.split('.').length, natureza: natureza || 'Mista',
                pai: pai || null, empresaId, criadoPor: req.usuarioId, ativo: true
            });
            await novaConta.save();
            res.status(201).json({ sucesso: true, dados: novaConta, mensagem: 'Conta criada com sucesso' });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async criarAuto(req, res) {
        try {
            const { empresaId, categoria, tipoAtivo, nome } = req.body;
            if (!empresaId || !categoria || !nome) {
                return res.status(400).json({ sucesso: false, mensagem: 'Empresa, categoria e nome são obrigatórios' });
            }
            
            const codigoInfo = await CodificadorPGCA.gerarCodigo(categoria, tipoAtivo, nome);
            const existe = await PlanoContas.findOne({ empresaId, codigo: codigoInfo.codigo });
            if (existe) return res.json({ sucesso: true, dados: existe, codigoGerado: codigoInfo });
            
            const nivel = codigoInfo.codigo.split('.').length;
            const classe = parseInt(codigoInfo.classe);
            const naturezas = { 1: 'Devedora', 2: 'Devedora', 3: 'Mista', 4: 'Devedora', 5: 'Credora', 6: 'Credora', 7: 'Devedora', 8: 'Mista', 9: 'Mista' };
            
            const novaConta = new PlanoContas({
                codigo: codigoInfo.codigo, nome, classe, nivel, natureza: naturezas[classe] || 'Mista',
                empresaId, criadoPor: req.usuarioId, ativo: true
            });
            await novaConta.save();
            res.status(201).json({ sucesso: true, dados: novaConta, codigoGerado: codigoInfo });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async inicializarPadrao(req, res) {
        try {
            const { empresaId } = req.body;
            if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
            
            const existentes = await PlanoContas.countDocuments({ empresaId });
            if (existentes > 0) {
                return res.status(400).json({ sucesso: false, mensagem: 'Já existem contas para esta empresa' });
            }
            
            const contasPadrao = [
                { codigo: "1", nome: "MEIOS FIXOS E INVESTIMENTOS", classe: 1, nivel: 1, natureza: "Devedora", pai: null },
                { codigo: "11", nome: "Imobilizações Corpóreas", classe: 1, nivel: 2, natureza: "Devedora", pai: "1" },
                { codigo: "2", nome: "EXISTÊNCIAS", classe: 2, nivel: 1, natureza: "Devedora", pai: null },
                { codigo: "3", nome: "TERCEIROS", classe: 3, nivel: 1, natureza: "Mista", pai: null },
                { codigo: "31", nome: "Clientes", classe: 3, nivel: 2, natureza: "Devedora", pai: "3" },
                { codigo: "32", nome: "Fornecedores", classe: 3, nivel: 2, natureza: "Credora", pai: "3" },
                { codigo: "4", nome: "MEIOS MONETÁRIOS", classe: 4, nivel: 1, natureza: "Devedora", pai: null },
                { codigo: "45", nome: "Caixa", classe: 4, nivel: 2, natureza: "Devedora", pai: "4" },
                { codigo: "5", nome: "CAPITAL E RESERVAS", classe: 5, nivel: 1, natureza: "Credora", pai: null },
                { codigo: "6", nome: "PROVEITOS E GANHOS", classe: 6, nivel: 1, natureza: "Credora", pai: null },
                { codigo: "61", nome: "Vendas", classe: 6, nivel: 2, natureza: "Credora", pai: "6" },
                { codigo: "7", nome: "CUSTOS E PERDAS", classe: 7, nivel: 1, natureza: "Devedora", pai: null },
                { codigo: "71", nome: "Custo das Existências", classe: 7, nivel: 2, natureza: "Devedora", pai: "7" },
                { codigo: "8", nome: "RESULTADOS ANALÍTICOS", classe: 8, nivel: 1, natureza: "Mista", pai: null },
                { codigo: "9", nome: "CONTAS DE ORDEM", classe: 9, nivel: 1, natureza: "Mista", pai: null }
            ];
            
            const contasParaSalvar = contasPadrao.map(c => ({ ...c, empresaId, criadoPor: req.usuarioId, ativo: true }));
            await PlanoContas.insertMany(contasParaSalvar);
            res.status(201).json({ sucesso: true, mensagem: 'Plano de contas inicializado', total: contasParaSalvar.length });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { nome, natureza, ativo } = req.body;
            const conta = await PlanoContas.findById(id);
            if (!conta) return res.status(404).json({ sucesso: false, mensagem: 'Conta não encontrada' });
            if (nome) conta.nome = nome;
            if (natureza) conta.natureza = natureza;
            if (ativo !== undefined) conta.ativo = ativo;
            conta.alteradoPor = req.usuarioId;
            await conta.save();
            res.json({ sucesso: true, mensagem: 'Conta atualizada', dados: conta });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }

    async desativar(req, res) {
        try {
            const { id } = req.params;
            const conta = await PlanoContas.findById(id);
            if (!conta) return res.status(404).json({ sucesso: false, mensagem: 'Conta não encontrada' });
            
            const subcontas = await PlanoContas.find({ empresaId: conta.empresaId, pai: conta.codigo, ativo: true });
            if (subcontas.length > 0) {
                return res.status(400).json({ sucesso: false, mensagem: `Existem ${subcontas.length} subcontas vinculadas` });
            }
            conta.ativo = false;
            conta.alteradoPor = req.usuarioId;
            await conta.save();
            res.json({ sucesso: true, mensagem: 'Conta desativada' });
        } catch (error) {
            res.status(500).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new PlanoContasController();