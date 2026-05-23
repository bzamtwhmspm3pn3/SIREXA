// backend/services/IntegracaoContabilistica.js
const LancamentoContabilistico = require('../models/LancamentoContabilistico');
const PlanoContas = require('../models/PlanoContas');
const CodificadorPGCA = require('./codificadorPGCA');

class IntegracaoContabilistica {
    async integrarVenda(venda, empresaId, usuarioId) {
        // Buscar ou criar contas
        let contaCliente = await PlanoContas.findOne({ empresaId, codigo: '31.1.2.1' });
        if (!contaCliente) {
            contaCliente = new PlanoContas({
                codigo: '31.1.2.1', nome: 'Clientes Nacionais', classe: 3, nivel: 4,
                natureza: 'Devedora', empresaId, criadoPor: usuarioId, ativo: true
            });
            await contaCliente.save();
        }
        
        let contaVenda = await PlanoContas.findOne({ empresaId, codigo: venda.tipoFactura === 'Prestação de Serviço' ? '62.1.1' : '61.1.1' });
        if (!contaVenda) {
            contaVenda = new PlanoContas({
                codigo: venda.tipoFactura === 'Prestação de Serviço' ? '62.1.1' : '61.1.1',
                nome: venda.tipoFactura === 'Prestação de Serviço' ? 'Prestações de Serviços' : 'Vendas - Mercado Nacional',
                classe: 6, nivel: 3, natureza: 'Credora', empresaId, criadoPor: usuarioId, ativo: true
            });
            await contaVenda.save();
        }
        
        const lancamento = new LancamentoContabilistico({
            numeroLancamento: `VND-${venda.numeroFactura}`,
            descricao: `Venda #${venda.numeroFactura} - ${venda.cliente}`,
            dataLancamento: new Date(venda.data),
            empresaId,
            partidas: [
                { contaCodigo: contaCliente.codigo, contaDescricao: contaCliente.nome, classe: 3, debito: venda.total, credito: 0, documentoOrigem: { tipo: 'Venda', id: venda._id, referencia: venda.numeroFactura } },
                { contaCodigo: contaVenda.codigo, contaDescricao: contaVenda.nome, classe: 6, debito: 0, credito: venda.total, documentoOrigem: { tipo: 'Venda', id: venda._id, referencia: venda.numeroFactura } }
            ],
            totalDebito: venda.total, totalCredito: venda.total, status: 'Contabilizado',
            criadoPor: usuarioId, periodo: { ano: new Date(venda.data).getFullYear(), mes: new Date(venda.data).getMonth() + 1 }
        });
        await lancamento.save();
        return lancamento;
    }

    async integrarPagamento(pagamento, empresaId, usuarioId) {
        const mapCategoria = {
            'Folha Salarial': { codigo: '72.2.1', nome: 'Salários e Remunerações' },
            'Fornecedor': { codigo: '71.1.1', nome: 'Custo das Mercadorias' },
            'Manutenção': { codigo: '73.1.4', nome: 'Manutenção de Equipamento' },
            'Abastecimento': { codigo: '75.2.13', nome: 'Combustíveis' },
            'Imposto': { codigo: '77.1.1', nome: 'Impostos' }
        };
        const cat = mapCategoria[pagamento.tipo] || { codigo: '75.9.1', nome: 'Outros Custos' };
        
        let contaCusto = await PlanoContas.findOne({ empresaId, codigo: cat.codigo });
        if (!contaCusto) {
            contaCusto = new PlanoContas({
                codigo: cat.codigo, nome: cat.nome, classe: 7, nivel: 3,
                natureza: 'Devedora', empresaId, criadoPor: usuarioId, ativo: true
            });
            await contaCusto.save();
        }
        
        let contaCaixa = await PlanoContas.findOne({ empresaId, codigo: pagamento.formaPagamento === 'Transferência Bancária' ? '43.1.1' : '45.1.1' });
        if (!contaCaixa) {
            contaCaixa = new PlanoContas({
                codigo: pagamento.formaPagamento === 'Transferência Bancária' ? '43.1.1' : '45.1.1',
                nome: pagamento.formaPagamento === 'Transferência Bancária' ? 'Depósitos à Ordem' : 'Caixa',
                classe: 4, nivel: 2, natureza: 'Devedora', empresaId, criadoPor: usuarioId, ativo: true
            });
            await contaCaixa.save();
        }
        
        const lancamento = new LancamentoContabilistico({
            numeroLancamento: `PGT-${pagamento.referencia}`,
            descricao: `Pagamento ${pagamento.tipo} - ${pagamento.beneficiario}`,
            dataLancamento: new Date(pagamento.dataPagamento || pagamento.dataVencimento),
            empresaId,
            partidas: [
                { contaCodigo: contaCusto.codigo, contaDescricao: contaCusto.nome, classe: 7, debito: pagamento.valor, credito: 0, documentoOrigem: { tipo: 'Pagamento', id: pagamento._id, referencia: pagamento.referencia } },
                { contaCodigo: contaCaixa.codigo, contaDescricao: contaCaixa.nome, classe: 4, debito: 0, credito: pagamento.valor, documentoOrigem: { tipo: 'Pagamento', id: pagamento._id, referencia: pagamento.referencia } }
            ],
            totalDebito: pagamento.valor, totalCredito: pagamento.valor, status: 'Contabilizado',
            criadoPor: usuarioId, periodo: { ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 }
        });
        await lancamento.save();
        return lancamento;
    }

    async reconciliarAutomatico(empresaId, usuarioId) {
        const Venda = require('../models/Venda');
        const Pagamento = require('../models/Pagamento');
        
        const resultados = { vendas: 0, pagamentos: 0, erros: [] };
        
        const vendas = await Venda.find({ empresaId, contabilizado: { $ne: true } });
        for (const venda of vendas) {
            try { await this.integrarVenda(venda, empresaId, usuarioId); resultados.vendas++; }
            catch (e) { resultados.erros.push(`Venda ${venda.numeroFactura}: ${e.message}`); }
        }
        
        const pagamentos = await Pagamento.find({ empresaId, contabilizado: { $ne: true } });
        for (const pagamento of pagamentos) {
            try { await this.integrarPagamento(pagamento, empresaId, usuarioId); resultados.pagamentos++; }
            catch (e) { resultados.erros.push(`Pagamento ${pagamento.referencia}: ${e.message}`); }
        }
        return resultados;
    }
}

module.exports = new IntegracaoContabilistica();