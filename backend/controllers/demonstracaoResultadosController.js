// backend/controllers/demonstracaoResultadosController.js
const DemonstracaoResultados = require('../models/demonstracaoResultados');
const Venda = require('../models/Venda');
const Pagamento = require('../models/Pagamento');
const Empresa = require('../models/Empresa');

const setNoCacheHeaders = (res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

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
// CLASSIFICAR PAGAMENTO POR TIPO DE CUSTO
// =============================================
const classificarPagamento = (pagamento) => {
  const tipo = pagamento.tipo || '';
  const subtipo = pagamento.subtipo || '';
  const descricao = (pagamento.descricao || '').toLowerCase();
  const beneficiario = (pagamento.beneficiario || '').toLowerCase();
  
  // 1. CUSTOS COM PESSOAL (Salários)
  if (tipo === 'Folha Salarial') {
    return { categoria: 'custosPessoal', subcategoria: 'salarios', nome: 'Salários' };
  }
  
  // 2. IMPOSTOS SOBRE SALÁRIOS (IRT, INSS)
  if (tipo === 'Imposto' && (descricao.includes('irt') || descricao.includes('inss'))) {
    return { categoria: 'impostosPessoal', subcategoria: 'impostosPessoal', nome: 'Impostos sobre Salários' };
  }
  
  // 3. CUSTO DAS MERCADORIAS VENDIDAS
  if (tipo === 'Fornecedor' && (subtipo === 'Compras de Mercadorias' || 
      descricao.includes('compra de mercadoria') || descricao.includes('compra de produto'))) {
    return { categoria: 'cmv', subcategoria: 'cmv', nome: 'Custo das Mercadorias Vendidas' };
  }
  
  // 4. ABASTECIMENTO
  if (tipo === 'Abastecimento' || descricao.includes('combustível') || descricao.includes('combustivel') ||
      descricao.includes('água') || descricao.includes('agua') || descricao.includes('energia')) {
    return { categoria: 'abastecimento', subcategoria: 'abastecimento', nome: 'Abastecimento' };
  }
  
  // 5. COMUNICAÇÃO
  if (descricao.includes('internet') || descricao.includes('telefone') || descricao.includes('comunicação') ||
      beneficiario.includes('unitel') || beneficiario.includes('africell')) {
    return { categoria: 'comunicacao', subcategoria: 'comunicacao', nome: 'Comunicação' };
  }
  
  // 6. RENDAS
  if (tipo === 'Aluguer' || tipo === 'Renda' || descricao.includes('renda') || descricao.includes('aluguer')) {
    return { categoria: 'rendas', subcategoria: 'rendas', nome: 'Rendas e Alugueres' };
  }
  
  // 7. MANUTENÇÃO
  if (tipo === 'Manutenção' || descricao.includes('manutenção') || descricao.includes('manutencao')) {
    return { categoria: 'manutencao', subcategoria: 'manutencao', nome: 'Manutenção' };
  }
  
  // 8. JUROS
  if (tipo === 'Juros' || subtipo === 'Juros') {
    return { categoria: 'juros', subcategoria: 'juros', nome: 'Juros' };
  }
  
  // 9. IMPOSTOS
  if (tipo === 'Imposto') {
    return { categoria: 'impostos', subcategoria: 'impostos', nome: 'Impostos' };
  }
  
  // 10. FORNECEDORES (genérico)
  if (tipo === 'Fornecedor') {
    return { categoria: 'fornecedores', subcategoria: 'fornecedores', nome: 'Fornecedores' };
  }
  
  // 11. OUTROS
  return { categoria: 'outros', subcategoria: 'outros', nome: 'Outros Custos' };
};

// =============================================
// CALCULAR DRE
// =============================================
exports.calcularDRE = async (req, res) => {
  setNoCacheHeaders(res);
  
  try {
    const { empresaId, periodo, ano, mes } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    }
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
    }
    
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes);
    
    let dataInicio, dataFim, periodoNome;
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    
    if (periodo === "mensal") {
      dataInicio = new Date(anoNum, mesNum - 1, 1);
      dataFim = new Date(anoNum, mesNum, 0);
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
    
    const inicio = ajustarDataInicio(dataInicio);
    const fim = ajustarDataFim(dataFim);
    
    console.log(`\n📊 Calculando DRE para ${periodoNome}/${anoNum}`);
    
    // Buscar vendas
    const vendas = await Venda.find({ 
      empresaId, 
      status: 'finalizada',
      data: { $gte: inicio, $lte: fim }
    }).lean();
    
    let vendasProdutos = 0;
    let prestacoesServicos = 0;
    
    vendas.forEach(v => {
      const valor = v.total || 0;
      if (v.tipoFactura === 'Prestação de Serviço') {
        prestacoesServicos += valor;
      } else {
        vendasProdutos += valor;
      }
    });
    
    const totalProveitos = vendasProdutos + prestacoesServicos;
    
    // Buscar pagamentos
    const pagamentos = await Pagamento.find({ 
      empresaId,
      status: 'Pago',
      dataPagamento: { $gte: inicio, $lte: fim }
    }).lean();
    
    // Inicializar contadores
    let custosPessoal = 0;
    let impostosPessoal = 0;
    let cmv = 0;
    let abastecimento = 0;
    let comunicacao = 0;
    let rendas = 0;
    let manutencao = 0;
    let juros = 0;
    let impostos = 0;
    let fornecedores = 0;
    let outros = 0;
    
    // Classificar cada pagamento
    pagamentos.forEach(p => {
      const valor = p.valor || 0;
      const classificacao = classificarPagamento(p);
      
      switch (classificacao.categoria) {
        case 'custosPessoal':
          custosPessoal += valor;
          break;
        case 'impostosPessoal':
          impostosPessoal += valor;
          break;
        case 'cmv':
          cmv += valor;
          break;
        case 'abastecimento':
          abastecimento += valor;
          break;
        case 'comunicacao':
          comunicacao += valor;
          break;
        case 'rendas':
          rendas += valor;
          break;
        case 'manutencao':
          manutencao += valor;
          break;
        case 'juros':
          juros += valor;
          break;
        case 'impostos':
          impostos += valor;
          break;
        case 'fornecedores':
          fornecedores += valor;
          break;
        default:
          outros += valor;
      }
    });
    
    // Total de custos operacionais (soma de todos)
    const totalCustosOperacionais = cmv + custosPessoal + impostosPessoal + abastecimento + 
                                    comunicacao + rendas + manutencao + impostos + fornecedores + outros;
    
    const resultadoOperacional = totalProveitos - totalCustosOperacionais;
    const resultadoFinanceiro = -juros;
    const resultadoAntesImpostos = resultadoOperacional + resultadoFinanceiro;
    
    let impostoRendimento = 0;
    if (resultadoAntesImpostos > 0) {
      impostoRendimento = resultadoAntesImpostos * 0.25;
    }
    
    const resultadoLiquido = resultadoAntesImpostos - impostoRendimento;
    
    // Detalhamento dos custos
    const detalhamentoCustos = [
      { nome: "Custo das Mercadorias Vendidas (CMV)", valor: cmv },
      { nome: "Salários", valor: custosPessoal },
      { nome: "Impostos sobre Salários (IRT/INSS)", valor: impostosPessoal },
      { nome: "Abastecimento", valor: abastecimento },
      { nome: "Comunicação", valor: comunicacao },
      { nome: "Rendas e Alugueres", valor: rendas },
      { nome: "Manutenção", valor: manutencao },
      { nome: "Fornecedores", valor: fornecedores },
      { nome: "Impostos", valor: impostos },
      { nome: "Outros Custos", valor: outros }
    ].filter(item => item.valor > 0);
    
    // Log para debug
    console.log(`\n📈 DETALHAMENTO DOS CUSTOS:`);
    detalhamentoCustos.forEach(c => {
      console.log(`   ${c.nome}: ${c.valor.toLocaleString()} Kz`);
    });
    console.log(`\n   TOTAL CUSTOS: ${totalCustosOperacionais.toLocaleString()} Kz`);
    console.log(`   RECEITAS: ${totalProveitos.toLocaleString()} Kz`);
    console.log(`   RESULTADO OPERACIONAL: ${resultadoOperacional.toLocaleString()} Kz`);
    console.log(`   RESULTADO LÍQUIDO: ${resultadoLiquido.toLocaleString()} Kz`);
    
    // Calcular indicadores
    const margemBruta = totalProveitos > 0 ? (resultadoOperacional / totalProveitos) * 100 : 0;
    const margemLiquida = totalProveitos > 0 ? (resultadoLiquido / totalProveitos) * 100 : 0;
    const custoPessoalPercentual = totalProveitos > 0 ? ((custosPessoal + impostosPessoal) / totalProveitos) * 100 : 0;
    const cmvPercentual = totalProveitos > 0 ? (cmv / totalProveitos) * 100 : 0;
    
    const dreData = {
      empresaId,
      empresaNome: empresa.nome,
      periodo: {
        tipo: periodo,
        ano: anoNum,
        mes: mesNum,
        dataInicio: inicio,
        dataFim: fim,
        nome: periodoNome
      },
      proveitosOperacionais: {
        vendas: vendasProdutos,
        prestacoesServicos: prestacoesServicos,
        outrosProveitosOperacionais: 0,
        total: totalProveitos
      },
      custosOperacionais: {
        custoMercadoriasVendidas: cmv,
        custosPessoal: custosPessoal,
        impostosPessoal: impostosPessoal,
        totalCustosPessoal: custosPessoal + impostosPessoal,
        abastecimento: abastecimento,
        comunicacao: comunicacao,
        rendas: rendas,
        manutencao: manutencao,
        fornecedores: fornecedores,
        impostos: impostos,
        outros: outros,
        total: totalCustosOperacionais,
        detalhamento: detalhamentoCustos
      },
      resultados: {
        operacionais: resultadoOperacional,
        financeiros: resultadoFinanceiro,
        antesImpostos: resultadoAntesImpostos,
        impostoRendimento: impostoRendimento,
        liquidosExercicio: resultadoLiquido
      },
      indicadores: {
        margemBruta: margemBruta.toFixed(2),
        margemLiquida: margemLiquida.toFixed(2),
        custoPessoalPercentual: custoPessoalPercentual.toFixed(2),
        cmvPercentual: cmvPercentual.toFixed(2)
      }
    };
    
    res.json({
      sucesso: true,
      dados: dreData,
      mensagem: 'DRE calculada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Listar DREs
exports.listarDREs = async (req, res) => {
  try {
    const { empresaId } = req.query;
    const query = {};
    if (empresaId) query.empresaId = empresaId;
    const dres = await DemonstracaoResultados.find(query).sort({ 'periodo.ano': -1, 'periodo.mes': -1 });
    res.json({ sucesso: true, dados: dres });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Obter DRE por ID
exports.getDREById = async (req, res) => {
  try {
    const { id } = req.params;
    const dre = await DemonstracaoResultados.findById(id);
    if (!dre) return res.status(404).json({ sucesso: false, mensagem: 'DRE não encontrada' });
    res.json({ sucesso: true, dados: dre });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Comparar períodos
exports.compararPeriodos = async (req, res) => {
  try {
    const { empresaId, ano1, mes1, ano2, mes2 } = req.query;
    const [dre1, dre2] = await Promise.all([
      DemonstracaoResultados.findOne({ empresaId, 'periodo.ano': parseInt(ano1), 'periodo.mes': parseInt(mes1) }),
      DemonstracaoResultados.findOne({ empresaId, 'periodo.ano': parseInt(ano2), 'periodo.mes': parseInt(mes2) })
    ]);
    res.json({ sucesso: true, dados: { periodo1: dre1, periodo2: dre2 } });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};