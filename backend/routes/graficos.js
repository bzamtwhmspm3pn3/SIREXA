const express = require('express');
const router = express.Router();
const Venda = require('../models/Venda');
const Pagamento = require('../models/Pagamento');
const FluxoCaixa = require('../models/FluxoCaixa');
const Orcamento = require('../models/Orcamento');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// =============================================
// FUNÇÕES AUXILIARES (para evitar chamadas HTTP internas)
// =============================================

// GRÁFICO DE EVOLUÇÃO MENSAL (Receitas vs Custos)
async function getEvolucaoMensalData(empresaId, anoNum) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const evolucao = [];
  
  const [vendas, pagamentos] = await Promise.all([
    Venda.find({ empresaId, status: 'finalizada' }).lean(),
    Pagamento.find({ empresaId, status: 'Pago' }).lean()
  ]);
  
  for (let i = 1; i <= 12; i++) {
    const dataInicio = new Date(anoNum, i - 1, 1);
    const dataFim = new Date(anoNum, i, 0);
    dataFim.setHours(23, 59, 59, 999);
    
    const vendasMes = vendas.filter(v => {
      const data = new Date(v.data);
      return data >= dataInicio && data <= dataFim;
    });
    
    const pagamentosMes = pagamentos.filter(p => {
      const data = new Date(p.dataPagamento);
      return data >= dataInicio && data <= dataFim;
    });
    
    const receita = vendasMes.reduce((sum, v) => sum + v.total, 0);
    const custo = pagamentosMes.reduce((sum, p) => sum + p.valor, 0);
    
    evolucao.push({
      mes: meses[i - 1],
      receita,
      custo,
      lucro: receita - custo,
      margem: receita > 0 ? ((receita - custo) / receita * 100).toFixed(2) : 0
    });
  }
  
  return evolucao;
}

// GRÁFICO DE DISTRIBUIÇÃO POR CATEGORIA
async function getDistribuicaoCategoriasData(empresaId, anoNum, mesNum = null) {
  const dataInicio = mesNum ? new Date(anoNum, mesNum - 1, 1) : new Date(anoNum, 0, 1);
  const dataFim = mesNum ? new Date(anoNum, mesNum, 0) : new Date(anoNum, 11, 31);
  dataFim.setHours(23, 59, 59, 999);
  
  const [vendas, pagamentos] = await Promise.all([
    Venda.find({ empresaId, status: 'finalizada' }).lean(),
    Pagamento.find({ empresaId, status: 'Pago' }).lean()
  ]);
  
  const vendasPeriodo = vendas.filter(v => {
    const data = new Date(v.data);
    return data >= dataInicio && data <= dataFim;
  });
  
  const pagamentosPeriodo = pagamentos.filter(p => {
    const data = new Date(p.dataPagamento);
    return data >= dataInicio && data <= dataFim;
  });
  
  let vendasProdutos = 0;
  let servicos = 0;
  
  vendasPeriodo.forEach(v => {
    if (v.tipoFactura === 'Prestação de Serviço') {
      servicos += v.total;
    } else {
      vendasProdutos += v.total;
    }
  });
  
  const custosPorCategoria = {};
  pagamentosPeriodo.forEach(p => {
    const categoria = p.tipo || 'Outros';
    custosPorCategoria[categoria] = (custosPorCategoria[categoria] || 0) + p.valor;
  });
  
  const distribuicao = [
    { nome: "Vendas de Produtos", valor: vendasProdutos, cor: "#10b981" },
    { nome: "Prestação de Serviços", valor: servicos, cor: "#3b82f6" }
  ];
  
  const cores = ["#f59e0b", "#ef4444", "#8b5cf6", "#ec489a", "#06b6d4", "#84cc16"];
  Object.entries(custosPorCategoria).forEach(([categoria, valor], idx) => {
    distribuicao.push({
      nome: categoria,
      valor,
      cor: cores[idx % cores.length]
    });
  });
  
  return distribuicao.filter(d => d.valor > 0);
}

// GRÁFICO DE FLUXO DE CAIXA
async function getFluxoCaixaData(empresaId, anoNum) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const fluxo = [];
  
  const [vendas, pagamentos] = await Promise.all([
    Venda.find({ empresaId, status: 'finalizada' }).lean(),
    Pagamento.find({ empresaId, status: 'Pago' }).lean()
  ]);
  
  let saldoAcumulado = 0;
  
  for (let i = 1; i <= 12; i++) {
    const dataInicio = new Date(anoNum, i - 1, 1);
    const dataFim = new Date(anoNum, i, 0);
    dataFim.setHours(23, 59, 59, 999);
    
    const vendasMes = vendas.filter(v => {
      const data = new Date(v.data);
      return data >= dataInicio && data <= dataFim;
    });
    
    const pagamentosMes = pagamentos.filter(p => {
      const data = new Date(p.dataPagamento);
      return data >= dataInicio && data <= dataFim;
    });
    
    const entradas = vendasMes.reduce((sum, v) => sum + v.total, 0);
    const saidas = pagamentosMes.reduce((sum, p) => sum + p.valor, 0);
    const saldoMes = entradas - saidas;
    saldoAcumulado += saldoMes;
    
    fluxo.push({
      mes: meses[i - 1],
      entradas,
      saidas,
      saldo: saldoMes,
      saldoAcumulado
    });
  }
  
  return fluxo;
}

// GRÁFICO DE INDICADORES (KPIs)
async function getIndicadoresData(empresaId, anoNum) {
  const [vendas, pagamentos] = await Promise.all([
    Venda.find({ empresaId, status: 'finalizada' }).lean(),
    Pagamento.find({ empresaId, status: 'Pago' }).lean()
  ]);
  
  const indicadores = [];
  
  for (let i = 1; i <= 12; i++) {
    const dataInicio = new Date(anoNum, i - 1, 1);
    const dataFim = new Date(anoNum, i, 0);
    dataFim.setHours(23, 59, 59, 999);
    
    const vendasMes = vendas.filter(v => {
      const data = new Date(v.data);
      return data >= dataInicio && data <= dataFim;
    });
    
    const pagamentosMes = pagamentos.filter(p => {
      const data = new Date(p.dataPagamento);
      return data >= dataInicio && data <= dataFim;
    });
    
    const receita = vendasMes.reduce((sum, v) => sum + v.total, 0);
    const custo = pagamentosMes.reduce((sum, p) => sum + p.valor, 0);
    const lucro = receita - custo;
    const margem = receita > 0 ? (lucro / receita * 100) : 0;
    
    indicadores.push({
      mes: i,
      receita,
      custo,
      lucro,
      margem
    });
  }
  
  return indicadores;
}

// GRÁFICO DE ORÇAMENTO VS REALIZADO
async function getOrcamentoVsRealData(empresaId, anoNum) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const comparacao = [];
  
  const [vendas, pagamentos, orcamentos] = await Promise.all([
    Venda.find({ empresaId, status: 'finalizada' }).lean(),
    Pagamento.find({ empresaId, status: 'Pago' }).lean(),
    Orcamento.find({ empresaId, ano: anoNum, status: 'Aprovado' }).lean()
  ]);
  
  for (let i = 1; i <= 12; i++) {
    const dataInicio = new Date(anoNum, i - 1, 1);
    const dataFim = new Date(anoNum, i, 0);
    dataFim.setHours(23, 59, 59, 999);
    
    const vendasMes = vendas.filter(v => {
      const data = new Date(v.data);
      return data >= dataInicio && data <= dataFim;
    });
    
    const receitaReal = vendasMes.reduce((sum, v) => sum + v.total, 0);
    const orcamentoVendas = orcamentos.find(o => o.mes === i && o.tipoOrcamento === 'Vendas');
    const receitaOrcada = orcamentoVendas?.valor || 0;
    
    const pagamentosMes = pagamentos.filter(p => {
      const data = new Date(p.dataPagamento);
      return data >= dataInicio && data <= dataFim;
    });
    
    const custoReal = pagamentosMes.reduce((sum, p) => sum + p.valor, 0);
    const orcamentoCustos = orcamentos.find(o => o.mes === i && o.tipoOrcamento === 'Custos');
    const custoOrcado = orcamentoCustos?.valor || 0;
    
    comparacao.push({
      mes: meses[i - 1],
      receitaOrcada,
      receitaReal,
      custoOrcado,
      custoReal,
      lucroOrcado: receitaOrcada - custoOrcado,
      lucroReal: receitaReal - custoReal
    });
  }
  
  return comparacao;
}

// GRÁFICO DE TOP FORNECEDORES
async function getTopFornecedoresData(empresaId, anoNum, mesNum = null) {
  const dataInicio = mesNum ? new Date(anoNum, mesNum - 1, 1) : new Date(anoNum, 0, 1);
  const dataFim = mesNum ? new Date(anoNum, mesNum, 0) : new Date(anoNum, 11, 31);
  dataFim.setHours(23, 59, 59, 999);
  
  const pagamentos = await Pagamento.find({ 
    empresaId, 
    status: 'Pago',
    tipo: 'Fornecedor',
    dataPagamento: { $gte: dataInicio, $lte: dataFim }
  }).lean();
  
  const fornecedores = {};
  pagamentos.forEach(p => {
    const nome = p.beneficiario;
    fornecedores[nome] = (fornecedores[nome] || 0) + p.valor;
  });
  
  const topFornecedores = Object.entries(fornecedores)
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);
  
  return topFornecedores;
}

// =============================================
// NOVAS FUNÇÕES PARA GRÁFICOS DE FUNCIONÁRIOS E CLIENTES
// =============================================

// GRÁFICO DE FUNCIONÁRIOS POR DEPARTAMENTO
async function getFuncionariosPorDepartamentoData(empresaId) {
  try {
    const Funcionario = require('../models/Funcionario');
    
    const funcionarios = await Funcionario.find({ 
      empresaId,
      status: 'Ativo'
    }).lean();
    
    const departamentos = {};
    funcionarios.forEach(f => {
      const depto = f.departamento || 'Outros';
      departamentos[depto] = (departamentos[depto] || 0) + 1;
    });
    
    const cores = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec489a", "#06b6d4", "#84cc16"];
    
    return Object.entries(departamentos).map(([nome, valor], idx) => ({
      nome,
      quantidade: valor,
      cor: cores[idx % cores.length]
    }));
  } catch (error) {
    console.error('Erro em funcionarios por departamento:', error);
    return [];
  }
}

// GRÁFICO DE CUSTO COM FUNCIONÁRIOS
async function getCustoFuncionariosData(empresaId, anoNum) {
  try {
    const Funcionario = require('../models/Funcionario');
    
    const funcionarios = await Funcionario.find({ 
      empresaId, 
      status: 'Ativo'
    }).lean();
    
    const pagamentosSalario = await Pagamento.find({
      empresaId,
      tipo: 'Folha Salarial',
      status: 'Pago',
      dataPagamento: {
        $gte: new Date(anoNum, 0, 1),
        $lte: new Date(anoNum, 11, 31)
      }
    }).lean();
    
    const salarioTotal = pagamentosSalario.reduce((sum, p) => sum + p.valor, 0);
    const salarioMedio = funcionarios.length > 0 ? salarioTotal / funcionarios.length : 0;
    
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const custoMensal = [];
    
    for (let i = 1; i <= 12; i++) {
      const pagamentosMes = pagamentosSalario.filter(p => {
        const data = new Date(p.dataPagamento);
        return data.getMonth() + 1 === i;
      });
      const totalMes = pagamentosMes.reduce((sum, p) => sum + p.valor, 0);
      custoMensal.push({
        mes: meses[i - 1],
        custo: totalMes
      });
    }
    
    return {
      totalFuncionarios: funcionarios.length,
      totalSalarioAnual: salarioTotal,
      salarioMedio,
      custoMensal,
      funcionariosPorDepartamento: await getFuncionariosPorDepartamentoData(empresaId)
    };
  } catch (error) {
    console.error('Erro em custo funcionarios:', error);
    return {
      totalFuncionarios: 0,
      totalSalarioAnual: 0,
      salarioMedio: 0,
      custoMensal: [],
      funcionariosPorDepartamento: []
    };
  }
}

// GRÁFICO DE CLIENTES POR CATEGORIA
async function getClientesPorCategoriaData(empresaId) {
  try {
    const Cliente = require('../models/Cliente');
    
    const clientes = await Cliente.find({ empresaId }).lean();
    
    const categorias = {};
    clientes.forEach(c => {
      const cat = c.categoria || 'Regular';
      categorias[cat] = (categorias[cat] || 0) + 1;
    });
    
    const cores = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec489a"];
    
    return Object.entries(categorias).map(([nome, valor], idx) => ({
      nome,
      quantidade: valor,
      cor: cores[idx % cores.length]
    }));
  } catch (error) {
    console.error('Erro em clientes por categoria:', error);
    return [];
  }
}

// GRÁFICO DE TOP CLIENTES
async function getTopClientesData(empresaId, anoNum) {
  try {
    const Venda = require('../models/Venda');
    const Cliente = require('../models/Cliente');
    
    const vendas = await Venda.find({
      empresaId,
      status: 'finalizada',
      data: {
        $gte: new Date(anoNum, 0, 1),
        $lte: new Date(anoNum, 11, 31)
      }
    }).lean();
    
    const clientesMap = {};
    vendas.forEach(v => {
      if (v.clienteId) {
        clientesMap[v.clienteId] = (clientesMap[v.clienteId] || 0) + v.total;
      }
    });
    
    const clientesIds = Object.keys(clientesMap);
    const clientes = await Cliente.find({ 
      empresaId, 
      _id: { $in: clientesIds } 
    }).lean();
    
    const clientesDict = {};
    clientes.forEach(c => {
      clientesDict[c._id.toString()] = c.nome;
    });
    
    const topClientes = Object.entries(clientesMap)
      .map(([id, valor]) => ({
        nome: clientesDict[id] || 'Cliente não identificado',
        valor
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
    
    return topClientes;
  } catch (error) {
    console.error('Erro em top clientes:', error);
    return [];
  }
}

// GRÁFICO DE TOP PRODUTOS
async function getTopProdutosData(empresaId, anoNum) {
  try {
    const Venda = require('../models/Venda');
    
    const vendas = await Venda.find({
      empresaId,
      status: 'finalizada',
      data: {
        $gte: new Date(anoNum, 0, 1),
        $lte: new Date(anoNum, 11, 31)
      }
    }).lean();
    
    const produtosMap = {};
    vendas.forEach(v => {
      if (v.itens && v.itens.length) {
        v.itens.forEach(item => {
          const nome = item.produto || item.descricao || 'Produto não identificado';
          produtosMap[nome] = (produtosMap[nome] || 0) + (item.quantidade || 1);
        });
      }
    });
    
    const topProdutos = Object.entries(produtosMap)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
    
    return topProdutos;
  } catch (error) {
    console.error('Erro em top produtos:', error);
    return [];
  }
}

// GRÁFICO DE RECEITA POR CLIENTE
async function getReceitaPorClienteData(empresaId, anoNum) {
  const topClientes = await getTopClientesData(empresaId, anoNum);
  const total = topClientes.reduce((sum, c) => sum + c.valor, 0);
  
  return topClientes.map(c => ({
    ...c,
    percentual: total > 0 ? (c.valor / total * 100).toFixed(1) : 0
  }));
}

// GRÁFICO DE CUSTOS POR DEPARTAMENTO
async function getCustosPorDepartamentoData(empresaId, anoNum) {
  try {
    const pagamentos = await Pagamento.find({
      empresaId,
      status: 'Pago',
      dataPagamento: {
        $gte: new Date(anoNum, 0, 1),
        $lte: new Date(anoNum, 11, 31)
      }
    }).lean();
    
    const custosPorDepto = {};
    pagamentos.forEach(p => {
      const depto = p.departamento || p.tipo || 'Outros';
      custosPorDepto[depto] = (custosPorDepto[depto] || 0) + p.valor;
    });
    
    const cores = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec489a", "#06b6d4"];
    
    return Object.entries(custosPorDepto)
      .map(([nome, valor], idx) => ({
        nome,
        valor,
        cor: cores[idx % cores.length]
      }))
      .sort((a, b) => b.valor - a.valor);
  } catch (error) {
    console.error('Erro em custos por departamento:', error);
    return [];
  }
}

// GRÁFICO DE RESULTADO POR EMPRESA
async function getResultadoPorEmpresaData(usuarioId) {
  try {
    const Empresa = require('../models/Empresa');
    
    const empresas = await Empresa.find({ usuarioId }).lean();
    
    const resultados = await Promise.all(empresas.map(async (emp) => {
      const [vendas, pagamentos] = await Promise.all([
        Venda.find({ empresaId: emp._id, status: 'finalizada' }).lean(),
        Pagamento.find({ empresaId: emp._id, status: 'Pago' }).lean()
      ]);
      
      const receita = vendas.reduce((sum, v) => sum + v.total, 0);
      const despesa = pagamentos.reduce((sum, p) => sum + p.valor, 0);
      
      return {
        nome: emp.nome,
        receita,
        despesa,
        lucro: receita - despesa,
        margem: receita > 0 ? ((receita - despesa) / receita * 100) : 0
      };
    }));
    
    return resultados.sort((a, b) => b.lucro - a.lucro);
  } catch (error) {
    console.error('Erro em resultado por empresa:', error);
    return [];
  }
}

// =============================================
// ENDPOINTS ORIGINAIS
// =============================================

router.get('/evolucao-mensal', async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const dados = await getEvolucaoMensalData(empresaId, anoNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro na evolução mensal:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/distribuicao-categorias', async (req, res) => {
  try {
    const { empresaId, ano, mes } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const mesNum = mes ? parseInt(mes) : null;
    const dados = await getDistribuicaoCategoriasData(empresaId, anoNum, mesNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro na distribuição:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/fluxo-caixa', async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const dados = await getFluxoCaixaData(empresaId, anoNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro no fluxo de caixa:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/indicadores', async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const dados = await getIndicadoresData(empresaId, anoNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro nos indicadores:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/orcamento-vs-real', async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const dados = await getOrcamentoVsRealData(empresaId, anoNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro na comparação:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/top-fornecedores', async (req, res) => {
  try {
    const { empresaId, ano, mes } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const mesNum = mes ? parseInt(mes) : null;
    const dados = await getTopFornecedoresData(empresaId, anoNum, mesNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro top fornecedores:', error);
    res.status(500).json({ erro: error.message });
  }
});

// =============================================
// NOVOS ENDPOINTS
// =============================================

router.get('/funcionarios-departamento', async (req, res) => {
  try {
    const { empresaId } = req.query;
    const dados = await getFuncionariosPorDepartamentoData(empresaId);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/custo-funcionarios', async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const dados = await getCustoFuncionariosData(empresaId, anoNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/clientes-categoria', async (req, res) => {
  try {
    const { empresaId } = req.query;
    const dados = await getClientesPorCategoriaData(empresaId);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/top-clientes', async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const dados = await getTopClientesData(empresaId, anoNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/top-produtos', async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const dados = await getTopProdutosData(empresaId, anoNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/receita-cliente', async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const dados = await getReceitaPorClienteData(empresaId, anoNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/custos-departamento', async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const dados = await getCustosPorDepartamentoData(empresaId, anoNum);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/resultado-empresas', async (req, res) => {
  try {
    const { usuarioId } = req.query;
    const dados = await getResultadoPorEmpresaData(usuarioId);
    res.json({ sucesso: true, dados });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: error.message });
  }
});

// =============================================
// DASHBOARD COMPLETO
// =============================================

router.get('/dashboard', async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    
    const [evolucao, distribuicao, fluxo, indicadores, orcamentoVsReal, topFornecedores] = await Promise.all([
      getEvolucaoMensalData(empresaId, anoNum),
      getDistribuicaoCategoriasData(empresaId, anoNum),
      getFluxoCaixaData(empresaId, anoNum),
      getIndicadoresData(empresaId, anoNum),
      getOrcamentoVsRealData(empresaId, anoNum),
      getTopFornecedoresData(empresaId, anoNum)
    ]);
    
    res.json({
      sucesso: true,
      dados: { evolucao, distribuicao, fluxo, indicadores, orcamentoVsReal, topFornecedores }
    });
  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.status(500).json({ erro: error.message });
  }
});

// DASHBOARD COMPLETO COM TODOS OS DADOS
router.get('/dashboard-completo', async (req, res) => {
  try {
    const { empresaId, ano, usuarioId } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    
    const [
      evolucao,
      distribuicao,
      fluxo,
      indicadores,
      orcamentoVsReal,
      topFornecedores,
      custoFuncionarios,
      topClientes,
      topProdutos,
      custosDepartamento,
      clientesPorCategoria
    ] = await Promise.all([
      getEvolucaoMensalData(empresaId, anoNum),
      getDistribuicaoCategoriasData(empresaId, anoNum),
      getFluxoCaixaData(empresaId, anoNum),
      getIndicadoresData(empresaId, anoNum),
      getOrcamentoVsRealData(empresaId, anoNum),
      getTopFornecedoresData(empresaId, anoNum),
      getCustoFuncionariosData(empresaId, anoNum),
      getTopClientesData(empresaId, anoNum),
      getTopProdutosData(empresaId, anoNum),
      getCustosPorDepartamentoData(empresaId, anoNum),
      getClientesPorCategoriaData(empresaId)
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        evolucao,
        distribuicao,
        fluxo,
        indicadores,
        orcamentoVsReal,
        topFornecedores,
        recursosHumanos: custoFuncionarios,
        clientes: {
          topClientes,
          receitaPorCliente: await getReceitaPorClienteData(empresaId, anoNum),
          clientesPorCategoria
        },
        produtos: {
          topProdutos,
          margemPorProduto: []
        },
        custosDepartamento,
        resultadoEmpresas: await getResultadoPorEmpresaData(usuarioId)
      }
    });
  } catch (error) {
    console.error('Erro no dashboard completo:', error);
    res.status(500).json({ erro: error.message });
  }
});

// ANOS DISPONÍVEIS
router.get('/anos-disponiveis', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    const anos = await Venda.aggregate([
      { $match: { empresaId } },
      { $group: { _id: { $year: "$data" } } },
      { $sort: { _id: 1 } }
    ]);
    
    let anosLista = anos.map(a => a._id).filter(a => a);
    const anoAtual = new Date().getFullYear();
    
    if (anosLista.length === 0) {
      for (let i = anoAtual - 5; i <= anoAtual + 1; i++) {
        anosLista.push(i);
      }
    }
    
    res.json({ anos: anosLista });
  } catch (error) {
    console.error('Erro ao buscar anos:', error);
    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = anoAtual - 5; i <= anoAtual + 1; i++) {
      anos.push(i);
    }
    res.json({ anos });
  }
});

module.exports = router;