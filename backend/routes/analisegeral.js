// backend/routes/analisegeral.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');

// Importar modelos necessários
const Venda = require('../models/Venda');
const Pagamento = require('../models/Pagamento');
const Transferencia = require('../models/Transferencia');
const Empresa = require('../models/Empresa');
const Funcionario = require('../models/Funcionario');
const Fornecedor = require('../models/Fornecedor');
const Cliente = require('../models/Cliente');
const Stock = require('../models/Stock');
const Abastecimento = require('../models/Abastecimento');
const Manutencao = require('../models/Manutencao');
const Viatura = require('../models/Viatura');
const Tecnico = require('../models/Tecnico');
const Banco = require('../models/Banco');
const RegistoBancario = require('../models/RegistoBancario');

router.use(verifyToken);

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// ============================================
// FUNÇÃO PARA CALCULAR SALDO EM CONTA BANCÁRIA
// ============================================
const calcularSaldoEmConta = async (empresaId, dataRef) => {
  try {
    const dataLimite = new Date(dataRef);
    dataLimite.setHours(23, 59, 59, 999);
    
    const bancos = await Banco.find({ empresaId, ativo: true });
    let saldoTotalContas = 0;
    let detalhesContas = [];
    
    for (const banco of bancos) {
      // APENAS REGISTOS BANCÁRIOS (sem transferências)
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

// ============================================
// BUSCAR INDICADORES DA EMPRESA - CORRIGIDO
// ============================================
const buscarIndicadoresEmpresa = async (empresaId) => {
  // Buscar funcionários (colaboradores) - CORREÇÃO PRINCIPAL
  const funcionarios = await Funcionario.find({ empresaId });
  const totalFuncionarios = funcionarios.length;
  
  // Log para debug
  console.log(`   👥 Funcionários encontrados: ${totalFuncionarios}`);
  if (totalFuncionarios > 0) {
    funcionarios.forEach(f => {
      console.log(`      - ${f.nome} (${f.cargo || 'Sem cargo'})`);
    });
  } else {
    console.log(`      ⚠️ Nenhum funcionário cadastrado para esta empresa`);
  }
  
  const [
    empresas,
    tecnicos,
    fornecedores,
    clientes,
    produtos,
    viaturas,
    abastecimentos,
    manutencoes,
    transferencias
  ] = await Promise.all([
    Empresa.countDocuments({ _id: empresaId }),
    Tecnico.countDocuments({ empresaId }),
    Fornecedor.countDocuments({ empresaId }),
    Cliente.countDocuments({ empresaId }),
    Stock.countDocuments({ empresaId }),
    Viatura.countDocuments({ empresaId, ativo: true }),
    Abastecimento.countDocuments({ empresaId }),
    Manutencao.countDocuments({ empresaId }),
    Transferencia.countDocuments({ empresaId })
  ]);
  
  return {
    totalEmpresas: empresas,
    totalTecnicos: tecnicos,
    totalFuncionarios: totalFuncionarios,
    totalFornecedores: fornecedores,
    totalClientes: clientes,
    totalProdutos: produtos,
    totalViaturas: viaturas,
    totalAbastecimentos: abastecimentos,
    totalManutencoes: manutencoes,
    totalTransferencias: transferencias
  };
};

// ============================================
// CALCULAR INDICADORES FINANCEIROS
// ============================================
const calcularIndicadoresFinanceiros = async (empresaId, mes, ano) => {
  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 0);
  dataFim.setHours(23, 59, 59, 999);
  
  // Calcular saldos em conta
  const saldoInicioPeriodo = await calcularSaldoEmConta(empresaId, dataInicio);
  const saldoFimPeriodo = await calcularSaldoEmConta(empresaId, dataFim);
  
  const [vendas, pagamentos] = await Promise.all([
    Venda.find({ empresaId, status: 'finalizada' }).lean(),
    Pagamento.find({ empresaId }).lean()
  ]);
  
  // ========== VENDAS DO PERÍODO ==========
  const vendasPeriodo = vendas.filter(v => {
    const data = new Date(v.data);
    return data >= dataInicio && data <= dataFim;
  });
  
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
  
  // ========== PAGAMENTOS DO PERÍODO ==========
  const pagamentosPeriodo = pagamentos.filter(p => {
    if (p.status !== 'Pago') return false;
    const data = new Date(p.dataPagamento);
    return data >= dataInicio && data <= dataFim;
  });
  
  let custoMercadorias = 0;
  let custosPessoal = 0;
  let amortizacoes = 0;
  let abastecimentos = 0;
  let impostosPagos = 0;
  let juros = 0;
  
  pagamentosPeriodo.forEach(p => {
    const valor = p.valor || 0;
    if (p.tipo === 'Fornecedor') custoMercadorias += valor;
    else if (p.tipo === 'Folha Salarial') custosPessoal += valor;
    else if (p.tipo === 'Manutenção') amortizacoes += valor;
    else if (p.tipo === 'Abastecimento') abastecimentos += valor;
    else if (p.tipo === 'Imposto') impostosPagos += valor;
    else if (p.tipo === 'Juros') juros += valor;
  });
  
  const totalCustosOperacionais = custoMercadorias + custosPessoal + amortizacoes + abastecimentos + impostosPagos;
  const resultadoAntesImpostos = totalReceitas - totalCustosOperacionais;
  
  // ============================================
  // IMPOSTO SÓ SE HOUVER LUCRO
  // ============================================
  let impostoSobreRendimento = 0;
  let aliquotaEfetiva = 0;
  let baseTributavel = 0;
  
  if (resultadoAntesImpostos > 0) {
    baseTributavel = resultadoAntesImpostos;
    impostoSobreRendimento = resultadoAntesImpostos * 0.25;
    aliquotaEfetiva = 25;
  }
  
  const resultadoLiquido = resultadoAntesImpostos - impostoSobreRendimento;
  
  // Log para debug
  console.log(`\n📊 Cálculo de Imposto:`);
  console.log(`   Resultado Antes Impostos: ${resultadoAntesImpostos.toLocaleString()} Kz`);
  console.log(`   Imposto (25%): ${impostoSobreRendimento.toLocaleString()} Kz`);
  
  const margemBruta = totalReceitas > 0 ? (resultadoAntesImpostos / totalReceitas) * 100 : 0;
  const margemLiquida = totalReceitas > 0 ? (resultadoLiquido / totalReceitas) * 100 : 0;
  const indiceCustos = totalReceitas > 0 ? (totalCustosOperacionais / totalReceitas) * 100 : 0;
  
  // ========== EVOLUÇÃO MENSAL ==========
  const mesesAbrev = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
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
        mes: mesesAbrev[mesRef - 1],
        receita: receitaMes,
        custo: custoMes,
        lucro: receitaMes - custoMes
      });
    }
  }
  
  // ========== TOP CLIENTES ==========
  const clientesMap = new Map();
  vendasPeriodo.forEach(v => {
    if (v.cliente) {
      if (clientesMap.has(v.cliente)) {
        const c = clientesMap.get(v.cliente);
        c.totalCompras += v.total;
        c.quantidade++;
      } else {
        clientesMap.set(v.cliente, { nome: v.cliente, totalCompras: v.total, quantidade: 1 });
      }
    }
  });
  
  const topClientes = Array.from(clientesMap.values())
    .sort((a, b) => b.totalCompras - a.totalCompras)
    .slice(0, 6);
  
  // ========== TOP PRODUTOS ==========
  const produtosMap = new Map();
  vendasPeriodo.forEach(v => {
    if (v.itens && Array.isArray(v.itens)) {
      v.itens.forEach(item => {
        const nome = item.produtoOuServico || 'Produto';
        if (produtosMap.has(nome)) {
          const p = produtosMap.get(nome);
          p.quantidade += item.quantidade || 0;
          p.receita += item.total || 0;
        } else {
          produtosMap.set(nome, { nome, quantidade: item.quantidade || 0, receita: item.total || 0 });
        }
      });
    }
  });
  
  const topProdutos = Array.from(produtosMap.values())
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 5);
  
  return {
    saldoInicial: saldoInicioPeriodo.saldoTotal,
    saldoFinal: saldoFimPeriodo.saldoTotal,
    detalhesContas: saldoFimPeriodo.detalhesContas,
    
    receitaTotal: totalReceitas,
    despesaTotal: totalCustosOperacionais,
    resultadoAntesImpostos,
    resultadoLiquido,
    
    impostoPago: impostoSobreRendimento,
    aliquotaImposto: aliquotaEfetiva,
    baseTributavel,
    
    margemBruta,
    margemLiquida,
    indiceCustos,
    ticketMedio: vendasPeriodo.length > 0 ? totalReceitas / vendasPeriodo.length : 0,
    totalVendasPeriodo: vendasPeriodo.length,
    totalPagamentosPeriodo: pagamentosPeriodo.length,
    liquidez: totalReceitas > 0 ? totalReceitas / Math.max(totalCustosOperacionais, 1) : 1,
    endividamento: totalReceitas > 0 ? totalCustosOperacionais / totalReceitas : 1,
    roi: totalCustosOperacionais > 0 ? (resultadoAntesImpostos / totalCustosOperacionais) * 100 : 0,
    
    evolucaoMensal,
    topClientes,
    topProdutos,
    receitasPorCategoria: [
      { categoria: "Vendas", valor: vendasProdutos },
      { categoria: "Serviços", valor: servicos }
    ].filter(d => d.valor > 0),
    despesasPorCategoria: [
      { categoria: "Fornecedores", valor: custoMercadorias },
      { categoria: "Pessoal", valor: custosPessoal },
      { categoria: "Manutenção", valor: amortizacoes },
      { categoria: "Abastecimento", valor: abastecimentos },
      { categoria: "Impostos", valor: impostosPagos }
    ].filter(d => d.valor > 0)
  };
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function calcularScoreSaudeFinanceira(dados) {
  let score = 0;
  
  if (dados.margemLucro >= 30) score += 35;
  else if (dados.margemLucro >= 20) score += 28;
  else if (dados.margemLucro >= 10) score += 20;
  else if (dados.margemLucro >= 5) score += 15;
  else if (dados.margemLucro >= 0) score += 10;
  else score += 5;
  
  if (dados.liquidez >= 2) score += 25;
  else if (dados.liquidez >= 1.5) score += 20;
  else if (dados.liquidez >= 1) score += 15;
  else if (dados.liquidez >= 0.5) score += 10;
  else score += 5;
  
  if (dados.endividamento <= 0.3) score += 20;
  else if (dados.endividamento <= 0.5) score += 15;
  else if (dados.endividamento <= 0.7) score += 10;
  else if (dados.endividamento <= 1) score += 5;
  else score += 0;
  
  if (dados.crescimentoReceita >= 20) score += 20;
  else if (dados.crescimentoReceita >= 10) score += 15;
  else if (dados.crescimentoReceita >= 5) score += 10;
  else if (dados.crescimentoReceita >= 0) score += 5;
  else score += 0;
  
  return Math.min(score, 100);
}

function gerarClassificacao(score) {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Boa';
  if (score >= 40) return 'Regular';
  if (score >= 20) return 'Atenção';
  return 'Crítica';
}

function gerarInsightsIA(dados) {
  const insights = [];
  
  if (dados.margemLucro > 30) {
    insights.push({
      tipo: 'positivo',
      titulo: '💰 Margem de Lucro Excepcional',
      descricao: `Margem de ${dados.margemLucro.toFixed(1)}% - Muito acima da média.`,
      acaoRecomendada: 'Considere expansão e reinvestimento'
    });
  } else if (dados.margemLucro < 0) {
    insights.push({
      tipo: 'critico',
      titulo: '⚠️ Resultado Negativo',
      descricao: `Prejuízo de ${Math.abs(dados.margemLucro).toFixed(1)}% no período.`,
      acaoRecomendada: 'Revisão urgente de custos e estratégias'
    });
  } else if (dados.margemLucro < 15) {
    insights.push({
      tipo: 'neutro',
      titulo: '📊 Margem Estável',
      descricao: `Margem de ${dados.margemLucro.toFixed(1)}% - dentro do esperado.`,
      acaoRecomendada: 'Monitorar e buscar oportunidades de melhoria'
    });
  }
  
  if (dados.totalVendas > 0) {
    insights.push({
      tipo: dados.totalVendas > 20 ? 'positivo' : 'neutro',
      titulo: '📈 Desempenho de Vendas',
      descricao: `${dados.totalVendas} venda(s) realizada(s), totalizando ${dados.receitaTotal.toLocaleString()} Kz.`,
      acaoRecomendada: dados.totalVendas < 10 ? 'Aumentar esforços de vendas' : 'Manter ritmo atual'
    });
  }
  
  if (dados.scoreSaude > 70) {
    insights.push({
      tipo: 'positivo',
      titulo: '🏆 Saúde Financeira Robusta',
      descricao: `Score de ${dados.scoreSaude} pontos - Situação excelente.`,
      acaoRecomendada: 'Aproveitar oportunidades de crescimento'
    });
  } else if (dados.scoreSaude < 30) {
    insights.push({
      tipo: 'critico',
      titulo: '🚨 Situação Financeira Crítica',
      descricao: 'Score de saúde financeira em nível crítico.',
      acaoRecomendada: 'Reestruturação financeira urgente'
    });
  }
  
  return insights;
}

function gerarPrevisoes(dados) {
  const previsoes = [];
  const crescimentoBase = Math.max(0.02, Math.min(0.2, Math.abs(dados.tendenciaReceita) / 100));
  
  previsoes.push({
    periodo: 'Próximo Mês',
    valor: dados.receitaTotal * (1 + crescimentoBase),
    descricao: 'Baseado na tendência dos últimos meses',
    cenario: 'conservador'
  });
  
  previsoes.push({
    periodo: 'Próximo Trimestre',
    valor: dados.receitaTotal * 3 * (1 + crescimentoBase * 1.5),
    descricao: 'Considerando sazonalidade positiva',
    cenario: 'otimista'
  });
  
  previsoes.push({
    periodo: 'Próximo Ano',
    valor: dados.receitaTotal * 12 * (1 + crescimentoBase),
    descricao: 'Projeção anual conservadora',
    cenario: 'conservador'
  });
  
  return previsoes;
}

function gerarRecomendacoes(dados) {
  const recomendacoes = [];
  
  if (dados.margemLucro < 10 && dados.margemLucro >= 0) {
    recomendacoes.push('📈 Aumentar preços ou reduzir custos variáveis');
  }
  if (dados.margemLucro < 0) {
    recomendacoes.push('🚨 Revisão urgente de custos operacionais');
  }
  if (dados.indiceCustos > 70) {
    recomendacoes.push('💰 Reduzir custos operacionais');
  }
  if (dados.totalVendas < 10) {
    recomendacoes.push('📢 Investir em marketing e vendas');
  }
  
  if (recomendacoes.length === 0) {
    recomendacoes.push('✅ Manter estratégias atuais');
    recomendacoes.push('🔍 Buscar novas oportunidades de mercado');
  }
  
  return recomendacoes;
}

// ============================================
// ROTA PRINCIPAL - ANÁLISE GERAL
// ============================================
router.get('/', async (req, res) => {
  try {
    const { empresaId, mes, ano } = req.query;
    
    console.log(`\n🧠 ANALISANDO SISTEMA - Empresa: ${empresaId}, ${mes}/${ano}`);
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa obrigatório' });
    }
    
    const mesNum = parseInt(mes) || new Date().getMonth() + 1;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const nomeMes = meses[mesNum - 1];
    
    const [indicadoresEmpresa, indicadoresFinanceiros, empresa] = await Promise.all([
      buscarIndicadoresEmpresa(empresaId),
      calcularIndicadoresFinanceiros(empresaId, mesNum, anoNum),
      Empresa.findById(empresaId)
    ]);
    
    console.log(`\n📊 RESULTADO DA BUSCA:`);
    console.log(`   Funcionários: ${indicadoresEmpresa.totalFuncionarios}`);
    console.log(`   Técnicos: ${indicadoresEmpresa.totalTecnicos}`);
    console.log(`   Clientes: ${indicadoresEmpresa.totalClientes}`);
    console.log(`   Fornecedores: ${indicadoresEmpresa.totalFornecedores}`);
    
    const scoreSaude = calcularScoreSaudeFinanceira({
      margemLucro: indicadoresFinanceiros.margemLiquida,
      liquidez: indicadoresFinanceiros.liquidez,
      endividamento: indicadoresFinanceiros.endividamento,
      crescimentoReceita: 5.5
    });
    
    const classificacaoSaude = gerarClassificacao(scoreSaude);
    
    const insightsIA = gerarInsightsIA({
      margemLucro: indicadoresFinanceiros.margemLiquida,
      totalVendas: indicadoresFinanceiros.totalVendasPeriodo,
      receitaTotal: indicadoresFinanceiros.receitaTotal,
      scoreSaude,
      produtividade: indicadoresEmpresa.totalFuncionarios > 0 ? 
        indicadoresFinanceiros.receitaTotal / indicadoresEmpresa.totalFuncionarios : 0
    });
    
    const previsoes = gerarPrevisoes({
      receitaTotal: indicadoresFinanceiros.receitaTotal,
      tendenciaReceita: 5.5
    });
    
    const recomendacoes = gerarRecomendacoes({
      margemLucro: indicadoresFinanceiros.margemLiquida,
      indiceCustos: indicadoresFinanceiros.indiceCustos,
      totalVendas: indicadoresFinanceiros.totalVendasPeriodo
    });
    
    res.json({
      sucesso: true,
      dados: {
        resumo: {
          receitaTotal: indicadoresFinanceiros.receitaTotal,
          despesaTotal: indicadoresFinanceiros.despesaTotal,
          lucro: indicadoresFinanceiros.resultadoLiquido,
          margemLucro: indicadoresFinanceiros.margemLiquida,
          empresasAtivas: indicadoresEmpresa.totalEmpresas,
          tecnicosActivos: indicadoresEmpresa.totalFuncionarios,
          relatoriosGerados: indicadoresFinanceiros.totalVendasPeriodo + indicadoresFinanceiros.totalPagamentosPeriodo,
          receitaMensal: indicadoresFinanceiros.evolucaoMensal.map(e => ({ mes: e.mes, valor: e.receita })),
          despesaMensal: indicadoresFinanceiros.evolucaoMensal.map(e => ({ mes: e.mes, valor: e.custo }))
        },
        saldosBancarios: {
          saldoInicial: indicadoresFinanceiros.saldoInicial,
          saldoFinal: indicadoresFinanceiros.saldoFinal,
          detalhesContas: indicadoresFinanceiros.detalhesContas
        },
        insights: insightsIA,
        previsoes,
        saudeFinanceira: {
          score: scoreSaude,
          classificacao: classificacaoSaude,
          liquidez: indicadoresFinanceiros.liquidez,
          endividamento: indicadoresFinanceiros.endividamento,
          rentabilidade: indicadoresFinanceiros.margemLiquida,
          roi: indicadoresFinanceiros.roi
        },
        topClientes: indicadoresFinanceiros.topClientes,
        topProdutos: indicadoresFinanceiros.topProdutos,
        metricasOperacionais: {
          totalVendas: indicadoresFinanceiros.totalVendasPeriodo,
          totalTransferencias: indicadoresEmpresa.totalTransferencias,
          totalPagamentos: indicadoresFinanceiros.totalPagamentosPeriodo,
          totalClientes: indicadoresEmpresa.totalClientes,
          totalFornecedores: indicadoresEmpresa.totalFornecedores,
          totalFuncionarios: indicadoresEmpresa.totalFuncionarios,
          totalViaturas: indicadoresEmpresa.totalViaturas,
          totalProdutos: indicadoresEmpresa.totalProdutos,
          eficienciaOperacional: indicadoresFinanceiros.margemBruta,
          produtividade: indicadoresEmpresa.totalFuncionarios > 0 ? 
            indicadoresFinanceiros.receitaTotal / indicadoresEmpresa.totalFuncionarios : 0,
          ticketMedio: indicadoresFinanceiros.ticketMedio
        },
        metricasFinanceiras: {
          receitasPorCategoria: indicadoresFinanceiros.receitasPorCategoria,
          despesasPorCategoria: indicadoresFinanceiros.despesasPorCategoria,
          resultadoAntesImpostos: indicadoresFinanceiros.resultadoAntesImpostos,
          resultadoLiquido: indicadoresFinanceiros.resultadoLiquido,
          impostoPago: indicadoresFinanceiros.impostoPago,
          aliquotaImposto: indicadoresFinanceiros.aliquotaImposto,
          baseTributavel: indicadoresFinanceiros.baseTributavel
        },
        recomendacoes,
        empresa: {
          nome: empresa?.nome || 'Empresa',
          nif: empresa?.nif || '---',
          periodo: { mes: nomeMes, ano: anoNum }
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erro na análise geral:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao gerar análise',
      erro: error.message 
    });
  }
});

// ============================================
// DASHBOARD RÁPIDO
// ============================================
router.get('/dashboard', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa obrigatório' });
    }
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    const indicadoresFinanceiros = await calcularIndicadoresFinanceiros(empresaId, mesAtual, anoAtual);
    const indicadoresEmpresa = await buscarIndicadoresEmpresa(empresaId);
    
    res.json({
      sucesso: true,
      dados: {
        receita: indicadoresFinanceiros.receitaTotal,
        despesa: indicadoresFinanceiros.despesaTotal,
        lucro: indicadoresFinanceiros.resultadoLiquido,
        margem: indicadoresFinanceiros.margemLiquida,
        totalVendas: indicadoresFinanceiros.totalVendasPeriodo,
        totalClientes: indicadoresEmpresa.totalClientes,
        totalProdutos: indicadoresEmpresa.totalProdutos,
        totalFuncionarios: indicadoresEmpresa.totalFuncionarios,
        ticketMedio: indicadoresFinanceiros.ticketMedio,
        saldoDisponivel: indicadoresFinanceiros.saldoFinal
      }
    });
    
  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao carregar dashboard' });
  }
});

module.exports = router;