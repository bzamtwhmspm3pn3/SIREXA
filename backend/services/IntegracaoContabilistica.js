// backend/services/IntegracaoContabilistica.js
// Partidas dobradas automáticas conforme PGCA (Angola)
// Toda a movimentação financeira gera Débito/Crédito sem intervenção manual

const LancamentoContabilistico = require('../models/LancamentoContabilistico');
const PlanoContas = require('../models/PlanoContas');

class IntegracaoContabilistica {

  async obterConta(empresaId, codigo, nome, classe, natureza, usuarioId) {
    let conta = await PlanoContas.findOne({ empresaId, codigo });
    if (!conta) {
      conta = new PlanoContas({
        codigo, nome, classe, nivel: codigo.split('.').length,
        natureza, empresaId, criadoPor: usuarioId, ativo: true
      });
      await conta.save();
    }
    return conta;
  }

  // =========================================================================
  // VENDA
  // =========================================================================
  // Venda a pronto (Dinheiro):   Débito 45.1.1 Caixa     | Crédito 61.1.1 Vendas
  // Venda a crédito (prazo):     Débito 31.1.2.1 Clientes  | Crédito 61.1.1 Vendas
  // Prest. Serviço (pronto):     Débito 45.1.1 Caixa     | Crédito 62.1.1 Serviços
  // Prest. Serviço (crédito):    Débito 31.1.2.1 Clientes  | Crédito 62.1.1 Serviços
  // =========================================================================
  async integrarVenda(venda, empresaId, usuarioId) {
    const isServico = venda.tipoFactura === 'Prestação de Serviço';
    const isCash = venda.formaPagamento === 'Dinheiro';
    const codVenda = isServico ? '62.1.1' : '61.1.1';
    const nomeVenda = isServico ? 'Prestações de Serviços' : 'Vendas - Mercado Nacional';
    const contaVenda = await this.obterConta(empresaId, codVenda, nomeVenda, 6, 'Credora', usuarioId);

    if (isCash) {
      const contaCaixa = await this.obterConta(empresaId, '45.1.1', 'Caixa', 4, 'Devedora', usuarioId);
      const lancamento = new LancamentoContabilistico({
        numeroLancamento: `VND-CASH-${venda.numeroFactura}`,
        descricao: `Venda a Pronto Pagamento #${venda.numeroFactura} - ${venda.cliente}`,
        dataLancamento: new Date(venda.data),
        empresaId,
        partidas: [
          { contaCodigo: contaCaixa.codigo, contaDescricao: contaCaixa.nome, classe: 4, debito: venda.total, credito: 0, documentoOrigem: { tipo: 'Venda', id: venda._id, referencia: venda.numeroFactura } },
          { contaCodigo: contaVenda.codigo, contaDescricao: contaVenda.nome, classe: 6, debito: 0, credito: venda.total, documentoOrigem: { tipo: 'Venda', id: venda._id, referencia: venda.numeroFactura } }
        ],
        totalDebito: venda.total, totalCredito: venda.total, status: 'Contabilizado',
        criadoPor: usuarioId, periodo: { ano: new Date(venda.data).getFullYear(), mes: new Date(venda.data).getMonth() + 1 }
      });
      await lancamento.save();
      return lancamento;
    }

    // Venda a crédito
    const contaCliente = await this.obterConta(empresaId, '31.1.2.1', 'Clientes Nacionais', 3, 'Devedora', usuarioId);
    const lancamento = new LancamentoContabilistico({
      numeroLancamento: `VND-${venda.numeroFactura}`,
      descricao: `Venda a Crédito #${venda.numeroFactura} - ${venda.cliente}`,
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

  // =========================================================================
  // PAGAMENTO / RECEBIMENTO
  // =========================================================================
  // Conta a Receber (cliente paga):   Débito 43.1.1 Depósitos   | Crédito 31.1.2.1 Clientes
  // Fornecedor (pagamos):             Débito 32.1.2.1 Forn.     | Crédito 43.1.1 Depósitos
  // Salários:                          Débito 72.2.1 Salários    | Crédito 43.1.1 Depósitos
  // Manutenção:                        Débito 73.1.4 Manut.      | Crédito 43.1.1 Depósitos
  // Abastecimento:                     Débito 75.2.13 Comb.      | Crédito 43.1.1 Depósitos
  // Imposto:                           Débito 77.1.1 Imp.        | Crédito 43.1.1 Depósitos
  // Outros:                            Débito 75.9.1 Outros      | Crédito 43.1.1 Depósitos
  // Apenas Dinheiro físico usa Caixa (45.1.1)
  // =========================================================================
  async integrarPagamento(pagamento, empresaId, usuarioId) {
    const codCaixa = pagamento.formaPagamento === 'Dinheiro' ? '45.1.1' : '43.1.1';
    const nomeCaixa = pagamento.formaPagamento === 'Dinheiro' ? 'Caixa' : 'Depósitos à Ordem';

    if (pagamento.tipo === 'Conta a Receber') {
      // RECEBIMENTO: dinheiro entra, a dívida do cliente diminui
      const contaCaixa = await this.obterConta(empresaId, codCaixa, nomeCaixa, 4, 'Devedora', usuarioId);
      const contaCliente = await this.obterConta(empresaId, '31.1.2.1', 'Clientes Nacionais', 3, 'Devedora', usuarioId);

      const lancamento = new LancamentoContabilistico({
        numeroLancamento: `REC-${pagamento.referencia}`,
        descricao: `Recebimento - ${pagamento.beneficiario}`,
        dataLancamento: new Date(pagamento.dataPagamento || pagamento.dataVencimento),
        empresaId,
        partidas: [
          { contaCodigo: contaCaixa.codigo, contaDescricao: contaCaixa.nome, classe: 4, debito: pagamento.valor, credito: 0, documentoOrigem: { tipo: 'Pagamento', id: pagamento._id, referencia: pagamento.referencia } },
          { contaCodigo: contaCliente.codigo, contaDescricao: contaCliente.nome, classe: 3, debito: 0, credito: pagamento.valor, documentoOrigem: { tipo: 'Pagamento', id: pagamento._id, referencia: pagamento.referencia } }
        ],
        totalDebito: pagamento.valor, totalCredito: pagamento.valor, status: 'Contabilizado',
        criadoPor: usuarioId, periodo: { ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 }
      });
      await lancamento.save();
      return lancamento;
    }

    // PAGAMENTO (despesa): custo reconhecido, dinheiro sai
    const mapCategoria = {
      'Folha Salarial': { codigo: '72.2.1', nome: 'Salários e Remunerações', classe: 7 },
      'Fornecedor': { codigo: '32.1.2.1', nome: 'Fornecedores', classe: 3 },
      'Manutenção': { codigo: '73.1.4', nome: 'Manutenção', classe: 7 },
      'Abastecimento': { codigo: '75.2.13', nome: 'Combustíveis', classe: 7 },
      'Imposto': { codigo: '77.1.1', nome: 'Impostos', classe: 7 },
      'Aluguer': { codigo: '75.2.21', nome: 'Rendas e Alugueres', classe: 7 },
      'Juros': { codigo: '76.1.2', nome: 'Juros Suportados', classe: 7 }
    };
    const cat = mapCategoria[pagamento.tipo] || { codigo: '75.9.1', nome: 'Outros Custos', classe: 7 };

    const contaDebito = await this.obterConta(empresaId, cat.codigo, cat.nome, cat.classe, 'Devedora', usuarioId);
    const contaCaixa = await this.obterConta(empresaId, codCaixa, nomeCaixa, 4, 'Devedora', usuarioId);

    const lancamento = new LancamentoContabilistico({
      numeroLancamento: `PGT-${pagamento.referencia}`,
      descricao: `Pagamento ${pagamento.tipo} - ${pagamento.beneficiario}`,
      dataLancamento: new Date(pagamento.dataPagamento || pagamento.dataVencimento),
      empresaId,
      partidas: [
        { contaCodigo: contaDebito.codigo, contaDescricao: contaDebito.nome, classe: cat.classe, debito: pagamento.valor, credito: 0, documentoOrigem: { tipo: 'Pagamento', id: pagamento._id, referencia: pagamento.referencia } },
        { contaCodigo: contaCaixa.codigo, contaDescricao: contaCaixa.nome, classe: 4, debito: 0, credito: pagamento.valor, documentoOrigem: { tipo: 'Pagamento', id: pagamento._id, referencia: pagamento.referencia } }
      ],
      totalDebito: pagamento.valor, totalCredito: pagamento.valor, status: 'Contabilizado',
      criadoPor: usuarioId, periodo: { ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 }
    });
    await lancamento.save();
    return lancamento;
  }

  // =========================================================================
  // RECONCILIAÇÃO AUTOMÁTICA (sincronizar lançamentos pendentes)
  // =========================================================================
  async reconciliarAutomatico(empresaId, usuarioId) {
    const Venda = require('../models/Venda');
    const Pagamento = require('../models/Pagamento');

    const resultados = { vendas: 0, pagamentos: 0, erros: [] };

    const vendas = await Venda.find({ empresaId, contabilizado: { $ne: true } });
    for (const venda of vendas) {
      try {
        await this.integrarVenda(venda, empresaId, usuarioId);
        venda.contabilizado = true;
        await venda.save();
        resultados.vendas++;
      } catch (e) {
        resultados.erros.push(`Venda ${venda.numeroFactura}: ${e.message}`);
      }
    }

    const pagamentos = await Pagamento.find({ empresaId, contabilizado: { $ne: true }, status: 'Pago' });
    for (const pagamento of pagamentos) {
      try {
        await this.integrarPagamento(pagamento, empresaId, usuarioId);
        pagamento.contabilizado = true;
        await pagamento.save();
        resultados.pagamentos++;
      } catch (e) {
        resultados.erros.push(`Pagamento ${pagamento.referencia}: ${e.message}`);
      }
    }
    return resultados;
  }
}

module.exports = new IntegracaoContabilistica();
