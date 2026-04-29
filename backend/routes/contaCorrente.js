// backend/routes/relatorios.js - VERSAO CORRIGIDA USANDO DADOS REAIS DAS CONTAS CORRENTES
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
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
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
  
  let tipo = "estavel";
  let descricao = "";
  let positivo = false;
  
  if (variacaoAbsoluta > 0) {
    positivo = true;
    if (variacaoPercentual > 20) {
      tipo = "crescimento_expressivo";
      descricao = `crescimento expressivo de mais ${variacaoPercentual.toFixed(2)} por cento`;
    } else if (variacaoPercentual > 5) {
      tipo = "crescimento_moderado";
      descricao = `crescimento moderado de mais ${variacaoPercentual.toFixed(2)} por cento`;
    } else if (variacaoPercentual > 0) {
      tipo = "crescimento_leve";
      descricao = `ligeiro aumento de mais ${variacaoPercentual.toFixed(2)} por cento`;
    }
  } else if (variacaoAbsoluta < 0) {
    positivo = false;
    if (variacaoPercentual < -20) {
      tipo = "queda_expressiva";
      descricao = `diminuicao significativa de ${Math.abs(variacaoPercentual).toFixed(2)} por cento`;
    } else if (variacaoPercentual < -5) {
      tipo = "queda_moderada";
      descricao = `reducao de ${Math.abs(variacaoPercentual).toFixed(2)} por cento`;
    } else if (variacaoPercentual < 0) {
      tipo = "queda_leve";
      descricao = `ligeira diminuicao de ${Math.abs(variacaoPercentual).toFixed(2)} por cento`;
    }
  } else {
    descricao = `manutencao do mesmo valor 0 por cento`;
  }
  
  return { tipo, descricao, variacaoPercentual, variacaoAbsoluta, positivo };
}

function analisarResultado(resultadoLiquido, margemLucro) {
  const resultadoAbs = Math.abs(resultadoLiquido);
  const margem = parseFloat(margemLucro);
  
  if (resultadoLiquido > 0) {
    if (margem > 25) {
      return { tipo: "excelente", positivo: true };
    }
    if (margem > 10) {
      return { tipo: "bom", positivo: true };
    }
    if (margem > 0) {
      return { tipo: "moderado", positivo: true };
    }
    return { tipo: "positivo", positivo: true };
  } else if (resultadoLiquido < 0) {
    if (margem < -20) {
      return { tipo: "critico", positivo: false };
    }
    if (margem < -5) {
      return { tipo: "preocupante", positivo: false };
    }
    return { tipo: "negativo", positivo: false };
  }
  return { tipo: "neutro", positivo: true };
}

function analisarEficiencia(margemBruta) {
  const margem = parseFloat(margemBruta);
  if (margem < 0) return "ineficiente";
  if (margem < 5) return "baixa";
  if (margem < 15) return "moderada";
  if (margem < 25) return "boa";
  return "excelente";
}

// FUNCAO CORRIGIDA - USA DADOS REAIS DA TABELA CONTA CORRENTE
async function analisarContasCorrentes(empresaId) {
  try {
    // Buscar todas as contas correntes da empresa
    const contas = await ContaCorrente.find({ 
      empresaId: empresaId,
      tipo: 'Fornecedor'
    });
    
    let totalCreditos = 0;  // Total de faturas/creditos (empresa deve)
    let totalDebitos = 0;   // Total de pagamentos/debitos (empresa pagou)
    let fornecedoresDetalhados = [];
    
    for (const conta of contas) {
      // Calcular totais a partir dos movimentos reais
      let creditosConta = 0;
      let debitosConta = 0;
      let movimentosDetalhados = [];
      
      for (const movimento of conta.movimentos) {
        if (movimento.tipo === 'Credito' || movimento.tipo === 'Crédito') {
          creditosConta += movimento.valor;
          movimentosDetalhados.push({
            tipo: 'Credito',
            valor: movimento.valor,
            data: movimento.data,
            descricao: movimento.descricao,
            status: movimento.status || 'Pendente'
          });
        } else if (movimento.tipo === 'Debito' || movimento.tipo === 'Débito') {
          debitosConta += movimento.valor;
          movimentosDetalhados.push({
            tipo: 'Debito',
            valor: movimento.valor,
            data: movimento.data,
            descricao: movimento.descricao
          });
        }
      }
      
      totalCreditos += creditosConta;
      totalDebitos += debitosConta;
      
      const saldoAtual = conta.saldo || (creditosConta - debitosConta);
      
      fornecedoresDetalhados.push({
        id: conta._id,
        nome: conta.beneficiario,
        nif: conta.beneficiarioDocumento || 'Nao informado',
        totalCreditos: creditosConta,   // Total de faturas (empresa deve)
        totalDebitos: debitosConta,     // Total pago
        saldoAtual: saldoAtual,          // Saldo restante
        movimentos: movimentosDetalhados.slice(-10), // Ultimos 10 movimentos
        quantidadeMovimentos: movimentosDetalhados.length
      });
    }
    
    const saldoLiquido = totalCreditos - totalDebitos;
    const percentualPago = totalCreditos > 0 ? (totalDebitos / totalCreditos) * 100 : 0;
    
    // Identificar fornecedores criticos com base nos dados reais
    const fornecedoresCriticos = fornecedoresDetalhados
      .filter(f => f.saldoAtual > 100000)
      .sort((a, b) => b.saldoAtual - a.saldoAtual);
    
    // Analise inteligente baseada nos dados reais
    let analise = "";
    let recomendacoes = [];
    
    if (fornecedoresDetalhados.length === 0) {
      analise = "Nao existem contas correntes de fornecedores registadas no sistema.";
      recomendacoes.push("Cadastrar fornecedores e criar contas correntes.");
    } else {
      analise = `A empresa possui ${fornecedoresDetalhados.length} fornecedor(es) com contas correntes ativas. `;
      analise += `Total de creditos (faturas): ${formatarNumero(totalCreditos)} Kz. `;
      analise += `Total de pagamentos realizados: ${formatarNumero(totalDebitos)} Kz. `;
      analise += `Saldo remanescente: ${formatarNumero(saldoLiquido)} Kz. `;
      analise += `Percentual de pagamento: ${percentualPago.toFixed(1)} por cento. `;
      
      if (saldoLiquido > 10000000) {
        analise += `Situacao CRITICA: divida muito elevada com fornecedores. `;
        recomendacoes.push("PRIORIDADE MAXIMA: Negociar urgentemente com todos os fornecedores.");
        recomendacoes.push("Estabelecer plano de pagamento parcelado para reduzir o passivo.");
      } else if (saldoLiquido > 5000000) {
        analise += `Situacao de ALERTA: divida consideravel com fornecedores. `;
        recomendacoes.push("Prioridade alta: Revisar contratos e negociar prazos maiores.");
      } else if (saldoLiquido > 1000000) {
        analise += `Situacao MODERADA: divida controlavel mas requer atencao. `;
        recomendacoes.push("Monitorar prazos de pagamento para evitar atrasos.");
      } else if (saldoLiquido > 0) {
        analise += `Situacao SAUDAVEL: divida dentro dos parametros normais. `;
        recomendacoes.push("Manter politica atual de pagamentos.");
      } else {
        analise += `Situacao POSITIVA: empresa com credito a receber de fornecedores. `;
      }
      
      // Adicionar fornecedores criticos
      if (fornecedoresCriticos.length > 0) {
        analise += `\n\nFORNECEDORES COM MAIOR SALDO DEVEDOR:\n`;
        for (const f of fornecedoresCriticos.slice(0, 10)) {
          analise += `- ${f.nome}: ${formatarNumero(f.saldoAtual)} Kz (Faturas: ${formatarNumero(f.totalCreditos)} Kz, Pago: ${formatarNumero(f.totalDebitos)} Kz)\n`;
          
          if (f.saldoAtual > 1000000) {
            recomendacoes.push(`URGENTE: Negociar plano com ${f.nome} - saldo de ${formatarNumero(f.saldoAtual)} Kz.`);
          } else if (f.saldoAtual > 500000) {
            recomendacoes.push(`ATENCAO: Regularizar situacao com ${f.nome} - saldo de ${formatarNumero(f.saldoAtual)} Kz.`);
          }
        }
      }
    }
    
    return {
      totalFornecedores: fornecedoresDetalhados.length,
      totalCreditos,
      totalDebitos,
      saldoLiquido,
      percentualPago: percentualPago.toFixed(1),
      fornecedoresCriticos: fornecedoresCriticos.slice(0, 15),
      fornecedoresDetalhados: fornecedoresDetalhados,
      analise,
      recomendacoes
    };
    
  } catch (error) {
    console.error('Erro ao analisar contas correntes:', error);
    return {
      totalFornecedores: 0,
      totalCreditos: 0,
      totalDebitos: 0,
      saldoLiquido: 0,
      percentualPago: "0",
      fornecedoresCriticos: [],
      fornecedoresDetalhados: [],
      analise: "Erro ao carregar dados das contas correntes.",
      recomendacoes: ["Verificar configuracao do modulo de contas correntes."]
    };
  }
}

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
    nomePeriodo = `${meses[mesNum - 1]} de ${anoNum}`;
  } else {
    dataInicio = new Date(anoNum, 0, 1);
    dataFim = new Date(anoNum, 11, 31);
    nomePeriodo = `Ano ${anoNum}`;
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
  const quantidadeTotalStock = produtos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
  const valorTotalStock = produtos.reduce((sum, p) => sum + ((p.precoVenda || 0) * (p.quantidade || 0)), 0);
  const viaturasAtivas = viaturas.filter(v => v.ativo === true).length;
  
  return {
    totalFuncionarios: funcionarios.length,
    funcionariosAtivos,
    salarioTotal,
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

router.get('/completo', async (req, res) => {
  try {
    const { empresaId, tipoPeriodo, ano, mes } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ erro: "Empresa nao informada" });
    }
    
    const periodo = calcularDatasPeriodo(tipoPeriodo || 'mensal', ano, mes);
    const empresa = await Empresa.findById(empresaId);
    
    if (!empresa) {
      return res.status(404).json({ erro: "Empresa nao encontrada" });
    }
    
    const [indicadoresEmpresa, financeiros, contasCorrentes] = await Promise.all([
      buscarIndicadoresEmpresa(empresaId),
      calcularIndicadoresFinanceiros(empresaId, periodo.dataInicio, periodo.dataFim),
      analisarContasCorrentes(empresaId)
    ]);
    
    const variacaoSaldo = analisarVariacaoSaldo(financeiros.saldoInicial, financeiros.saldoFinal);
    const resultadoAnalise = analisarResultado(financeiros.resultadoLiquido, financeiros.margemLucro);
    const eficienciaAnalise = analisarEficiencia(financeiros.margemBruta);
    
    // Montar texto do relatorio
    const introducao = `O presente Relatorio de Gestao tem como objectivo apresentar uma analise da execucao financeira e operacional da empresa "${empresa.nome}" referente ao periodo ${periodo.nomePeriodo}.`;
    
    const enquadramento = `No periodo em analise, a empresa registou receitas totais de ${formatarNumero(financeiros.totalReceitas)} Kwanzas e despesas totais de ${formatarNumero(financeiros.totalDespesas)} Kwanzas. O resultado liquido foi de ${formatarNumero(Math.abs(financeiros.resultadoLiquido))} Kwanzas (${financeiros.resultadoLiquido >= 0 ? 'lucro' : 'prejuizo'}). A margem de lucro foi de ${financeiros.margemLucro} por cento.`;
    
    const analiseFinanceira = `Analise financeira: ${financeiros.resultadoLiquido < 0 ? 'A empresa apresenta resultado negativo, necessitando revisao de custos.' : 'A empresa apresenta resultado positivo, mantendo boa saude financeira.'} A margem bruta de ${financeiros.margemBruta} por cento indica eficiencia ${eficienciaAnalise}.`;
    
    const analiseOperacional = `A empresa realizou ${financeiros.totalVendas} vendas no periodo, com ticket medio de ${formatarNumero(financeiros.ticketMedio)} Kwanzas. Conta com ${indicadoresEmpresa.totalFuncionarios} funcionarios, ${indicadoresEmpresa.totalClientes} clientes e ${indicadoresEmpresa.totalProdutos} produtos em stock.`;
    
    // Analise de contas correntes baseada em dados reais
    let analiseContasCorrentes = `\n\nANALISE DE CONTAS CORRENTES\n`;
    analiseContasCorrentes += `A empresa possui ${contasCorrentes.totalFornecedores} fornecedor(es) com contas correntes ativas. `;
    analiseContasCorrentes += `Total de creditos (faturas): ${formatarNumero(contasCorrentes.totalCreditos)} Kz. `;
    analiseContasCorrentes += `Total de pagamentos realizados: ${formatarNumero(contasCorrentes.totalDebitos)} Kz. `;
    analiseContasCorrentes += `Saldo remanescente a pagar: ${formatarNumero(contasCorrentes.saldoLiquido)} Kz. `;
    analiseContasCorrentes += `Percentual de pagamento: ${contasCorrentes.percentualPago} por cento.\n\n`;
    
    if (contasCorrentes.fornecedoresCriticos.length > 0) {
      analiseContasCorrentes += `FORNECEDORES COM MAIOR SALDO DEVEDOR:\n`;
      for (const f of contasCorrentes.fornecedoresCriticos.slice(0, 10)) {
        analiseContasCorrentes += `- ${f.nome}: ${formatarNumero(f.saldoAtual)} Kz (Faturas: ${formatarNumero(f.totalCreditos)} Kz, Pago: ${formatarNumero(f.totalDebitos)} Kz)\n`;
      }
    }
    
    // Recomendacoes
    let recomendacoesTexto = `\n\nRECOMENDACOES ESTRATEGICAS\n`;
    recomendacoesTexto += `Com base na analise, recomenda-se:\n\n`;
    
    const todasRecomendacoes = [];
    
    if (financeiros.resultadoLiquido < 0) {
      todasRecomendacoes.push("ALTA PRIORIDADE: Implementar plano de reducao de custos e aumento de receitas.");
      todasRecomendacoes.push("Revisar politica de precos e margens de lucro.");
    }
    
    if (contasCorrentes.saldoLiquido > 5000000) {
      todasRecomendacoes.push("URGENTE: Negociar planos de pagamento com fornecedores para reduzir passivo.");
    }
    
    for (const rec of contasCorrentes.recomendacoes) {
      if (!todasRecomendacoes.includes(rec)) {
        todasRecomendacoes.push(rec);
      }
    }
    
    if (indicadoresEmpresa.totalClientes === 0) {
      todasRecomendacoes.push("Cadastrar clientes no sistema para melhor gestao comercial.");
    }
    
    if (indicadoresEmpresa.totalFuncionarios === 0) {
      todasRecomendacoes.push("Registrar colaboradores no sistema.");
    }
    
    if (todasRecomendacoes.length < 3) {
      todasRecomendacoes.push("Manter monitoramento mensal dos indicadores financeiros.");
      todasRecomendacoes.push("Investir em formacao da equipa.");
    }
    
    todasRecomendacoes.forEach((rec, idx) => {
      recomendacoesTexto += `${idx + 1}. ${rec}\n`;
    });
    
    const conclusao = `Conclusao: A empresa encerrou o periodo com desempenho ${resultadoAnalise.tipo}. ${financeiros.resultadoLiquido < 0 ? 'Recomenda-se acao corretiva imediata.' : 'Mantem-se a recomendacao de continuidade das boas praticas de gestao.'}`;
    
    const textoCompleto = `${introducao}\n\n${enquadramento}\n\n${analiseFinanceira}\n\n${analiseOperacional}\n\n${analiseContasCorrentes}\n\n${recomendacoesTexto}\n\n${conclusao}`;
    
    const relatorioCompleto = {
      sucesso: true,
      empresa: { nome: empresa.nome, nif: empresa.nif, endereco: empresa.endereco },
      periodo: { tipo: tipoPeriodo || 'mensal', nome: periodo.nomePeriodo, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim },
      dataGeracao: new Date().toLocaleString("pt-AO"),
      indicadoresEmpresa,
      indicadoresFinanceiros: financeiros,
      contasCorrentes: {
        totalFornecedores: contasCorrentes.totalFornecedores,
        totalCreditos: contasCorrentes.totalCreditos,
        totalDebitos: contasCorrentes.totalDebitos,
        saldoLiquido: contasCorrentes.saldoLiquido,
        percentualPago: contasCorrentes.percentualPago,
        fornecedoresCriticos: contasCorrentes.fornecedoresCriticos,
        analise: contasCorrentes.analise,
        recomendacoes: contasCorrentes.recomendacoes
      },
      texto: {
        introducao,
        enquadramento,
        analiseFinanceira,
        analiseOperacional,
        analiseContasCorrentes,
        recomendacoes: recomendacoesTexto,
        conclusao,
        completo: textoCompleto
      },
      topClientes: financeiros.topClientes,
      variacaoSaldo,
      resultadoAnalise
    };
    
    // Salvar no historico
    try {
      const relatorioDoc = new Relatorio({
        titulo: `Relatorio de Gestao - ${periodo.nomePeriodo}`,
        tipo: "completo",
        periodo: { mes: parseInt(mes) || new Date().getMonth() + 1, ano: parseInt(ano), nomeMes: periodo.nomePeriodo },
        dados: relatorioCompleto,
        empresaId,
        usuario: req.user?.nome || 'Sistema'
      });
      await relatorioDoc.save();
    } catch (err) {
      console.log("Erro ao salvar:", err.message);
    }
    
    res.json(relatorioCompleto);
    
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: error.message });
  }
});

// Historico routes
router.get('/historico/listar', async (req, res) => {
  try {
    const { empresaId, page = 1, limit = 10 } = req.query;
    if (!empresaId) return res.status(400).json({ erro: "Empresa nao informada" });
    const relatorios = await Relatorio.find({ empresaId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Relatorio.countDocuments({ empresaId });
    res.json({ relatorios, total, pagina: parseInt(page), totalPaginas: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.get('/detalhes/:id', async (req, res) => {
  try {
    const relatorio = await Relatorio.findById(req.params.id);
    if (!relatorio) return res.status(404).json({ erro: "Relatorio nao encontrado" });
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