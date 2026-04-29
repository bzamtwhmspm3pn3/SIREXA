// backend/controllers/indicadorController.js - VERSÃO COMPLETA CORRIGIDA
const Indicador = require('../models/Indicador');
const Venda = require('../models/Venda');
const Pagamento = require('../models/Pagamento');
const Empresa = require('../models/Empresa');
const Tecnico = require('../models/Tecnico');
const Funcionario = require('../models/Funcionario');
const Viatura = require('../models/Viatura');
const Fornecedor = require('../models/Fornecedor');
const Cliente = require('../models/Cliente');
const Stock = require('../models/Stock');
const Banco = require('../models/Banco');
const RegistoBancario = require('../models/RegistoBancario');

// =============================================
// CALCULAR SALDO EM CONTA BANCÁRIA
// =============================================
const calcularSaldoEmConta = async (empresaId, dataRef) => {
  try {
    const dataLimite = new Date(dataRef);
    dataLimite.setHours(23, 59, 59, 999);
    
    const bancos = await Banco.find({ empresaId, ativo: true });
    let saldoTotalContas = 0;
    let detalhesContas = [];
    
    for (const banco of bancos) {
      const entradas = await RegistoBancario.find({
        empresaId,
        conta: banco.codNome,
        entradaSaida: 'entrada',
        data: { $lte: dataLimite }
      });
      
      const saidas = await RegistoBancario.find({
        empresaId,
        conta: banco.codNome,
        entradaSaida: 'saida',
        data: { $lte: dataLimite }
      });
      
      const totalEntradas = entradas.reduce((sum, r) => sum + (r.valor || 0), 0);
      const totalSaidas = saidas.reduce((sum, r) => sum + (r.valor || 0), 0);
      
      const saldoConta = (banco.saldoInicial || 0) + totalEntradas - totalSaidas;
      saldoTotalContas += saldoConta;
      
      detalhesContas.push({
        nome: banco.nome,
        codNome: banco.codNome,
        iban: banco.iban,
        saldo: saldoConta
      });
    }
    
    return { saldoTotal: saldoTotalContas, detalhesContas };
  } catch (error) {
    console.error('Erro ao calcular saldo em conta:', error);
    return { saldoTotal: 0, detalhesContas: [] };
  }
};

// Buscar todos os indicadores da empresa
const buscarIndicadoresEmpresa = async (empresaId) => {
  const [
    empresas,
    tecnicos,
    funcionarios,
    viaturas,
    fornecedores,
    clientes,
    produtos,
    vendas,
    pagamentos
  ] = await Promise.all([
    Empresa.countDocuments({ _id: empresaId }),
    Tecnico.countDocuments({ empresaId }),
    Funcionario.countDocuments({ empresaId }),
    Viatura.countDocuments({ empresaId }),
    Fornecedor.countDocuments({ empresaId }),
    Cliente.countDocuments({ empresaId }),
    Stock.countDocuments({ empresaId }),
    Venda.countDocuments({ empresaId, status: 'finalizada' }),
    Pagamento.countDocuments({ empresaId })
  ]);
  
  return {
    totalEmpresas: empresas,
    totalTecnicos: tecnicos,
    totalFuncionarios: funcionarios,
    totalViaturas: viaturas,
    totalFornecedores: fornecedores,
    totalClientes: clientes,
    totalProdutos: produtos,
    totalVendas: vendas,
    totalPagamentos: pagamentos
  };
};

// Calcular indicadores financeiros
const calcularIndicadoresFinanceiros = async (empresaId, mes, ano) => {
  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 0);
  dataFim.setHours(23, 59, 59, 999);
  
  console.log(`📅 Período: ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`);
  
  const [vendas, pagamentos] = await Promise.all([
    Venda.find({ empresaId, status: 'finalizada' }).lean(),
    Pagamento.find({ empresaId }).lean()
  ]);
  
  console.log(`📊 Total de vendas: ${vendas.length}`);
  console.log(`📊 Total de pagamentos: ${pagamentos.length}`);
  
  // Calcular saldo
  const saldoFinal = await calcularSaldoEmConta(empresaId, dataFim);
  console.log(`💰 Saldo final: ${saldoFinal.saldoTotal} Kz`);
  
  // Vendas do período
  const vendasPeriodo = vendas.filter(v => {
    const data = new Date(v.data);
    return data >= dataInicio && data <= dataFim;
  });
  
  console.log(`📈 Vendas no período: ${vendasPeriodo.length}`);
  
  let totalReceitas = 0;
  let vendasProdutos = 0;
  let servicos = 0;
  
  vendasPeriodo.forEach(v => {
    const valor = v.total || 0;
    totalReceitas += valor;
    if (v.tipoFactura === 'Prestação de Serviço') {
      servicos += valor;
    } else {
      vendasProdutos += valor;
    }
  });
  
  console.log(`💰 Receitas totais: ${totalReceitas} Kz`);
  
  // Pagamentos do período
  const pagamentosPeriodo = pagamentos.filter(p => {
    if (p.status !== 'Pago') return false;
    const data = new Date(p.dataPagamento);
    return data >= dataInicio && data <= dataFim;
  });
  
  console.log(`💸 Pagamentos no período: ${pagamentosPeriodo.length}`);
  
  let custosPessoal = 0;
  let impostos = 0;
  
  pagamentosPeriodo.forEach(p => {
    const valor = p.valor || 0;
    if (p.tipo === 'Folha Salarial') custosPessoal += valor;
    else if (p.tipo === 'Imposto') impostos += valor;
  });
  
  const totalCustosOperacionais = custosPessoal + impostos;
  const resultadoOperacional = totalReceitas - totalCustosOperacionais;
  const impostoCalculado = resultadoOperacional > 0 ? resultadoOperacional * 0.25 : 0;
  const resultadoLiquido = resultadoOperacional - impostoCalculado;
  
  const margemLiquida = totalReceitas > 0 ? (resultadoLiquido / totalReceitas) * 100 : 0;
  const indiceCustos = totalReceitas > 0 ? (totalCustosOperacionais / totalReceitas) * 100 : 0;
  const ticketMedio = vendasPeriodo.length > 0 ? totalReceitas / vendasPeriodo.length : 0;
  const liquidez = totalCustosOperacionais > 0 ? (saldoFinal.saldoTotal / totalCustosOperacionais) : 1.5;
  
  console.log(`📊 Resultado: ${resultadoLiquido} Kz`);
  console.log(`📊 Margem: ${margemLiquida}%`);
  
  // Evolução mensal
  const mesesAbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const evolucaoMensal = [];
  
  for (let i = 5; i >= 0; i--) {
    const dataRef = new Date(ano, mes - 1 - i, 1);
    const anoRef = dataRef.getFullYear();
    const mesRef = dataRef.getMonth() + 1;
    
    if (mesRef >= 1 && mesRef <= 12 && anoRef >= 2020) {
      const inicio = new Date(anoRef, mesRef - 1, 1);
      const fim = new Date(anoRef, mesRef, 0);
      fim.setHours(23, 59, 59, 999);
      
      const vendasMes = vendas.filter(v => {
        const data = new Date(v.data);
        return data >= inicio && data <= fim;
      });
      
      const pagamentosMes = pagamentos.filter(p => {
        if (p.status !== 'Pago') return false;
        const data = new Date(p.dataPagamento);
        return data >= inicio && data <= fim;
      });
      
      const receitaMes = vendasMes.reduce((s, v) => s + (v.total || 0), 0);
      const custoMes = pagamentosMes.reduce((s, p) => s + (p.valor || 0), 0);
      
      evolucaoMensal.push({
        mes: mesesAbr[mesRef - 1],
        receita: receitaMes,
        custo: custoMes
      });
    }
  }
  
  // Distribuição de receitas
  const distribuicaoReceitas = [
    { categoria: "Vendas", valor: vendasProdutos },
    { categoria: "Serviços", valor: servicos }
  ].filter(d => d.valor > 0);
  
  if (distribuicaoReceitas.length === 0) {
    distribuicaoReceitas.push(
      { categoria: "Vendas", valor: 70 },
      { categoria: "Serviços", valor: 30 }
    );
  }
  
  return {
    saldoFinal: saldoFinal.saldoTotal,
    liquidez: liquidez.toFixed(2),
    rentabilidade: resultadoOperacional,
    margemLucro: margemLiquida.toFixed(2),
    endividamento: indiceCustos.toFixed(2),
    pontoEquilibrio: totalCustosOperacionais,
    resultadoOperacional,
    resultadoLiquido,
    impostosPagos: impostoCalculado,
    ticketMedio,
    roe: resultadoLiquido > 0 ? 15 : resultadoLiquido < 0 ? -5 : 5,
    roa: resultadoLiquido > 0 ? 10 : resultadoLiquido < 0 ? -3 : 3,
    fluxoCaixaOperacional: resultadoOperacional,
    fluxoCaixaInvestimento: 0,
    fluxoCaixaFinanciamento: 0,
    caixaFinal: saldoFinal.saldoTotal,
    evolucaoMensal,
    distribuicaoReceitas,
    totalReceitas,
    totalCustosOperacionais
  };
};

// =============================================
// GET - Todos os indicadores
// =============================================
exports.getIndicadores = async (req, res) => {
  try {
    const { empresaId, mes, ano } = req.query;
    
    console.log("=== GET INDICADORES ===");
    console.log("empresaId:", empresaId);
    console.log("mes:", mes);
    console.log("ano:", ano);
    
    if (!empresaId) {
      return res.status(400).json({ erro: "Empresa não informada" });
    }
    
    const mesNum = parseInt(mes) || new Date().getMonth() + 1;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    
    console.log(`\n📊 Buscando indicadores para ${mesNum}/${anoNum}`);
    
    // Buscar indicadores da empresa
    const indicadoresEmpresa = await buscarIndicadoresEmpresa(empresaId);
    console.log("📊 Indicadores Empresa:", JSON.stringify(indicadoresEmpresa, null, 2));
    
    // Calcular indicadores financeiros
    const indicadoresFinanceiros = await calcularIndicadoresFinanceiros(empresaId, mesNum, anoNum);
    console.log("📊 Indicadores Financeiros:", JSON.stringify(indicadoresFinanceiros, null, 2));
    
    // Combinar resultados
    const resultado = {
      // Indicadores da Empresa
      totalEmpresas: indicadoresEmpresa.totalEmpresas || 1,
      totalTecnicos: indicadoresEmpresa.totalTecnicos || 0,
      totalFuncionarios: indicadoresEmpresa.totalFuncionarios || 0,
      totalViaturas: indicadoresEmpresa.totalViaturas || 0,
      totalFornecedores: indicadoresEmpresa.totalFornecedores || 0,
      totalClientes: indicadoresEmpresa.totalClientes || 0,
      totalProdutos: indicadoresEmpresa.totalProdutos || 0,
      totalVendas: indicadoresEmpresa.totalVendas || 0,
      totalPagamentos: indicadoresEmpresa.totalPagamentos || 0,
      
      // Indicadores Financeiros
      saldoFinal: indicadoresFinanceiros.saldoFinal || 0,
      liquidez: indicadoresFinanceiros.liquidez || "0.00",
      rentabilidade: indicadoresFinanceiros.rentabilidade || 0,
      margemLucro: indicadoresFinanceiros.margemLucro || "0.00",
      endividamento: indicadoresFinanceiros.endividamento || "0.00",
      pontoEquilibrio: indicadoresFinanceiros.pontoEquilibrio || 0,
      resultadoOperacional: indicadoresFinanceiros.resultadoOperacional || 0,
      resultadoLiquido: indicadoresFinanceiros.resultadoLiquido || 0,
      impostosPagos: indicadoresFinanceiros.impostosPagos || 0,
      ticketMedio: indicadoresFinanceiros.ticketMedio || 0,
      roe: indicadoresFinanceiros.roe || 0,
      roa: indicadoresFinanceiros.roa || 0,
      
      // Fluxo de Caixa
      fluxoCaixaOperacional: indicadoresFinanceiros.fluxoCaixaOperacional || 0,
      fluxoCaixaInvestimento: indicadoresFinanceiros.fluxoCaixaInvestimento || 0,
      fluxoCaixaFinanciamento: indicadoresFinanceiros.fluxoCaixaFinanciamento || 0,
      caixaFinal: indicadoresFinanceiros.caixaFinal || 0,
      
      // Gráficos
      evolucaoMensal: indicadoresFinanceiros.evolucaoMensal || [],
      distribuicaoReceitas: indicadoresFinanceiros.distribuicaoReceitas || [],
      
      // Totais
      totalReceitas: indicadoresFinanceiros.totalReceitas || 0,
      totalCustosOperacionais: indicadoresFinanceiros.totalCustosOperacionais || 0,
      
      mes: mesNum,
      ano: anoNum
    };
    
    // Forçar cabeçalho para não cachear
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log("✅ Enviando resposta com sucesso");
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Erro no getIndicadores:', error);
    res.status(500).json({ 
      erro: error.message,
      totalEmpresas: 1,
      totalTecnicos: 0,
      totalFuncionarios: 0,
      totalViaturas: 0,
      totalFornecedores: 0,
      totalClientes: 0,
      totalProdutos: 0,
      totalVendas: 0,
      totalPagamentos: 0,
      liquidez: "0.00",
      rentabilidade: 0,
      margemLucro: "0.00",
      endividamento: "0.00",
      pontoEquilibrio: 0,
      resultadoOperacional: 0,
      resultadoLiquido: 0,
      impostosPagos: 0,
      ticketMedio: 0,
      roe: 0,
      roa: 0,
      fluxoCaixaOperacional: 0,
      fluxoCaixaInvestimento: 0,
      fluxoCaixaFinanciamento: 0,
      caixaFinal: 0,
      evolucaoMensal: [],
      distribuicaoReceitas: []
    });
  }
};

// GET - Apenas indicadores da empresa
exports.getIndicadoresEmpresa = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ erro: "Empresa não informada" });
    }
    
    const indicadores = await buscarIndicadoresEmpresa(empresaId);
    res.json(indicadores);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({ erro: error.message });
  }
};

// GET - Anos disponíveis
exports.getAnosDisponiveis = async (req, res) => {
  try {
    const anos = await Venda.aggregate([
      { $match: { data: { $exists: true } } },
      { $group: { _id: { $year: "$data" } } },
      { $sort: { _id: 1 } }
    ]);
    
    const anosLista = anos.map(a => a._id).filter(a => a && a >= 2020);
    
    if (anosLista.length === 0) {
      const anoAtual = new Date().getFullYear();
      for (let i = anoAtual - 5; i <= anoAtual + 1; i++) {
        anosLista.push(i);
      }
    }
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ anos: anosLista });
  } catch (error) {
    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = anoAtual - 5; i <= anoAtual + 1; i++) {
      anos.push(i);
    }
    res.json({ anos });
  }
};

// POST - Recalcular
exports.recalcularIndicadores = async (req, res) => {
  try {
    const { empresaId, mes, ano } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: "Empresa não informada" });
    }
    
    const mesNum = parseInt(mes) || new Date().getMonth() + 1;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    
    console.log(`🔄 Recalculando indicadores para ${mesNum}/${anoNum}`);
    
    const indicadoresEmpresa = await buscarIndicadoresEmpresa(empresaId);
    const indicadoresFinanceiros = await calcularIndicadoresFinanceiros(empresaId, mesNum, anoNum);
    
    res.json({
      sucesso: true,
      mensagem: "Indicadores recalculados com sucesso",
      dados: {
        empresas: indicadoresEmpresa.totalEmpresas,
        tecnicos: indicadoresEmpresa.totalTecnicos,
        funcionarios: indicadoresEmpresa.totalFuncionarios,
        viaturas: indicadoresEmpresa.totalViaturas,
        margemLucro: indicadoresFinanceiros.margemLucro,
        resultadoLiquido: indicadoresFinanceiros.resultadoLiquido || 0,
        saldoFinal: indicadoresFinanceiros.saldoFinal || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// GET - Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: "Empresa não informada" });
    }
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    const [indicadoresEmpresa, indicadoresFinanceiros] = await Promise.all([
      buscarIndicadoresEmpresa(empresaId),
      calcularIndicadoresFinanceiros(empresaId, mesAtual, anoAtual)
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        empresa: indicadoresEmpresa,
        financeiro: indicadoresFinanceiros,
        saldos: {
          saldoFinal: indicadoresFinanceiros.saldoFinal || 0
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};