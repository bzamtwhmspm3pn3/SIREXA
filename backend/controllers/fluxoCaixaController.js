// backend/controllers/fluxoCaixaController.js
const Venda = require('../models/Venda');
const Pagamento = require('../models/Pagamento');
const Transferencia = require('../models/Transferencia');
const Empresa = require('../models/Empresa');
const Banco = require('../models/Banco');
const RegistoBancario = require('../models/RegistoBancario');

const setNoCacheHeaders = (res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

// =============================================
// FUNÇÃO PARA VALIDAR ACESSO À EMPRESA
// =============================================
const validarAcessoEmpresa = (req, empresaId) => {
  const userEmpresaId = req.user?.empresaId;
  const empresasPermitidas = req.user?.empresasPermitidas || [];
  
  if (req.user?.role === 'tecnico') {
    if (empresaId !== userEmpresaId) {
      console.log(`❌ Acesso negado: Técnico ${req.user?.nome} tentou acessar empresa ${empresaId}`);
      return false;
    }
  } else if (req.user?.role === 'gestor') {
    const empresaIdStr = empresaId.toString();
    const permitidasStr = empresasPermitidas.map(id => id.toString());
    if (!permitidasStr.includes(empresaIdStr)) {
      console.log(`❌ Acesso negado: Gestor ${req.user?.nome} não tem permissão para empresa ${empresaId}`);
      console.log(`   Empresas permitidas: ${permitidasStr.join(', ')}`);
      return false;
    }
  }
  
  return true;
};

// =============================================
// AJUSTAR DATAS
// =============================================
const ajustarDataInicio = (data) => {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
};

const ajustarDataFim = (data) => {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
};

// =============================================
// CALCULAR SALDO EM CONTA BANCÁRIA
// =============================================
const calcularSaldoEmContaAteData = async (empresaId, dataLimite) => {
  try {
    const dataLimiteInicio = new Date(dataLimite);
    dataLimiteInicio.setHours(0, 0, 0, 0);
    
    const bancos = await Banco.find({ empresaId, ativo: true });
    let saldoTotalContas = 0;
    
    for (const banco of bancos) {
      const entradas = await RegistoBancario.find({
        empresaId,
        conta: banco.codNome,
        entradaSaida: 'entrada',
        data: { $lt: dataLimiteInicio }
      });
      
      const saidas = await RegistoBancario.find({
        empresaId,
        conta: banco.codNome,
        entradaSaida: 'saida',
        data: { $lt: dataLimiteInicio }
      });
      
      const totalEntradas = entradas.reduce((sum, r) => sum + (r.valor || 0), 0);
      const totalSaidas = saidas.reduce((sum, r) => sum + (r.valor || 0), 0);
      
      const saldoConta = (banco.saldoInicial || 0) + totalEntradas - totalSaidas;
      saldoTotalContas += saldoConta;
    }
    
    return saldoTotalContas;
  } catch (error) {
    console.error('Erro ao calcular saldo:', error);
    return 0;
  }
};

// =============================================
// CLASSIFICAR PAGAMENTOS
// =============================================
const classificarPagamento = (pagamento) => {
  const tipo = pagamento.tipo || '';
  const subtipo = pagamento.subtipo || '';
  const descricao = (pagamento.descricao || '').toLowerCase();
  
  if (tipo === 'Folha Salarial') {
    return { categoria: 'custosPessoal', tipo: 'Salários', subcategoria: 'salarios' };
  }
  
  if (tipo === 'Imposto' || descricao.includes('irt') || descricao.includes('inss') || descricao.includes('iva')) {
    return { categoria: 'impostos', tipo: 'Impostos', subcategoria: 'impostos' };
  }
  
  if (tipo === 'Fornecedor' || tipo === 'Abastecimento' || tipo === 'Manutenção') {
    return { categoria: 'fornecedores', tipo: tipo, subcategoria: 'fornecedores' };
  }
  
  if (tipo === 'Juros' || subtipo === 'Juros') {
    return { categoria: 'juros', tipo: 'Juros', subcategoria: 'juros' };
  }
  
  if (subtipo === 'Amortização de Empréstimos' || subtipo === 'Amortização de Locação Financeira') {
    return { categoria: 'amortizacao', tipo: 'Amortização', subcategoria: 'amortizacao' };
  }
  
  if (tipo === 'Investimento') {
    return { categoria: 'investimento', tipo: 'Investimento', subcategoria: subtipo || 'investimento' };
  }
  
  if (tipo === 'Financiamento') {
    return { categoria: 'financiamento', tipo: 'Financiamento', subcategoria: subtipo || 'financiamento' };
  }
  
  return { categoria: 'outros', tipo: 'Outros', subcategoria: 'outros' };
};

// =============================================
// CALCULAR FLUXOS DO PERÍODO
// =============================================
const calcularFluxosPeriodo = (vendas, pagamentos, transferencias, dataInicio, dataFim) => {
  const inicio = ajustarDataInicio(dataInicio);
  const fim = ajustarDataFim(dataFim);
  
  // Receitas
  const receitasPeriodo = vendas.filter(v => {
    const dataVenda = new Date(v.data);
    return dataVenda >= inicio && dataVenda <= fim;
  });
  const totalReceitas = receitasPeriodo.reduce((sum, v) => sum + (v.total || 0), 0);
  const quantidadeReceitas = receitasPeriodo.length;
  
  // Despesas
  const despesasPeriodo = pagamentos.filter(p => {
    if (p.status !== 'Pago') return false;
    if (!p.dataPagamento) return false;
    const dataPagamento = new Date(p.dataPagamento);
    return dataPagamento >= inicio && dataPagamento <= fim;
  });
  
  let custosPessoal = 0;
  let impostosPessoal = 0;
  let totalCustosPessoal = 0;
  let fornecedores = 0;
  let juros = 0;
  let impostos = 0;
  let amortizacao = 0;
  let investimento = 0;
  let financiamento = 0;
  let outros = 0;
  
  despesasPeriodo.forEach(p => {
    const valor = p.valor || 0;
    const classificacao = classificarPagamento(p);
    
    switch (classificacao.categoria) {
      case 'custosPessoal':
        custosPessoal += valor;
        totalCustosPessoal += valor;
        break;
      case 'impostos':
        const descricao = (p.descricao || '').toLowerCase();
        if (descricao.includes('irt') || descricao.includes('inss')) {
          impostosPessoal += valor;
          totalCustosPessoal += valor;
        } else {
          impostos += valor;
        }
        break;
      case 'fornecedores':
        fornecedores += valor;
        break;
      case 'juros':
        juros += valor;
        break;
      case 'amortizacao':
        amortizacao += valor;
        break;
      case 'investimento':
        investimento += valor;
        break;
      case 'financiamento':
        financiamento += valor;
        break;
      default:
        outros += valor;
    }
  });
  
  const totalDespesas = custosPessoal + impostosPessoal + fornecedores + juros + impostos + amortizacao + investimento + financiamento + outros;
  const quantidadeDespesas = despesasPeriodo.length;
  
  // Investimentos
  const investimentosPeriodo = transferencias.filter(t => {
    const dataTransf = new Date(t.data);
    return t.categoria === 'Investimento' && dataTransf >= inicio && dataTransf <= fim;
  });
  
  let investimentoReceitas = {
    recebimentos: 0,
    pagamentos: 0,
    liquido: 0,
    recebimentosCorporeas: 0,
    recebimentosIncorporeas: 0,
    recebimentosFinanceiros: 0,
    subsidios: 0,
    jurosRecebidos: 0,
    dividendosRecebidos: 0,
    pagamentosCorporeas: 0,
    pagamentosIncorporeas: 0,
    pagamentosFinanceiros: 0
  };
  
  investimentosPeriodo.forEach(t => {
    if (t.tipo === 'Entrada') {
      investimentoReceitas.recebimentos += t.valor || 0;
      if (t.subtipo === 'Imobilizações Corpóreas') investimentoReceitas.recebimentosCorporeas += t.valor;
      else if (t.subtipo === 'Imobilizações Incorpóreas') investimentoReceitas.recebimentosIncorporeas += t.valor;
      else if (t.subtipo === 'Investimentos Financeiros') investimentoReceitas.recebimentosFinanceiros += t.valor;
      else if (t.subtipo === 'Subsídios') investimentoReceitas.subsidios += t.valor;
      else if (t.subtipo === 'Juros') investimentoReceitas.jurosRecebidos += t.valor;
      else if (t.subtipo === 'Dividendos') investimentoReceitas.dividendosRecebidos += t.valor;
    } else {
      investimentoReceitas.pagamentos += t.valor || 0;
      if (t.subtipo === 'Imobilizações Corpóreas') investimentoReceitas.pagamentosCorporeas += t.valor;
      else if (t.subtipo === 'Imobilizações Incorpóreas') investimentoReceitas.pagamentosIncorporeas += t.valor;
      else if (t.subtipo === 'Investimentos Financeiros') investimentoReceitas.pagamentosFinanceiros += t.valor;
    }
  });
  
  investimentoReceitas.liquido = investimentoReceitas.recebimentos - investimentoReceitas.pagamentos;
  
  // Financiamentos
  const financiamentosPeriodo = transferencias.filter(t => {
    const dataTransf = new Date(t.data);
    return t.categoria === 'Financiamento' && dataTransf >= inicio && dataTransf <= fim;
  });
  
  let financiamentoReceitas = {
    recebimentos: 0,
    pagamentos: 0,
    liquido: 0,
    aumentosCapital: 0,
    coberturaPrejuizos: 0,
    emprestimosRecebidos: 0,
    subsidiosExploracao: 0,
    reducoesCapital: 0,
    comprasAcoes: 0,
    dividendosPagos: 0,
    amortizacaoEmprestimos: 0,
    amortizacaoLocacao: 0
  };
  
  financiamentosPeriodo.forEach(t => {
    if (t.tipo === 'Entrada') {
      financiamentoReceitas.recebimentos += t.valor || 0;
      if (t.subtipo === 'Aumentos de Capital') financiamentoReceitas.aumentosCapital += t.valor;
      else if (t.subtipo === 'Cobertura de Prejuízos') financiamentoReceitas.coberturaPrejuizos += t.valor;
      else if (t.subtipo === 'Empréstimos') financiamentoReceitas.emprestimosRecebidos += t.valor;
      else if (t.subtipo === 'Subsídios à Exploração') financiamentoReceitas.subsidiosExploracao += t.valor;
    } else {
      financiamentoReceitas.pagamentos += t.valor || 0;
      if (t.subtipo === 'Reduções de Capital') financiamentoReceitas.reducoesCapital += t.valor;
      else if (t.subtipo === 'Compras de Ações') financiamentoReceitas.comprasAcoes += t.valor;
      else if (t.subtipo === 'Dividendos') financiamentoReceitas.dividendosPagos += t.valor;
      else if (t.subtipo === 'Amortização de Empréstimos') financiamentoReceitas.amortizacaoEmprestimos += t.valor;
      else if (t.subtipo === 'Amortização de Locação Financeira') financiamentoReceitas.amortizacaoLocacao += t.valor;
    }
  });
  
  financiamentoReceitas.liquido = financiamentoReceitas.recebimentos - financiamentoReceitas.pagamentos;
  
  // Indicadores
  const caixaGeradaOperacoes = totalReceitas - fornecedores;
  const caixaLiquidaOperacional = caixaGeradaOperacoes - (custosPessoal + impostosPessoal + juros + impostos + amortizacao + investimento + financiamento);
  const aumentoLiquido = caixaLiquidaOperacional + investimentoReceitas.liquido + financiamentoReceitas.liquido;
  
  return {
    receitas: { total: totalReceitas, quantidade: quantidadeReceitas, itens: receitasPeriodo },
    despesas: {
      total: totalDespesas,
      quantidade: quantidadeDespesas,
      porCategoria: { 
        custosPessoal,
        impostosPessoal,
        totalCustosPessoal,
        fornecedores,
        juros,
        impostos,
        amortizacao,
        investimento,
        financiamento,
        outros
      },
      itens: despesasPeriodo
    },
    investimento: investimentoReceitas,
    financiamento: financiamentoReceitas,
    caixaGeradaOperacoes,
    caixaLiquidaOperacional,
    aumentoLiquido
  };
};

// =============================================
// FUNÇÃO PRINCIPAL - CALCULAR FLUXO DE CAIXA
// =============================================
exports.calcularFluxoCaixa = async (req, res) => {
  setNoCacheHeaders(res);
  
  try {
    const { empresaId, periodo, ano, mes } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    }
    
    // VALIDAÇÃO DE ACESSO
    if (!validarAcessoEmpresa(req, empresaId)) {
      return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado' });
    }
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
    }
    
    console.log(`\n📅 Calculando fluxo de caixa para ${empresa.nome} (${empresaId})`);
    console.log(`   Usuário: ${req.user?.nome} (${req.user?.role})`);
    
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes);
    
    let dataInicio, dataFim, periodoNome;
    
    if (periodo === "mensal") {
      dataInicio = new Date(anoNum, mesNum - 1, 1);
      dataFim = new Date(anoNum, mesNum, 0);
      const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      periodoNome = meses[mesNum - 1];
    } else if (periodo === "bimestral") {
      const bimestre = Math.ceil(mesNum / 2);
      dataInicio = new Date(anoNum, (bimestre - 1) * 2, 1);
      dataFim = new Date(anoNum, bimestre * 2, 0);
      periodoNome = `${bimestre}º Bimestre`;
    } else if (periodo === "trimestral") {
      const trimestre = Math.ceil(mesNum / 3);
      dataInicio = new Date(anoNum, (trimestre - 1) * 3, 1);
      dataFim = new Date(anoNum, trimestre * 3, 0);
      periodoNome = `${trimestre}º Trimestre`;
    } else if (periodo === "semestral") {
      const semestre = Math.ceil(mesNum / 6);
      dataInicio = new Date(anoNum, (semestre - 1) * 6, 1);
      dataFim = new Date(anoNum, semestre * 6, 0);
      periodoNome = `${semestre}º Semestre`;
    } else {
      dataInicio = new Date(anoNum, 0, 1);
      dataFim = new Date(anoNum, 11, 31);
      periodoNome = `Ano ${anoNum}`;
    }
    
    console.log(`   Período: ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`);
    
    const [vendas, pagamentos, transferencias] = await Promise.all([
      Venda.find({ empresaId, status: 'finalizada' }).lean(),
      Pagamento.find({ empresaId }).lean(),
      Transferencia.find({ empresaId }).lean()
    ]);
    
    console.log(`   Vendas: ${vendas.length} | Pagamentos: ${pagamentos.length} | Transferências: ${transferencias.length}`);
    
    const saldoInicial = await calcularSaldoEmContaAteData(empresaId, dataInicio);
    console.log(`   Saldo Inicial: ${saldoInicial.toLocaleString()} Kz`);
    
    const fluxos = calcularFluxosPeriodo(vendas, pagamentos, transferencias, dataInicio, dataFim);
    
    console.log(`\n📊 FLUXOS DO PERÍODO:`);
    console.log(`   Receitas: ${fluxos.receitas.total.toLocaleString()} Kz`);
    console.log(`   Despesas: ${fluxos.despesas.total.toLocaleString()} Kz`);
    console.log(`      - Salários: ${fluxos.despesas.porCategoria.custosPessoal.toLocaleString()} Kz`);
    console.log(`      - Impostos sobre Salários: ${fluxos.despesas.porCategoria.impostosPessoal.toLocaleString()} Kz`);
    console.log(`      - Total Custos Pessoal: ${fluxos.despesas.porCategoria.totalCustosPessoal.toLocaleString()} Kz`);
    console.log(`      - Fornecedores: ${fluxos.despesas.porCategoria.fornecedores.toLocaleString()} Kz`);
    console.log(`      - Juros: ${fluxos.despesas.porCategoria.juros.toLocaleString()} Kz`);
    console.log(`      - Impostos: ${fluxos.despesas.porCategoria.impostos.toLocaleString()} Kz`);
    
    const saldoFinal = saldoInicial + fluxos.aumentoLiquido;
    const margemOperacional = fluxos.receitas.total > 0 ? (fluxos.caixaLiquidaOperacional / fluxos.receitas.total) * 100 : 0;
    const taxaCrescimento = saldoInicial !== 0 ? (fluxos.aumentoLiquido / Math.abs(saldoInicial)) * 100 : 0;
    
    res.json({
      sucesso: true,
      dados: {
        periodo: { nome: periodoNome, ano: anoNum, mes: mesNum, inicio: dataInicio, fim: dataFim },
        empresa: { id: empresaId, nome: empresa.nome, nif: empresa.nif },
        saldoInicial,
        saldoFinal,
        aumentoLiquido: fluxos.aumentoLiquido,
        receitas: fluxos.receitas,
        despesas: fluxos.despesas,
        investimento: fluxos.investimento,
        financiamento: fluxos.financiamento,
        indicadores: {
          caixaGeradaOperacoes: fluxos.caixaGeradaOperacoes,
          caixaLiquidaOperacional: fluxos.caixaLiquidaOperacional,
          margemOperacional: margemOperacional.toFixed(2),
          taxaCrescimento: taxaCrescimento.toFixed(2)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// =============================================
// OBTER SALDO ACUMULADO
// =============================================
exports.getSaldoAcumulado = async (req, res) => {
  setNoCacheHeaders(res);
  try {
    const { empresaId, data } = req.query;
    if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    
    if (!validarAcessoEmpresa(req, empresaId)) {
      return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado' });
    }
    
    const dataLimite = data ? new Date(data) : new Date();
    const saldo = await calcularSaldoEmContaAteData(empresaId, dataLimite);
    
    res.json({ sucesso: true, dados: { data: dataLimite, saldo, formatado: saldo.toLocaleString('pt-AO') } });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// =============================================
// OBTER HISTÓRICO MENSAL
// =============================================
exports.getHistorico = async (req, res) => {
  setNoCacheHeaders(res);
  try {
    const { empresaId, ano } = req.query;
    if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    
    if (!validarAcessoEmpresa(req, empresaId)) {
      return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado' });
    }
    
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();
    const vendas = await Venda.find({ empresaId, status: 'finalizada' }).lean();
    const pagamentos = await Pagamento.find({ empresaId }).lean();
    
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const historico = [];
    
    let saldoAcumulado = await calcularSaldoEmContaAteData(empresaId, new Date(anoAtual, 0, 1));
    
    for (let i = 1; i <= 12; i++) {
      const dataInicio = new Date(anoAtual, i - 1, 1);
      const dataFim = new Date(anoAtual, i, 0);
      
      const receitasMes = vendas.filter(v => new Date(v.data) >= dataInicio && new Date(v.data) <= dataFim);
      const despesasMes = pagamentos.filter(p => p.status === 'Pago' && p.dataPagamento && new Date(p.dataPagamento) >= dataInicio && new Date(p.dataPagamento) <= dataFim);
      
      const totalReceitas = receitasMes.reduce((sum, v) => sum + (v.total || 0), 0);
      const totalDespesas = despesasMes.reduce((sum, p) => sum + (p.valor || 0), 0);
      const saldoFinal = saldoAcumulado + totalReceitas - totalDespesas;
      
      historico.push({
        mes: i,
        nome: meses[i - 1],
        saldoInicial: saldoAcumulado,
        totalReceitas,
        totalDespesas,
        saldoFinal,
        quantidadeReceitas: receitasMes.length,
        quantidadeDespesas: despesasMes.length
      });
      
      saldoAcumulado = saldoFinal;
    }
    
    res.json({ sucesso: true, dados: historico });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};