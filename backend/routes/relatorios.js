// backend/routes/relatorios.js - VERSAO COMPLETA (CORRIGIDA E ACENTUADA)
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');

// Importar modelos
const Venda = require('../models/Venda');
const Pagamento = require('../models/Pagamento');
const Transferencia = require('../models/Transferencia');
const Empresa = require('../models/Empresa');
const Funcionario = require('../models/Funcionario');
const Fornecedor = require('../models/Fornecedor');
const Cliente = require('../models/Cliente');
const Stock = require('../models/Stock');
const Viatura = require('../models/Viatura');
const RegistoBancario = require('../models/RegistoBancario');
const Banco = require('../models/Banco');
const Relatorio = require('../models/relatorio');
const ContaCorrente = require('../models/ContaCorrente');

router.use(verifyToken);

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const formatarNumero = (valor) => {
  if (valor === undefined || valor === null) return "0,00";
  const num = Number(valor);
  if (isNaN(num)) return "0,00";
  return num.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const pluralizar = (valor, singular, plural) => {
  return valor === 1 ? singular : plural;
};

function analisarVariacaoSaldo(saldoInicial, saldoFinal) {
  const variacaoAbsoluta = saldoFinal - saldoInicial;
  const variacaoPercentual = saldoInicial !== 0 ? (variacaoAbsoluta / Math.abs(saldoInicial)) * 100 : (saldoFinal !== 0 ? 100 : 0);
  
  let tipo = "estável";
  let descricao = "";
  let positivo = false;
  
  if (variacaoAbsoluta > 0) {
    positivo = true;
    if (variacaoPercentual > 20) {
      tipo = "crescimento_expressivo";
      descricao = `crescimento expressivo de +${variacaoPercentual.toFixed(2)}% (${formatarNumero(Math.abs(variacaoAbsoluta))} Kz)`;
    } else if (variacaoPercentual > 5) {
      tipo = "crescimento_moderado";
      descricao = `crescimento moderado de +${variacaoPercentual.toFixed(2)}% (${formatarNumero(Math.abs(variacaoAbsoluta))} Kz)`;
    } else if (variacaoPercentual > 0) {
      tipo = "crescimento_leve";
      descricao = `ligeiro aumento de +${variacaoPercentual.toFixed(2)}% (${formatarNumero(Math.abs(variacaoAbsoluta))} Kz)`;
    }
  } else if (variacaoAbsoluta < 0) {
    positivo = false;
    if (variacaoPercentual < -20) {
      tipo = "queda_expressiva";
      descricao = `diminuição significativa de ${Math.abs(variacaoPercentual).toFixed(2)}% (${formatarNumero(Math.abs(variacaoAbsoluta))} Kz)`;
    } else if (variacaoPercentual < -5) {
      tipo = "queda_moderada";
      descricao = `redução de ${Math.abs(variacaoPercentual).toFixed(2)}% (${formatarNumero(Math.abs(variacaoAbsoluta))} Kz)`;
    } else if (variacaoPercentual < 0) {
      tipo = "queda_leve";
      descricao = `ligeira diminuição de ${Math.abs(variacaoPercentual).toFixed(2)}% (${formatarNumero(Math.abs(variacaoAbsoluta))} Kz)`;
    }
  } else {
    descricao = `manutenção do mesmo valor (0%)`;
  }
  
  return { tipo, descricao, variacaoPercentual, variacaoAbsoluta, positivo };
}

function analisarResultado(resultadoLiquido, margemLucro) {
  const resultadoAbs = Math.abs(resultadoLiquido);
  const margem = parseFloat(margemLucro);
  
  if (resultadoLiquido > 0) {
    if (margem > 25) {
      return { 
        tipo: "excelente", 
        descricao: `excelente, com lucro de ${formatarNumero(resultadoAbs)} Kwanzas e margem de ${margem}%, desempenho muito acima da média do sector`,
        positivo: true 
      };
    }
    if (margem > 10) {
      return { 
        tipo: "bom", 
        descricao: `bom, com lucro de ${formatarNumero(resultadoAbs)} Kwanzas e margem de ${margem}%, considerado saudável para o sector`,
        positivo: true 
      };
    }
    if (margem > 0) {
      return { 
        tipo: "moderado", 
        descricao: `moderado, com lucro de ${formatarNumero(resultadoAbs)} Kwanzas mas margem reduzida de ${margem}%, indicando espaço para melhoria da eficiência operacional`,
        positivo: true 
      };
    }
    return { 
      tipo: "positivo", 
      descricao: `positivo, a empresa gerou lucro de ${formatarNumero(resultadoAbs)} Kwanzas no período`,
      positivo: true 
    };
  } else if (resultadoLiquido < 0) {
    if (margem < -20) {
      return { 
        tipo: "crítico", 
        descricao: `crítico, com prejuízo de ${formatarNumero(resultadoAbs)} Kwanzas (${Math.abs(margem)}% de margem negativa), situação que requer intervenção urgente da administração`,
        positivo: false 
      };
    }
    if (margem < -5) {
      return { 
        tipo: "preocupante", 
        descricao: `preocupante, a empresa registou prejuízo de ${formatarNumero(resultadoAbs)} Kwanzas com margem de ${margem}%, merecendo atenção especial da administração`,
        positivo: false 
      };
    }
    return { 
      tipo: "negativo", 
      descricao: `negativo, a empresa operou com prejuízo de ${formatarNumero(resultadoAbs)} Kwanzas no período analisado`,
      positivo: false 
    };
  }
  return { 
    tipo: "neutro", 
    descricao: `neutro, a empresa atingiu o ponto de equilíbrio (break-even), sem lucro nem prejuízo`,
    positivo: true 
  };
}

function analisarEficiencia(margemBruta, margemLucro) {
  const margem = parseFloat(margemBruta);
  
  if (margem < 0) {
    return "ineficiente - as operações estão a gerar prejuízo antes mesmo de considerar impostos, situação que exige reestruturação urgente";
  }
  if (margem < 5) {
    return "baixa - a empresa tem dificuldade em converter receitas em lucro operacional, recomendando-se revisão da estrutura de custos";
  }
  if (margem < 15) {
    return "moderada - há espaço para optimização dos processos e redução de custos operacionais";
  }
  if (margem < 25) {
    return "boa - a empresa demonstra eficiência operacional satisfatória, com controlo adequado dos custos";
  }
  return "excelente - a gestão operacional é altamente eficiente, com margens que superam as médias do sector";
}

// ============================================
// ANÁLISE INTELIGENTE DE CONTAS CORRENTES
// ============================================
async function analisarContasCorrentes(empresaId) {
  try {
    const contas = await ContaCorrente.find({ empresaId: empresaId, tipo: 'Fornecedor' });
    
    if (contas.length === 0) {
      return {
        totalFornecedores: 0,
        totalDivida: 0,
        fornecedoresCriticos: [],
        situacao: "sem_dados",
        analise: "Não existem contas correntes de fornecedores registadas no sistema. Recomenda-se o cadastro dos fornecedores e a criação das respectivas contas correntes para um melhor controlo financeiro.",
        recomendacoes: [
          "Cadastrar fornecedores no sistema",
          "Registrar os contratos e obrigações com cada fornecedor",
          "Configurar as condições de pagamento e prazos"
        ]
      };
    }
    
    let totalDivida = 0;
    let fornecedoresDetalhados = [];
    
    for (const conta of contas) {
      const saldo = conta.saldo || 0;
      if (saldo > 0) {
        totalDivida += saldo;
      }
      
      fornecedoresDetalhados.push({
        nome: conta.beneficiario,
        nif: conta.beneficiarioDocumento || '---',
        saldoAtual: saldo,
        situacao: saldo > 0 ? 'empresa_deve' : (saldo < 0 ? 'fornecedor_deve' : 'zerado'),
        contato: conta.contato || '',
        email: conta.email || ''
      });
    }
    
    // Ordenar por maior saldo devedor
    const fornecedoresCriticos = fornecedoresDetalhados
      .filter(f => f.saldoAtual > 0)
      .sort((a, b) => b.saldoAtual - a.saldoAtual);
    
    const totalFornecedores = fornecedoresDetalhados.length;
    const fornecedoresComDivida = fornecedoresCriticos.length;
    const fornecedoresZerados = fornecedoresDetalhados.filter(f => f.saldoAtual === 0).length;
    
    // Determinar situação geral
    let situacao = "";
    let analise = "";
    let recomendacoes = [];
    
    if (totalDivida === 0) {
      situacao = "saudável";
      analise = `A empresa possui ${totalFornecedores} fornecedor(es) com contas correntes, mas não há saldo devedor significativo no momento. Todos os compromissos estão regularizados.`;
      recomendacoes.push("Manter a política atual de pagamentos.");
      recomendacoes.push("Continuar monitorando os prazos de vencimento.");
    } else if (totalDivida > 10000000) {
      situacao = "crítica";
      analise = `A empresa possui ${totalFornecedores} fornecedor(es), dos quais ${fornecedoresComDivida} tem saldo devedor. Dívida total: ${formatarNumero(totalDivida)} Kz. Situação CRÍTICA: O endividamento ultrapassa 10 milhões de Kwanzas, representando um risco grave para a liquidez e continuidade das operações.`;
      recomendacoes.push("URGENTE: Convocar reunião com os 3 maiores fornecedores para renegociação de prazos.");
      recomendacoes.push("Elaborar plano de pagamento com metas semanais realistas.");
      recomendacoes.push("Avaliar linhas de crédito bancário para alongamento da dívida.");
    } else if (totalDivida > 5000000) {
      situacao = "alerta";
      analise = `A empresa possui ${totalFornecedores} fornecedor(es), dos quais ${fornecedoresComDivida} tem saldo devedor. Dívida total: ${formatarNumero(totalDivida)} Kz. Situação de ALERTA: A dívida superior a 5 milhões de Kwanzas exige gestão cuidadosa.`;
      recomendacoes.push("Priorizar pagamento dos fornecedores com maior saldo.");
      recomendacoes.push("Negociar prazos maiores com fornecedores estratégicos.");
      recomendacoes.push("Revisar contratos buscando descontos para pagamento antecipado.");
    } else if (totalDivida > 1000000) {
      situacao = "moderada";
      analise = `A empresa possui ${totalFornecedores} fornecedor(es), dos quais ${fornecedoresComDivida} tem saldo devedor. Dívida total: ${formatarNumero(totalDivida)} Kz. Situação MODERADA: A dívida está dentro de parâmetros controláveis.`;
      recomendacoes.push("Manter cronograma regular de pagamentos.");
      recomendacoes.push("Evitar acumulo de novas dívidas sem planejamento.");
    } else {
      situacao = "controlada";
      analise = `A empresa possui ${totalFornecedores} fornecedor(es), com dívida total de ${formatarNumero(totalDivida)} Kz. Situação CONTROLADA: O nível de endividamento é considerado normal e saudável.`;
      recomendacoes.push("Continuar com a disciplina financeira atual.");
    }
    
    // Análise por fornecedor
    if (fornecedoresCriticos.length > 0) {
      analise += `\n\nDETALHAMENTO POR FORNECEDOR:\n`;
      
      for (const f of fornecedoresCriticos.slice(0, 10)) {
        const percentual = (f.saldoAtual / totalDivida) * 100;
        analise += `- ${f.nome}: ${formatarNumero(f.saldoAtual)} Kz (${percentual.toFixed(1)}% da dívida total)\n`;
        
        if (f.saldoAtual > 1000000) {
          recomendacoes.push(`PRIORIDADE MÁXIMA: Negociar plano de pagamento com ${f.nome} (saldo de ${formatarNumero(f.saldoAtual)} Kz).`);
        } else if (f.saldoAtual > 500000) {
          recomendacoes.push(`ATENÇÃO PREFERENCIAL: Regularizar situação com ${f.nome} - saldo de ${formatarNumero(f.saldoAtual)} Kz.`);
        }
      }
    }
    
    return {
      totalFornecedores,
      totalDivida,
      fornecedoresComDivida,
      fornecedoresZerados,
      fornecedoresCriticos: fornecedoresCriticos.slice(0, 15),
      situacao,
      analise,
      recomendacoes
    };
    
  } catch (error) {
    console.error('Erro ao analisar contas correntes:', error);
    return {
      totalFornecedores: 0,
      totalDivida: 0,
      fornecedoresComDivida: 0,
      fornecedoresZerados: 0,
      fornecedoresCriticos: [],
      situacao: "erro",
      analise: "Ocorreu um erro ao carregar os dados das contas correntes.",
      recomendacoes: ["Contactar o administrador do sistema para verificar o módulo de contas correntes."]
    };
  }
}

// ============================================
// FUNÇÕES AUXILIARES DE CÁLCULO
// ============================================

async function calcularSaldoEmConta(empresaId, dataRef) {
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
        saldoInicial: banco.saldoInicial || 0,
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldoAtual: saldoConta,
        percentual: 0
      });
    }
    
    detalhesContas.forEach(conta => {
      conta.percentual = saldoTotalContas > 0 ? (conta.saldoAtual / saldoTotalContas) * 100 : 0;
    });
    
    return { saldoTotal: saldoTotalContas, detalhesContas };
  } catch (error) {
    console.error('Erro ao calcular saldo:', error);
    return { saldoTotal: 0, detalhesContas: [] };
  }
}

function calcularDatasPeriodo(tipoPeriodo, ano, mes) {
  let dataInicio, dataFim, nomePeriodo;
  const anoNum = parseInt(ano);
  const mesNum = parseInt(mes);
  
  if (tipoPeriodo === 'mensal' || tipoPeriodo === 'Mensal') {
    dataInicio = new Date(anoNum, mesNum - 1, 1);
    dataFim = new Date(anoNum, mesNum, 0);
    nomePeriodo = meses[mesNum - 1];
  } else if (tipoPeriodo === 'anual' || tipoPeriodo === 'Anual') {
    dataInicio = new Date(anoNum, 0, 1);
    dataFim = new Date(anoNum, 11, 31);
    nomePeriodo = `Ano ${anoNum}`;
  } else {
    dataInicio = new Date(anoNum, mesNum - 1, 1);
    dataFim = new Date(anoNum, mesNum, 0);
    nomePeriodo = meses[mesNum - 1];
  }
  
  dataFim.setHours(23, 59, 59, 999);
  return { dataInicio, dataFim, nomePeriodo };
}

async function buscarIndicadoresEmpresa(empresaId) {
  const [funcionarios, clientes, fornecedores, produtos, viaturas, pagamentosFolha] = await Promise.all([
    Funcionario.find({ empresaId }),
    Cliente.find({ empresaId }),
    Fornecedor.find({ empresaId }),
    Stock.find({ empresaId }),
    Viatura.find({ empresaId }),
    Pagamento.find({ empresaId, tipo: 'Folha Salarial', status: 'Pago' })
  ]);
  
  const funcionariosAtivos = funcionarios.filter(f => f.status === 'Ativo' || f.status === 'ativo').length;
  const salarioTotal = pagamentosFolha.reduce((sum, p) => sum + (p.valor || 0), 0);
  const salarioMedio = funcionarios.length > 0 ? salarioTotal / funcionarios.length : 0;
  const quantidadeTotalStock = produtos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
  const valorTotalStock = produtos.reduce((sum, p) => sum + ((p.precoVenda || 0) * (p.quantidade || 0)), 0);
  const viaturasAtivas = viaturas.filter(v => v.ativo === true).length;
  
  return {
    totalFuncionarios: funcionarios.length,
    funcionariosAtivos,
    salarioTotal,
    salarioMedio,
    totalClientes: clientes.length,
    totalFornecedores: fornecedores.length,
    totalProdutos: produtos.length,
    quantidadeTotalStock,
    valorTotalStock,
    totalViaturas: viaturas.length,
    viaturasAtivas
  };
}

async function calcularIndicadoresFinanceiros(empresaId, dataInicio, dataFim) {
  const [vendas, pagamentos] = await Promise.all([
    Venda.find({ empresaId, status: 'finalizada', data: { $gte: dataInicio, $lte: dataFim } }),
    Pagamento.find({ empresaId, dataPagamento: { $gte: dataInicio, $lte: dataFim } })
  ]);
  
  const saldoInicial = await calcularSaldoEmConta(empresaId, dataInicio);
  const saldoFinal = await calcularSaldoEmConta(empresaId, dataFim);
  
  let totalReceitas = 0;
  vendas.forEach(v => { totalReceitas += v.total || 0; });
  
  let despesasFornecedores = 0, despesasSalarios = 0, despesasImpostos = 0, despesasOutros = 0;
  pagamentos.forEach(p => {
    const valor = p.valor || 0;
    if (p.tipo === 'Fornecedor') despesasFornecedores += valor;
    else if (p.tipo === 'Folha Salarial') despesasSalarios += valor;
    else if (p.tipo === 'Imposto') despesasImpostos += valor;
    else despesasOutros += valor;
  });
  
  const totalDespesas = despesasFornecedores + despesasSalarios + despesasImpostos + despesasOutros;
  const resultadoAntesImpostos = totalReceitas - totalDespesas;
  const imposto = resultadoAntesImpostos > 0 ? resultadoAntesImpostos * 0.25 : 0;
  const resultadoLiquido = resultadoAntesImpostos - imposto;
  const margemLucro = totalReceitas > 0 ? (resultadoLiquido / totalReceitas) * 100 : 0;
  const margemBruta = totalReceitas > 0 ? (resultadoAntesImpostos / totalReceitas) * 100 : 0;
  const ticketMedio = vendas.length > 0 ? totalReceitas / vendas.length : 0;
  
  // Top clientes
  const clientesMap = new Map();
  vendas.forEach(v => {
    if (v.cliente) {
      if (clientesMap.has(v.cliente)) clientesMap.get(v.cliente).total += v.total;
      else clientesMap.set(v.cliente, { nome: v.cliente, total: v.total });
    }
  });
  const topClientes = Array.from(clientesMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  
  return {
    saldoInicial: saldoInicial.saldoTotal,
    saldoFinal: saldoFinal.saldoTotal,
    detalhesContas: saldoFinal.detalhesContas,
    totalReceitas,
    totalDespesas,
    despesasPorCategoria: { fornecedores: despesasFornecedores, salarios: despesasSalarios, impostos: despesasImpostos, outros: despesasOutros },
    resultadoAntesImpostos,
    imposto,
    resultadoLiquido,
    margemLucro: margemLucro.toFixed(2),
    margemBruta: margemBruta.toFixed(2),
    ticketMedio,
    totalVendas: vendas.length,
    topClientes
  };
}

// ============================================
// FUNÇÃO PRINCIPAL DE GERAÇÃO DE TEXTO
// ============================================

function gerarTextoHonesto(empresaNome, indicadoresEmpresa, financeiros, periodo, contasCorrentes) {
  const { 
    saldoInicial, saldoFinal, totalReceitas, totalDespesas, resultadoLiquido, 
    margemLucro, margemBruta, ticketMedio, totalVendas, despesasPorCategoria 
  } = financeiros;
  
  const { totalFuncionarios, totalClientes, totalProdutos, totalViaturas } = indicadoresEmpresa;
  
  const variacaoSaldo = analisarVariacaoSaldo(saldoInicial, saldoFinal);
  const resultadoAnalise = analisarResultado(resultadoLiquido, margemLucro);
  const eficienciaAnalise = analisarEficiencia(margemBruta, margemLucro);
  
  let textoVariacaoSaldo = "";
  if (variacaoSaldo.positivo) {
    textoVariacaoSaldo = `evolução favorável, com ${variacaoSaldo.descricao}, sinalizando uma gestão de tesouraria eficaz`;
  } else {
    textoVariacaoSaldo = `evolução desfavorável, com ${variacaoSaldo.descricao}, situação que merece atenção da administração`;
  }
  
  // INTRODUÇÃO
  const introducao = `O presente Relatório de Gestão, elaborado nos termos da legislação comercial angolana e das boas práticas de governação corporativa, tem como objectivo primordial apresentar uma análise exaustiva e pormenorizada da execução financeira, operacional e estratégica da sociedade comercial denominada "${empresaNome}", relativamente ao período compreendido entre ${periodo.dataInicio.toLocaleDateString('pt-AO')} e ${periodo.dataFim.toLocaleDateString('pt-AO')}, correspondente ao ${periodo.nomePeriodo} do exercício económico em curso.

Este documento constitui um instrumento de gestão fundamental para a tomada de decisões informadas, permitindo aos órgãos de administração, accionistas e demais stakeholders uma visão clara e transparente do desempenho organizacional. A metodologia adoptada para a elaboração deste relatório baseou-se na recolha, tratamento e análise crítica dos dados financeiros e operacionais registados no sistema de gestão empresarial, abrangendo todas as áreas funcionais da organização, designadamente: área comercial, financeira, recursos humanos, logística, frota, inventário e contas correntes.

Durante o período em análise, a empresa manteve o seu compromisso com a excelência operacional e a satisfação dos seus clientes, tendo implementado diversas acções com vista à optimização dos seus processos internos e à melhoria contínua da qualidade dos serviços prestados. Os resultados alcançados reflectem o esforço colectivo de toda a equipa e a eficácia das estratégias delineadas pela administração.

Importa salientar que este relatório foi produzido em conformidade com os princípios de transparência, rigor e objectividade, constituindo-se como uma ferramenta de trabalho indispensável para a avaliação do desempenho organizacional e para a definição de objectivos futuros. A análise aqui apresentada baseia-se em dados reais devidamente validados, garantindo a fiabilidade e a credibilidade das informações constantes do presente documento.`;

  // ENQUADRAMENTO GERAL
  const textoVendas = `${totalVendas} ${pluralizar(totalVendas, "transacção comercial", "transacções comerciais")}`;
  const textoResultado = resultadoLiquido !== 0 ? `${formatarNumero(Math.abs(resultadoLiquido))} Kwanzas` : "zero Kwanzas";
  const textoSinal = resultadoLiquido > 0 ? "lucro" : (resultadoLiquido < 0 ? "prejuízo" : "equilíbrio");
  
  const enquadramento = `No período em análise, a "${empresaNome}" registou receitas totais no montante de ${formatarNumero(totalReceitas)} Kwanzas, provenientes da comercialização de produtos e da prestação de serviços, com destaque para as transacções comerciais realizadas com os seus clientes, que totalizaram ${textoVendas}. Do lado das despesas, a empresa incorreu em custos totais de ${formatarNumero(totalDespesas)} Kwanzas, distribuídos pelas seguintes categorias: pagamentos a fornecedores (${totalDespesas > 0 ? ((despesasPorCategoria.fornecedores / totalDespesas) * 100).toFixed(1) : 0}% do total), despesas com pessoal (${totalDespesas > 0 ? ((despesasPorCategoria.salarios / totalDespesas) * 100).toFixed(1) : 0}%), obrigações fiscais (${totalDespesas > 0 ? ((despesasPorCategoria.impostos / totalDespesas) * 100).toFixed(1) : 0}%) e outras despesas (${totalDespesas > 0 ? ((despesasPorCategoria.outros / totalDespesas) * 100).toFixed(1) : 0}%).

O resultado antes de impostos apurado foi de ${formatarNumero(financeiros.resultadoAntesImpostos)} Kwanzas. ${financeiros.resultadoAntesImpostos > 0 ? `Após a aplicação do imposto industrial à taxa de 25%, no montante de ${formatarNumero(financeiros.imposto)} Kwanzas, o resultado líquido do período foi de ${formatarNumero(Math.abs(resultadoLiquido))} Kwanzas, configurando um desempenho financeiro ${resultadoAnalise.tipo} (${textoSinal} de ${textoResultado}).` : `Não houve imposto a pagar uma vez que não se registou lucro tributável.`}

A margem de lucro líquida situou-se em ${margemLucro}%, enquanto a margem bruta se fixou em ${margemBruta}%. A eficiência operacional é considerada ${eficienciaAnalise}. O ticket médio das transacções foi de ${formatarNumero(ticketMedio)} Kwanzas.

No que concerne à liquidez, o saldo bancário ${textoVariacaoSaldo}. Partiu de ${formatarNumero(saldoInicial)} Kwanzas no início do período e encerrou em ${formatarNumero(saldoFinal)} Kwanzas no final do período.${financeiros.detalhesContas && financeiros.detalhesContas.length > 0 ? ` A distribuição do saldo pelas contas bancárias é: ${financeiros.detalhesContas.map(c => `${c.nome}: ${formatarNumero(c.saldoAtual)} Kz (${c.percentual.toFixed(1)}%)`).join(', ')}.` : ''}`;

  // ANÁLISE FINANCEIRA
  let analiseFinanceira = `A análise financeira detalhada da "${empresaNome}" revela aspectos importantes sobre a saúde financeira da organização. As receitas totais de ${formatarNumero(totalReceitas)} Kwanzas reflectem a actividade comercial do período. `;

  if (resultadoLiquido < 0) {
    analiseFinanceira += `O resultado líquido negativo de ${formatarNumero(Math.abs(resultadoLiquido))} Kwanzas indica que a empresa está a gastar mais do que arrecada. Esta situação requer uma revisão aprofundada da estrutura de custos e da política de preços. Recomenda-se a implementação de medidas de contenção de despesas e aumento da eficiência operacional. `;
  } else if (parseFloat(margemLucro) < 10 && resultadoLiquido > 0) {
    analiseFinanceira += `Embora a empresa tenha gerado lucro de ${formatarNumero(resultadoLiquido)} Kwanzas, a margem reduzida de ${margemLucro}% sugere vulnerabilidade a pequenas variações nos custos ou receitas. Recomenda-se a optimização da eficiência operacional. `;
  } else if (parseFloat(margemLucro) > 25) {
    analiseFinanceira += `A excelente margem de lucro de ${margemLucro}% demonstra a capacidade da empresa de gerar valor a partir das suas operações, posicionando-a acima da média do sector. `;
  }

  if (parseFloat(margemBruta) < 0) {
    analiseFinanceira += `A margem bruta negativa de ${margemBruta}% é preocupante, indicando que as operações principais estão a gerar prejuízo antes mesmo de considerar despesas administrativas ou financeiras. `;
  }

  // ANÁLISE DE CONTAS CORRENTES
  let analiseContasCorrentes = "";
  if (contasCorrentes && contasCorrentes.totalFornecedores > 0) {
    analiseContasCorrentes = `\n\nANÁLISE DE CONTAS CORRENTES\n`;
    analiseContasCorrentes += `${contasCorrentes.analise}\n`;
  } else if (contasCorrentes && contasCorrentes.totalFornecedores === 0) {
    analiseContasCorrentes = `\n\nANÁLISE DE CONTAS CORRENTES\n`;
    analiseContasCorrentes += `${contasCorrentes.analise}\n`;
  }

  // ANÁLISE OPERACIONAL
  const textoFuncionarios = `${totalFuncionarios} ${pluralizar(totalFuncionarios, "colaborador", "colaboradores")}`;
  const textoClientes = `${totalClientes} ${pluralizar(totalClientes, "cliente cadastrado", "clientes cadastrados")}`;
  const textoProdutos = `${totalProdutos} ${pluralizar(totalProdutos, "produto", "produtos")}`;
  
  let analiseOperacional = `Do ponto de vista operacional, a empresa realizou ${totalVendas} ${pluralizar(totalVendas, "transacção comercial", "transacções comerciais")} no período. `;

  if (totalVendas === 0) {
    analiseOperacional += `A ausência de vendas é um sinal de alerta que requer investigação imediata. `;
  } else if (totalVendas < 10) {
    analiseOperacional += `O volume reduzido de negócios sugere necessidade de reforço das acções de marketing e prospecção. `;
  }

  if (totalFuncionarios === 0) {
    analiseOperacional += `A empresa não possui colaboradores registados, lacuna que compromete a gestão de recursos humanos. `;
  } else {
    analiseOperacional += `A equipa é composta por ${textoFuncionarios}. `;
  }

  if (totalClientes === 0) {
    analiseOperacional += `Não existem ${textoClientes}, o que limita a análise do relacionamento comercial. `;
  } else {
    analiseOperacional += `Existem ${textoClientes}. `;
  }

  if (totalProdutos === 0) {
    analiseOperacional += `O cadastro de produtos está vazio, impossibilitando o controlo de inventário. `;
  } else {
    analiseOperacional += `O inventário conta com ${textoProdutos}. `;
  }

  if (totalViaturas > 0) {
    analiseOperacional += `A frota é constituída por ${totalViaturas} ${pluralizar(totalViaturas, "viatura", "viaturas")}. `;
  }

  // RECOMENDAÇÕES
  const todasRecomendacoes = [];
  
  if (resultadoLiquido < 0) {
    todasRecomendacoes.push("Implementação urgente de um plano de recuperação financeira com metas mensais de redução de custos e aumento de receitas.");
    todasRecomendacoes.push("Revisão aprofundada da estrutura de custos, identificando e eliminando despesas não essenciais.");
    todasRecomendacoes.push("Reavaliação da política de preços praticados, considerando a concorrência e o valor percebido pelos clientes.");
  }
  
  if (!variacaoSaldo.positiva) {
    todasRecomendacoes.push("Reforço da gestão de tesouraria através da negociação de prazos alargados com fornecedores e aceleração de recebimentos de clientes.");
  }
  
  if (totalVendas < 10) {
    todasRecomendacoes.push("Desenvolvimento de um plano estratégico de marketing e vendas com acções concretas de prospecção de clientes.");
    todasRecomendacoes.push("Capacitação da equipa comercial em técnicas de vendas, negociação e relacionamento com clientes.");
  }
  
  if (totalClientes === 0) {
    todasRecomendacoes.push("Cadastramento urgente dos clientes no sistema para permitir gestão do relacionamento e análise de comportamento de compra.");
  }
  
  if (totalFuncionarios === 0) {
    todasRecomendacoes.push("Registo dos colaboradores no sistema, fundamental para gestão de folha salarial, controlo de férias e avaliação de desempenho.");
  }
  
  if (totalProdutos === 0) {
    todasRecomendacoes.push("Estruturação do catálogo de produtos/serviços no sistema para controlo de inventário e análise de rentabilidade por item.");
  }
  
  if (parseFloat(margemLucro) > 0 && parseFloat(margemLucro) < 10) {
    todasRecomendacoes.push("Optimização da eficiência operacional para aumento da margem de lucro, através da revisão de processos e redução de desperdícios.");
    todasRecomendacoes.push("Revisão de contratos com fornecedores em busca de melhores condições comerciais e prazos de pagamento.");
  }
  
  // Adicionar recomendações das contas correntes
  if (contasCorrentes && contasCorrentes.recomendacoes) {
    for (const rec of contasCorrentes.recomendacoes) {
      if (!todasRecomendacoes.includes(rec)) {
        todasRecomendacoes.push(rec);
      }
    }
  }
  
  if (todasRecomendacoes.length < 5) {
    todasRecomendacoes.push("Monitoramento regular dos indicadores de desempenho com reuniões mensais de análise de resultados e acções correctivas.");
    todasRecomendacoes.push("Investimento em formação e desenvolvimento contínuo da equipa nas áreas identificadas como oportunidades de melhoria.");
    todasRecomendacoes.push("Estabelecimento de um sistema de metas e incentivos alinhado com os objectivos estratégicos da organização.");
  }

  // Formatar recomendações para texto
  let textoRecomendacoes = "";
  textoRecomendacoes += "Com base na análise efectuada, recomenda-se:\n\n";
  todasRecomendacoes.forEach((rec, index) => {
    textoRecomendacoes += `${index + 1}. ${rec}\n`;
  });

  // CONCLUSÃO
  let conclusao = ``;
  conclusao += `Em síntese, o presente Relatório de Gestão permite concluir que a "${empresaNome}" encerrou o período ${periodo.nomePeriodo} com um desempenho financeiro ${resultadoAnalise.tipo}. `;

  if (resultadoLiquido > 0) {
    conclusao += `A empresa gerou lucro de ${formatarNumero(resultadoLiquido)} Kwanzas, `;
    if (parseFloat(margemLucro) < 10) {
      conclusao += `embora com margem reduzida (${margemLucro}%), o que indica espaço para melhoria da eficiência operacional. `;
    } else {
      conclusao += `com margem de ${margemLucro}%, demonstrando boa capacidade de geração de valor. `;
    }
  } else if (resultadoLiquido < 0) {
    conclusao += `A empresa registou prejuízo de ${formatarNumero(Math.abs(resultadoLiquido))} Kwanzas, situação que exige acção correctiva urgente por parte da administração. `;
  } else {
    conclusao += `A empresa atingiu o ponto de equilíbrio, sem lucro nem prejuízo, situação que requer identificação de oportunidades de crescimento. `;
  }

  if (variacaoSaldo.positivo) {
    conclusao += `O saldo bancário evoluiu favoravelmente (${variacaoSaldo.descricao}), sinal positivo para a liquidez da organização. `;
  } else if (!variacaoSaldo.positiva && variacaoSaldo.tipo !== "estável") {
    conclusao += `O saldo bancário reduziu-se (${variacaoSaldo.descricao}), merecendo atenção especial na gestão de tesouraria. `;
  }

  if (contasCorrentes && contasCorrentes.totalDivida > 5000000) {
    conclusao += `O elevado endividamento com fornecedores (${formatarNumero(contasCorrentes.totalDivida)} Kz) representa um risco significativo que requer gestão prioritária. `;
  }

  if (totalVendas === 0 || totalClientes === 0 || totalFuncionarios === 0) {
    conclusao += `Verifica-se a necessidade de preenchimento de dados críticos no sistema (${totalVendas === 0 ? 'vendas' : ''}${totalClientes === 0 ? ' clientes' : ''}${totalFuncionarios === 0 ? ' funcionários' : ''}), fundamentais para uma gestão mais eficaz. `;
  }

  conclusao += `Recomenda-se a implementação das medidas propostas e o acompanhamento contínuo dos indicadores de desempenho. A administração mantém o compromisso com a melhoria contínua, a transparência na gestão e a criação de valor sustentável para todos os stakeholders.`;

  return {
    introducao,
    enquadramento,
    analiseFinanceira,
    analiseOperacional,
    analiseContasCorrentes,
    recomendacoes: textoRecomendacoes,
    conclusao
  };
}

// ============================================
// ROTA PRINCIPAL
// ============================================
router.get('/completo', async (req, res) => {
  try {
    const { empresaId, tipoPeriodo, ano, mes } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ erro: "Empresa não informada" });
    }
    
    const periodo = calcularDatasPeriodo(tipoPeriodo || 'mensal', ano, mes);
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ erro: "Empresa não encontrada" });
    }
    
    // Buscar dados em paralelo
    const [indicadoresEmpresa, financeiros, contasCorrentes] = await Promise.all([
      buscarIndicadoresEmpresa(empresaId),
      calcularIndicadoresFinanceiros(empresaId, periodo.dataInicio, periodo.dataFim),
      analisarContasCorrentes(empresaId)
    ]);
    
    const texto = gerarTextoHonesto(empresa.nome, indicadoresEmpresa, financeiros, periodo, contasCorrentes);
    
    const relatorioCompleto = {
      sucesso: true,
      empresa: { 
        nome: empresa.nome, 
        nif: empresa.nif, 
        endereco: empresa.endereco 
      },
      periodo: { 
        tipo: tipoPeriodo || 'mensal', 
        nome: periodo.nomePeriodo, 
        dataInicio: periodo.dataInicio, 
        dataFim: periodo.dataFim 
      },
      dataGeracao: new Date().toLocaleString("pt-AO"),
      indicadoresEmpresa,
      indicadoresFinanceiros: financeiros,
      contasCorrentes: {
        totalFornecedores: contasCorrentes.totalFornecedores,
        totalDivida: contasCorrentes.totalDivida,
        fornecedoresComDivida: contasCorrentes.fornecedoresComDivida || 0,
        fornecedoresZerados: contasCorrentes.fornecedoresZerados || 0,
        fornecedoresCriticos: contasCorrentes.fornecedoresCriticos,
        situacao: contasCorrentes.situacao,
        analise: contasCorrentes.analise,
        recomendacoes: contasCorrentes.recomendacoes
      },
      texto: {
        introducao: texto.introducao,
        enquadramento: texto.enquadramento,
        analiseFinanceira: texto.analiseFinanceira,
        analiseOperacional: texto.analiseOperacional,
        analiseContasCorrentes: texto.analiseContasCorrentes,
        recomendacoes: texto.recomendacoes,
        conclusao: texto.conclusao
      },
      topClientes: financeiros.topClientes
    };
    
    // Salvar no histórico
    try {
      const relatorioDoc = new Relatorio({
        titulo: `Relatório de Gestão - ${periodo.nomePeriodo}`,
        tipo: "completo",
        periodo: { 
          mes: parseInt(mes) || new Date().getMonth() + 1, 
          ano: parseInt(ano), 
          nomeMes: periodo.nomePeriodo 
        },
        dados: relatorioCompleto,
        empresaId,
        usuario: req.user?.nome || 'Sistema'
      });
      await relatorioDoc.save();
    } catch (err) {
      console.log("Erro ao salvar histórico:", err.message);
    }
    
    res.json(relatorioCompleto);
    
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ erro: error.message });
  }
});

// ============================================
// ROTAS DE HISTÓRICO
// ============================================
router.get('/historico/listar', async (req, res) => {
  try {
    const { empresaId, page = 1, limit = 10 } = req.query;
    if (!empresaId) {
      return res.status(400).json({ erro: "Empresa não informada" });
    }
    
    const relatorios = await Relatorio.find({ empresaId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    const total = await Relatorio.countDocuments({ empresaId });
    
    res.json({ 
      relatorios, 
      total, 
      pagina: parseInt(page), 
      totalPaginas: Math.ceil(total / parseInt(limit)) 
    });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.get('/detalhes/:id', async (req, res) => {
  try {
    const relatorio = await Relatorio.findById(req.params.id);
    if (!relatorio) {
      return res.status(404).json({ erro: "Relatório não encontrado" });
    }
    
    relatorio.downloads = (relatorio.downloads || 0) + 1;
    await relatorio.save();
    
    res.json(relatorio);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Relatorio.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;