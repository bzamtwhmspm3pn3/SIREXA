const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { logMiddleware } = require('../middlewares/logger');

const Venda = require('../models/Venda');
const Stock = require('../models/Stock');
const Factura = require('../models/Factura');
const Funcionario = require('../models/Funcionario');
const FolhaSalarial = require('../models/FolhaSalarial');
const Pagamento = require('../models/Pagamento');
const Viatura = require('../models/Viatura');
const Inventario = require('../models/Inventario');
const Cliente = require('../models/Cliente');
const Fornecedor = require('../models/Fornecedor');
const Abastecimento = require('../models/Abastecimento');
const Manutencao = require('../models/Manutencao');
const FeriasLicenca = require('../models/FeriasLicenca');
const Abono = require('../models/Abono');
const FluxoCaixa = require('../models/FluxoCaixa');
const ContaCorrente = require('../models/ContaCorrente');
const LancamentoContabilistico = require('../models/LancamentoContabilistico');
const Orcamento = require('../models/Orcamento');
const Empresa = require('../models/Empresa');
const Relatorio = require('../models/relatorio');
const RegistoBancario = require('../models/RegistoBancario');
const Banco = require('../models/Banco');

router.use(verifyToken);

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function calcPeriodo(tipoPeriodo, ano, mes) {
  const an = parseInt(ano) || new Date().getFullYear();
  const mn = parseInt(mes) || new Date().getMonth() + 1;
  let dataInicio, dataFim, nome;
  if (tipoPeriodo === 'anual') {
    dataInicio = new Date(an, 0, 1);
    dataFim = new Date(an, 11, 31);
    nome = `Ano ${an}`;
  } else {
    dataInicio = new Date(an, mn - 1, 1);
    dataFim = new Date(an, mn, 0);
    nome = MESES[mn - 1];
  }
  dataFim.setHours(23, 59, 59, 999);
  return { dataInicio, dataFim, nome, ano: an, mes: mn };
}

function sum(arr, field) { return arr.reduce((s, i) => s + (Number(i[field]) || 0), 0); }
function count(arr, filtro) { return filtro ? arr.filter(i => Object.entries(filtro).every(([k, v]) => String(i[k]) === String(v))).length : arr.length; }
function groupBy(arr, field, valorField) {
  const map = {};
  for (const i of arr) {
    const key = String(i[field] || 'N/A');
    if (!map[key]) map[key] = 0;
    map[key] += Number(i[valorField]) || 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, valor]) => ({ label, valor }));
}

const MODULOS = {
  // ========== OPERACIONAL ==========
  vendas: {
    nome: 'Vendas', grupo: 'operacional', model: Venda,
    filtroPeriodo: true, campoData: 'data',
    filtrosAdicionais: { status: 'finalizada' },
    indicadores: [
      { id: 'total', nome: 'Total Período', campo: 'total', op: 'sum', fmt: 'moeda' },
      { id: 'qtd', nome: 'Quantidade', op: 'count', fmt: 'numero' },
      { id: 'media', nome: 'Ticket Médio', op: 'avg', campo: 'total', fmt: 'moeda' }
    ],
    graficos: [
      { tipo: 'bar', titulo: 'Evolução Mensal', agrupar: 'mes', campo: 'total' },
      { tipo: 'pie', titulo: 'Forma Pagamento', agrupar: 'formaPagamento', campo: 'total' },
      { tipo: 'bar', titulo: 'Top Clientes', agrupar: 'cliente', campo: 'total' }
    ],
    alertas: [
      { nome: 'Pendentes', filtro: { status: 'pendente' } },
      { nome: 'Parcelas Vencidas', filtro: { status: 'parcialmente_paga' } }
    ]
  },
  stock: {
    nome: 'Stock', grupo: 'operacional', model: Stock,
    filtrosAdicionais: { ativo: true },
    indicadores: [
      { id: 'produtos', nome: 'Total Produtos', op: 'count', fmt: 'numero' },
      { id: 'qtdTotal', nome: 'Qtd Total', campo: 'quantidade', op: 'sum', fmt: 'numero' },
      { id: 'valorVenda', nome: 'Valor Venda', campo: 'precoVenda', op: 'sumMultiplied', campoQtd: 'quantidade', fmt: 'moeda' },
      { id: 'valorCompra', nome: 'Valor Compra', campo: 'precoCompra', op: 'sumMultiplied', campoQtd: 'quantidade', fmt: 'moeda' }
    ],
    graficos: [
      { tipo: 'doughnut', titulo: 'Por Categoria', agrupar: 'categoria', campo: 'quantidade' },
      { tipo: 'bar', titulo: 'Por Armazém', agrupar: 'armazem', campo: 'quantidade' }
    ],
    alertas: [
      { nome: 'Baixo Stock', fn: docs => docs.filter(d => (d.quantidade || 0) <= (d.quantidadeMinima || 0)).length },
      { nome: 'Sem Stock', fn: docs => docs.filter(d => (d.quantidade || 0) === 0).length },
      { nome: 'Próx. Vencer', fn: docs => docs.filter(d => d.dataValidade && new Date(d.dataValidade) > new Date() && new Date(d.dataValidade) <= new Date(Date.now() + 30 * 86400000)).length }
    ]
  },
  facturacao: {
    nome: 'Facturação', grupo: 'operacional', model: Factura,
    filtroPeriodo: true, campoData: 'dataEmissao',
    filtrosAdicionais: { status: { $in: ['emitido', 'emitida', 'pago', 'parcialmente_pago'] } },
    indicadores: [
      { id: 'total', nome: 'Total Faturado', campo: 'total', op: 'sum', fmt: 'moeda' },
      { id: 'qtd', nome: 'Documentos', op: 'count', fmt: 'numero' },
      { id: 'media', nome: 'Valor Médio', campo: 'total', op: 'avg', fmt: 'moeda' }
    ],
    graficos: [
      { tipo: 'bar', titulo: 'Por Tipo Documento', agrupar: 'tipo', campo: 'total' },
      { tipo: 'pie', titulo: 'Forma Pagamento', agrupar: 'formaPagamento', campo: 'total' }
    ],
    alertas: [
      { nome: 'Pendentes', filtro: { status: 'emitido' } },
      { nome: 'Vencidos', filtro: { status: 'vencido' } }
    ]
  },

  // ========== RECURSOS HUMANOS ==========
  funcionarios: {
    nome: 'Funcionários', grupo: 'rh', model: Funcionario,
    indicadores: [
      { id: 'total', nome: 'Total', op: 'count', fmt: 'numero' },
      { id: 'ativos', nome: 'Ativos', filtro: { status: 'Ativo' }, op: 'count', fmt: 'numero' },
      { id: 'salarioMedio', nome: 'Salário Médio', campo: 'salarioBase', op: 'avg', fmt: 'moeda' }
    ],
    graficos: [
      { tipo: 'doughnut', titulo: 'Por Departamento', agrupar: 'departamento' },
      { tipo: 'pie', titulo: 'Por Status', agrupar: 'status' },
      { tipo: 'bar', titulo: 'Por Cargo', agrupar: 'cargo' }
    ],
    alertas: [
      { nome: 'Inativos', filtro: { status: 'Inativo' } },
      { nome: 'Suspensos', filtro: { status: 'Suspenso' } }
    ]
  },
  folha_salarial: {
    nome: 'Folha Salarial', grupo: 'rh', model: FolhaSalarial,
    indicadores: [
      { id: 'totalFolha', nome: 'Total Folha', campo: 'total', op: 'sum', fmt: 'moeda' },
      { id: 'qtd', nome: 'Registos', op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'bar', titulo: 'Por Mês', agrupar: 'mesReferencia', campo: 'total' }
    ]
  },
  faltas: {
    nome: 'Gestão de Faltas', grupo: 'rh', model: require('../models/Falta'),
    filtroPeriodo: true, campoData: 'dataFalta',
    indicadores: [
      { id: 'total', nome: 'Total Faltas', op: 'count', fmt: 'numero' },
      { id: 'justificadas', nome: 'Justificadas', filtro: { justificada: true }, op: 'count', fmt: 'numero' },
      { id: 'injustificadas', nome: 'Injustificadas', filtro: { justificada: false }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Justificadas vs Injustificadas', agrupar: function(d) { return d.justificada ? 'Justificada' : 'Injustificada'; } }
    ]
  },
  abonos: {
    nome: 'Gestão de Abonos', grupo: 'rh', model: Abono,
    filtroPeriodo: true, campoData: 'dataReferencia',
    indicadores: [
      { id: 'total', nome: 'Total Abonos', campo: 'valor', op: 'sum', fmt: 'moeda' },
      { id: 'qtd', nome: 'Quantidade', op: 'count', fmt: 'numero' },
      { id: 'pendentes', nome: 'Pendentes', filtro: { status: 'Pendente' }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Tipo', agrupar: 'tipoAbono', campo: 'valor' },
      { tipo: 'doughnut', titulo: 'Por Status', agrupar: 'status' }
    ],
    alertas: [
      { nome: 'Pendentes', filtro: { status: 'Pendente' } },
      { nome: 'Aprovados', filtro: { status: 'Aprovado' } }
    ]
  },
  avaliacao: {
    nome: 'Avaliação', grupo: 'rh', model: require('../models/Avaliacao'),
    indicadores: [
      { id: 'configs', nome: 'Configurações', op: 'count', fmt: 'numero' }
    ]
  },
  recrutamento: {
    nome: 'Recrutamento e Selecção', grupo: 'rh', model: require('../models/Recrutamento').Vaga,
    indicadores: [
      { id: 'vagasAbertas', nome: 'Vagas Abertas', filtro: { status: 'Aberta' }, op: 'count', fmt: 'numero' },
      { id: 'totalVagas', nome: 'Total Vagas', op: 'count', fmt: 'numero' },
      { id: 'fechadas', nome: 'Fechadas', filtro: { status: 'Fechada' }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Status', agrupar: 'status' },
      { tipo: 'doughnut', titulo: 'Por Tipo Contrato', agrupar: 'tipoContrato' }
    ],
    alertas: [
      { nome: 'Vagas Abertas', filtro: { status: 'Aberta' } },
      { nome: 'Urgentes', filtro: { prioridade: 'Urgente' } }
    ]
  },
  formacao: {
    nome: 'Formação', grupo: 'rh', model: require('../models/Formacao').Curso,
    indicadores: [
      { id: 'total', nome: 'Total Cursos', op: 'count', fmt: 'numero' },
      { id: 'concluidos', nome: 'Concluídos', filtro: { status: 'Concluido' }, op: 'count', fmt: 'numero' },
      { id: 'ativos', nome: 'Activos', filtro: { status: { $in: ['Planeado', 'EmAndamento'] } }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'doughnut', titulo: 'Por Status', agrupar: 'status' },
      { tipo: 'pie', titulo: 'Por Categoria', agrupar: 'categoria' }
    ]
  },
  ferias_licencas: {
    nome: 'Férias e Licenças', grupo: 'rh', model: FeriasLicenca,
    filtroPeriodo: true, campoData: 'dataInicio',
    indicadores: [
      { id: 'total', nome: 'Total', op: 'count', fmt: 'numero' },
      { id: 'pendentes', nome: 'Pendentes', filtro: { status: 'Pendente' }, op: 'count', fmt: 'numero' },
      { id: 'aprovados', nome: 'Aprovados', filtro: { status: 'Aprovado' }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Tipo', agrupar: 'tipo' },
      { tipo: 'doughnut', titulo: 'Por Status', agrupar: 'status' }
    ],
    alertas: [
      { nome: 'Pendentes Aprovação', filtro: { status: 'Pendente' } },
      { nome: 'Em Gozo', filtro: { status: 'Gozando' } }
    ]
  },
  carreira: {
    nome: 'Carreira e Promoções', grupo: 'rh', model: require('../models/Carreira'),
    indicadores: [
      { id: 'total', nome: 'Total Registos', op: 'count', fmt: 'numero' }
    ]
  },
  disciplinar: {
    nome: 'Gestão Disciplinar', grupo: 'rh', model: require('../models/Disciplinar'),
    indicadores: [
      { id: 'total', nome: 'Total Processos', op: 'count', fmt: 'numero' },
      { id: 'investigacao', nome: 'Em Investigação', filtro: { status: 'EmInvestigacao' }, op: 'count', fmt: 'numero' },
      { id: 'concluidos', nome: 'Concluídos', filtro: { status: 'Concluido' }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Tipo', agrupar: 'tipo' },
      { tipo: 'doughnut', titulo: 'Por Gravidade', agrupar: 'gravidade' }
    ],
    alertas: [
      { nome: 'Em Investigação', filtro: { status: 'EmInvestigacao' } }
    ]
  },
  competencias: {
    nome: 'Competências', grupo: 'rh', model: require('../models/Competencia'),
    indicadores: [
      { id: 'total', nome: 'Total Competências', op: 'count', fmt: 'numero' }
    ]
  },
  saude_seguranca: {
    nome: 'Saúde e Segurança', grupo: 'rh', model: require('../models/SaudeSeguranca'),
    indicadores: [
      { id: 'total', nome: 'Total Registos', op: 'count', fmt: 'numero' }
    ]
  },
  workflow_rh: {
    nome: 'Workflow RH', grupo: 'rh', model: require('../models/Workflow'),
    indicadores: [
      { id: 'total', nome: 'Total Workflows', op: 'count', fmt: 'numero' },
      { id: 'pendentes', nome: 'Pendentes', filtro: { status: 'Pendente' }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'doughnut', titulo: 'Por Status', agrupar: 'status' }
    ],
    alertas: [
      { nome: 'Pendentes Aprovação', filtro: { status: 'Pendente' } }
    ]
  },

  // ========== GESTÃO PATRIMONIAL ==========
  viaturas: {
    nome: 'Viaturas', grupo: 'patrimonial', model: Viatura,
    filtrosAdicionais: { ativo: true },
    indicadores: [
      { id: 'total', nome: 'Total Viaturas', op: 'count', fmt: 'numero' },
      { id: 'kmTotal', nome: 'KM Total', campo: 'km', op: 'sum', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Estado', agrupar: 'estado' },
      { tipo: 'doughnut', titulo: 'Por Combustível', agrupar: 'combustivel' }
    ],
    alertas: [
      { nome: 'Em Manutenção', filtro: { estado: 'Em manutencao' } }
    ]
  },
  abastecimentos: {
    nome: 'Abastecimentos', grupo: 'patrimonial', model: Abastecimento,
    filtroPeriodo: true, campoData: 'dataAbastecimento',
    indicadores: [
      { id: 'totalLitros', nome: 'Total Litros', campo: 'quantidade', op: 'sum', fmt: 'numero' },
      { id: 'totalGasto', nome: 'Total Gasto', fn: docs => sum(docs, 'valor') || sum(docs.map(d => (d.quantidade || 0) * (d.precoUnitario || 0))), fmt: 'moeda' },
      { id: 'abastecimentos', nome: 'Abastecimentos', op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'bar', titulo: 'Por Mês', agrupar: 'mes', fn: d => new Date(d.dataAbastecimento).getMonth() + 1, campo: 'quantidade' },
      { tipo: 'pie', titulo: 'Tipo Combustível', agrupar: 'tipoCombustivel', campo: 'quantidade' }
    ]
  },
  manutencoes: {
    nome: 'Manutenções', grupo: 'patrimonial', model: Manutencao,
    filtroPeriodo: true, campoData: 'dataManutencao',
    indicadores: [
      { id: 'total', nome: 'Total Manutenções', op: 'count', fmt: 'numero' },
      { id: 'custoTotal', nome: 'Custo Total', campo: 'valor', op: 'sum', fmt: 'moeda' },
      { id: 'custoMedio', nome: 'Custo Médio', campo: 'valor', op: 'avg', fmt: 'moeda' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Tipo', agrupar: 'tipoManutencao', campo: 'valor' },
      { tipo: 'bar', titulo: 'Custo por Mês', agrupar: 'mes', fn: d => new Date(d.dataManutencao).getMonth() + 1, campo: 'valor' }
    ]
  },
  inventario: {
    nome: 'Inventário', grupo: 'patrimonial', model: Inventario,
    indicadores: [
      { id: 'total', nome: 'Total Itens', op: 'count', fmt: 'numero' },
      { id: 'valorTotal', nome: 'Valor Total', campo: 'valorTotal', op: 'sum', fmt: 'moeda' },
      { id: 'ativos', nome: 'Activos', filtro: { estado: 'Ativo' }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'doughnut', titulo: 'Por Categoria', agrupar: 'categoria', campo: 'valorTotal' },
      { tipo: 'pie', titulo: 'Por Estado', agrupar: 'estado' }
    ],
    alertas: [
      { nome: 'Depreciados', filtro: { estado: 'Depreciado' } },
      { nome: 'Baixados', filtro: { estado: 'Baixado' } }
    ]
  },

  // ========== FINANCEIRO ==========
  fornecedores: {
    nome: 'Fornecedores', grupo: 'financeiro', model: Fornecedor,
    indicadores: [
      { id: 'total', nome: 'Total Fornecedores', op: 'count', fmt: 'numero' },
      { id: 'ativos', nome: 'Activos', op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Tipo', agrupar: 'tipoFornecedor' }
    ]
  },
  fluxo_caixa: {
    nome: 'Fluxo de Caixa', grupo: 'financeiro', model: FluxoCaixa,
    filtroPeriodo: true, campoData: 'data',
    indicadores: [
      { id: 'entradas', nome: 'Total Entradas', fn: docs => sum(docs.filter(d => d.tipo === 'Entrada'), 'valor'), fmt: 'moeda' },
      { id: 'saidas', nome: 'Total Saídas', fn: docs => sum(docs.filter(d => d.tipo === 'Saída'), 'valor'), fmt: 'moeda' },
      { id: 'saldo', nome: 'Saldo Líquido', fn: docs => sum(docs.filter(d => d.tipo === 'Entrada'), 'valor') - sum(docs.filter(d => d.tipo === 'Saída'), 'valor'), fmt: 'moeda' }
    ],
    graficos: [
      { tipo: 'bar', titulo: 'Entradas vs Saídas', agrupar: 'mes', fn: d => new Date(d.data).getMonth() + 1, campo: 'valor', dividirPorTipo: true },
      { tipo: 'pie', titulo: 'Por Categoria', agrupar: 'categoria', campo: 'valor' }
    ],
    alertas: [
      { nome: 'Pendentes', filtro: { status: 'Pendente' } }
    ]
  },
  conta_corrente: {
    nome: 'Conta Corrente', grupo: 'financeiro', model: ContaCorrente,
    indicadores: [
      { id: 'total', nome: 'Total Contas', op: 'count', fmt: 'numero' },
      { id: 'fornecedores', nome: 'Fornecedores', filtro: { tipo: 'Fornecedor' }, op: 'count', fmt: 'numero' },
      { id: 'ativos', nome: 'Activas', filtro: { status: 'Ativo' }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'doughnut', titulo: 'Por Tipo', agrupar: 'tipo' },
      { tipo: 'pie', titulo: 'Por Categoria', agrupar: 'categoria' }
    ]
  },
  controlo_pagamentos: {
    nome: 'Controlo de Pagamentos', grupo: 'financeiro', model: Pagamento,
    filtroPeriodo: true, campoData: 'dataPagamento',
    indicadores: [
      { id: 'total', nome: 'Total Pago', campo: 'valor', op: 'sum', fmt: 'moeda' },
      { id: 'qtd', nome: 'Total Pagamentos', op: 'count', fmt: 'numero' },
      { id: 'pendentes', nome: 'Pendentes', fn: docs => docs.filter(d => d.status === 'Pendente' || d.status === 'Atrasado').reduce((s, d) => s + (d.valor || 0), 0), fmt: 'moeda' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Tipo', agrupar: 'tipo', campo: 'valor' },
      { tipo: 'bar', titulo: 'Por Status', agrupar: 'status', campo: 'valor' }
    ],
    alertas: [
      { nome: 'Atrasados', filtro: { status: 'Atrasado' } },
      { nome: 'Pendentes', filtro: { status: 'Pendente' } }
    ]
  },
  custos_receitas: {
    nome: 'Custos e Receitas', grupo: 'financeiro', model: require('../models/Custo'),
    filtroPeriodo: true, campoData: 'data',
    indicadores: [
      { id: 'custos', nome: 'Total Custos', campo: 'valor', op: 'sum', fmt: 'moeda' },
      { id: 'qtd', nome: 'Registos', op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Categoria', agrupar: 'categoria', campo: 'valor' }
    ]
  },
  orcamentos: {
    nome: 'Orçamentos', grupo: 'financeiro', model: Orcamento,
    filtroPeriodo: true, campoData: 'dataOrcamento',
    indicadores: [
      { id: 'total', nome: 'Total Orçado', campo: 'valor', op: 'sum', fmt: 'moeda' },
      { id: 'realizado', nome: 'Total Realizado', campo: 'valorRealizado', op: 'sum', fmt: 'moeda' },
      { id: 'qtd', nome: 'Quantidade', op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'bar', titulo: 'Por Status', agrupar: 'status', campo: 'valor' },
      { tipo: 'doughnut', titulo: 'Por Categoria', agrupar: 'categoria', campo: 'valor' }
    ],
    alertas: [
      { nome: 'Pendentes', filtro: { status: 'Pendente' } },
      { nome: 'Em Execução', filtro: { status: 'Em Execução' } }
    ]
  },
  dre: {
    nome: 'DRE', grupo: 'financeiro', model: require('../models/demonstracaoResultados'),
    filtroPeriodo: true, campoData: 'dataFim',
    indicadores: [
      { id: 'receitas', nome: 'Receitas', campo: 'totalReceitas', op: 'sum', fmt: 'moeda' },
      { id: 'despesas', nome: 'Despesas', campo: 'totalDespesas', op: 'sum', fmt: 'moeda' },
      { id: 'resultado', nome: 'Resultado Líquido', campo: 'resultadoLiquido', op: 'sum', fmt: 'moeda' }
    ],
    graficos: [
      { tipo: 'bar', titulo: 'Receitas vs Despesas', agrupar: function(d) { return d.periodo || d._id; }, campo: 'resultadoLiquido' }
    ]
  },
  indicadores_fin: {
    nome: 'Indicadores', grupo: 'financeiro', model: require('../models/Indicador'),
    indicadores: [
      { id: 'total', nome: 'Total Indicadores', op: 'count', fmt: 'numero' }
    ]
  },
  transferencias: {
    nome: 'Transferências', grupo: 'financeiro', model: require('../models/Transferencia'),
    filtroPeriodo: true, campoData: 'data',
    indicadores: [
      { id: 'total', nome: 'Total Transferido', campo: 'valor', op: 'sum', fmt: 'moeda' },
      { id: 'qtd', nome: 'Quantidade', op: 'count', fmt: 'numero' }
    ]
  },
  reconciliacao: {
    nome: 'Reconciliação Bancária', grupo: 'financeiro', model: RegistoBancario,
    filtroPeriodo: true, campoData: 'data',
    indicadores: [
      { id: 'entradas', nome: 'Entradas', fn: docs => sum(docs.filter(d => d.entradaSaida === 'entrada'), 'valor'), fmt: 'moeda' },
      { id: 'saidas', nome: 'Saídas', fn: docs => sum(docs.filter(d => d.entradaSaida === 'saida'), 'valor'), fmt: 'moeda' }
    ],
    graficos: [
      { tipo: 'bar', titulo: 'Entradas vs Saídas', agrupar: 'mes', fn: d => new Date(d.data).getMonth() + 1, campo: 'valor', dividirPorTipo: true }
    ]
  },

  // ========== CONTABILIDADE ==========
  contabilidade: {
    nome: 'Contabilidade', grupo: 'contabilidade', model: LancamentoContabilistico,
    filtroPeriodo: true, campoData: 'dataLancamento',
    indicadores: [
      { id: 'lancamentos', nome: 'Lançamentos', op: 'count', fmt: 'numero' },
      { id: 'debito', nome: 'Total Débito', campo: 'totalDebito', op: 'sum', fmt: 'moeda' },
      { id: 'credito', nome: 'Total Crédito', campo: 'totalCredito', op: 'sum', fmt: 'moeda' }
    ],
    graficos: [
      { tipo: 'doughnut', titulo: 'Por Status', agrupar: 'status' },
      { tipo: 'bar', titulo: 'Por Mês', agrupar: 'mes', fn: d => new Date(d.dataLancamento).getMonth() + 1, campo: 'totalDebito' }
    ],
    alertas: [
      { nome: 'Rascunhos', filtro: { status: 'Rascunho' } },
      { nome: 'Cancelados', filtro: { status: 'Cancelado' } }
    ]
  },
  plano_contas: {
    nome: 'Plano de Contas', grupo: 'contabilidade', model: require('../models/PlanoContas'),
    indicadores: [
      { id: 'total', nome: 'Total Contas', op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Natureza', agrupar: 'natureza' }
    ]
  },
  lancamentos: {
    nome: 'Lançamentos', grupo: 'contabilidade', model: LancamentoContabilistico,
    filtroPeriodo: true, campoData: 'dataLancamento',
    indicadores: [
      { id: 'total', nome: 'Total Lançamentos', op: 'count', fmt: 'numero' },
      { id: 'contabilizados', nome: 'Contabilizados', filtro: { status: 'Contabilizado' }, op: 'count', fmt: 'numero' },
      { id: 'rascunhos', nome: 'Rascunhos', filtro: { status: 'Rascunho' }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'doughnut', titulo: 'Por Status', agrupar: 'status' }
    ],
    alertas: [
      { nome: 'Rascunhos', filtro: { status: 'Rascunho' } }
    ]
  },
  diario_geral: {
    nome: 'Diário Geral', grupo: 'contabilidade', model: LancamentoContabilistico,
    filtroPeriodo: true, campoData: 'dataLancamento',
    indicadores: [
      { id: 'total', nome: 'Total Lançamentos', op: 'count', fmt: 'numero' },
      { id: 'debito', nome: 'Débito Total', campo: 'totalDebito', op: 'sum', fmt: 'moeda' },
      { id: 'credito', nome: 'Crédito Total', campo: 'totalCredito', op: 'sum', fmt: 'moeda' }
    ]
  },
  razao_geral: {
    nome: 'Razão Geral', grupo: 'contabilidade', model: LancamentoContabilistico,
    filtroPeriodo: true, campoData: 'dataLancamento',
    indicadores: [
      { id: 'total', nome: 'Total Lançamentos', op: 'count', fmt: 'numero' },
      { id: 'contabilizados', nome: 'Contabilizados', filtro: { status: 'Contabilizado' }, op: 'count', fmt: 'numero' }
    ]
  },
  balancete: {
    nome: 'Balancete', grupo: 'contabilidade', model: LancamentoContabilistico,
    filtroPeriodo: true, campoData: 'dataLancamento',
    indicadores: [
      { id: 'debito', nome: 'Débito Total', campo: 'totalDebito', op: 'sum', fmt: 'moeda' },
      { id: 'credito', nome: 'Crédito Total', campo: 'totalCredito', op: 'sum', fmt: 'moeda' },
      { id: 'diferenca', nome: 'Diferença', fn: docs => sum(docs, 'totalDebito') - sum(docs, 'totalCredito'), fmt: 'moeda' }
    ]
  },
  saldos_contas: {
    nome: 'Saldos de Contas', grupo: 'contabilidade', model: LancamentoContabilistico,
    filtroPeriodo: true, campoData: 'dataLancamento',
    indicadores: [
      { id: 'total', nome: 'Total Lançamentos', op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'bar', titulo: 'Saldos por Mês', agrupar: 'mes', fn: d => new Date(d.dataLancamento).getMonth() + 1, campo: 'totalDebito' }
    ]
  },
  balanco_patrimonial: {
    nome: 'Balanço Patrimonial', grupo: 'contabilidade', model: LancamentoContabilistico,
    filtroPeriodo: true, campoData: 'dataLancamento',
    indicadores: [
      { id: 'debito', nome: 'Total Débito', campo: 'totalDebito', op: 'sum', fmt: 'moeda' },
      { id: 'credito', nome: 'Total Crédito', campo: 'totalCredito', op: 'sum', fmt: 'moeda' }
    ]
  },
  periodos_fiscais: {
    nome: 'Períodos Fiscais', grupo: 'contabilidade', model: require('../models/PeriodoFiscal'),
    indicadores: [
      { id: 'total', nome: 'Total Períodos', op: 'count', fmt: 'numero' },
      { id: 'abertos', nome: 'Abertos', filtro: { status: 'aberto' }, op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Status', agrupar: 'status' }
    ]
  },
  encerramento: {
    nome: 'Encerramento', grupo: 'contabilidade', model: LancamentoContabilistico,
    filtroPeriodo: true, campoData: 'dataLancamento',
    indicadores: [
      { id: 'lancamentos', nome: 'Lançamentos', op: 'count', fmt: 'numero' }
    ]
  },

  // ========== RELATORIOS ==========
  relatorios_mod: {
    nome: 'Relatórios', grupo: 'analise', model: Relatorio,
    indicadores: [
      { id: 'total', nome: 'Total Relatórios', op: 'count', fmt: 'numero' },
      { id: 'downloads', nome: 'Total Downloads', campo: 'downloads', op: 'sum', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'pie', titulo: 'Por Tipo', agrupar: 'tipo' },
      { tipo: 'doughnut', titulo: 'Por Módulo', agrupar: 'modulo' }
    ]
  },
  graficos_mod: {
    nome: 'Gráficos', grupo: 'analise', model: Venda,
    filtroPeriodo: true, campoData: 'data',
    filtrosAdicionais: { status: 'finalizada' },
    indicadores: [
      { id: 'vendas', nome: 'Vendas Período', campo: 'total', op: 'sum', fmt: 'moeda' },
      { id: 'qtd', nome: 'Transações', op: 'count', fmt: 'numero' }
    ],
    graficos: [
      { tipo: 'line', titulo: 'Evolução de Vendas', agrupar: 'mes', fn: d => `${d.data.getFullYear()}-${String(d.data.getMonth() + 1).padStart(2, '0')}`, campo: 'total' },
      { tipo: 'pie', titulo: 'Distribuição', agrupar: 'tipoVenda', campo: 'total' }
    ]
  },
  analise_geral: {
    nome: 'Análise Geral', grupo: 'analise', model: require('../models/AnaliseGeral'),
    indicadores: [
      { id: 'total', nome: 'Total Análises', op: 'count', fmt: 'numero' }
    ]
  }
};

async function executarRelatorioModulo(moduloId, empresaId, periodo) {
  const cfg = MODULOS[moduloId];
  if (!cfg) return null;

  const filtro = { empresaId };
  if (cfg.filtrosAdicionais) Object.assign(filtro, cfg.filtrosAdicionais);
  if (cfg.filtroPeriodo && periodo) {
    filtro[cfg.campoData || 'data'] = { $gte: periodo.dataInicio, $lte: periodo.dataFim };
  }

  const docs = await cfg.model.find(filtro);

  const indicadores = [];
  for (const ind of cfg.indicadores || []) {
    let valor = 0;
    const docsFiltrados = ind.filtro
      ? docs.filter(d => Object.entries(ind.filtro).every(([k, v]) => {
        if (typeof v === 'object' && v.$in) return v.$in.includes(String(d[k]));
        return String(d[k]) === String(v);
      }))
      : docs;

    if (ind.fn) {
      valor = ind.fn(docs);
    } else if (ind.op === 'count') {
      valor = docsFiltrados.length;
    } else if (ind.op === 'sum') {
      valor = sum(docsFiltrados, ind.campo);
    } else if (ind.op === 'sumMultiplied') {
      valor = docsFiltrados.reduce((s, d) => s + ((Number(d[ind.campo]) || 0) * (Number(d[ind.campoQtd]) || 0)), 0);
    } else if (ind.op === 'avg') {
      valor = docsFiltrados.length > 0 ? sum(docsFiltrados, ind.campo) / docsFiltrados.length : 0;
    }
    indicadores.push({ id: ind.id, nome: ind.nome, valor, fmt: ind.fmt || 'numero' });
  }

  const graficos = [];
  for (const g of cfg.graficos || []) {
    let agruparFn;
    if (typeof g.agrupar === 'function') {
      agruparFn = g.agrupar;
    } else if (g.agrupar === 'mes') {
      agruparFn = g.fn || (d => MESES[new Date(d[cfg.campoData || 'data']).getMonth()]);
    } else if (g.agrupar) {
      agruparFn = d => String(d[g.agrupar] || 'N/A');
    }

    if (g.dividirPorTipo) {
      const tipos = [...new Set(docs.map(d => d.tipo))];
      const datasets = tipos.map(tipo => {
        const sub = docs.filter(d => d.tipo === tipo);
        return { label: tipo, data: groupBy(sub, agruparFn, g.campo) };
      });
      graficos.push({ tipo: g.tipo, titulo: g.titulo, datasets });
    } else {
      const data = groupBy(docs, agruparFn, g.campo);
      graficos.push({ tipo: g.tipo, titulo: g.titulo, data });
    }
  }

  const alertas = [];
  for (const a of cfg.alertas || []) {
    let qtd;
    if (a.fn) {
      qtd = a.fn(docs);
    } else if (a.filtro) {
      qtd = docs.filter(d => Object.entries(a.filtro).every(([k, v]) => {
        if (typeof v === 'object' && v.$in) return v.$in.includes(String(d[k]));
        return String(d[k]) === String(v);
      })).length;
    }
    if (qtd > 0) alertas.push({ nome: a.nome, quantidade: qtd });
  }

  return { indicadores, graficos, alertas };
}

const GRUPOS = {
  operacional: { nome: 'Operacional', modulos: ['vendas', 'stock', 'facturacao'] },
  rh: { nome: 'Recursos Humanos', modulos: ['funcionarios', 'folha_salarial', 'faltas', 'abonos', 'avaliacao', 'recrutamento', 'formacao', 'ferias_licencas', 'carreira', 'disciplinar', 'competencias', 'saude_seguranca', 'workflow_rh'] },
  patrimonial: { nome: 'Gestão Patrimonial', modulos: ['viaturas', 'abastecimentos', 'manutencoes', 'inventario'] },
  financeiro: { nome: 'Financeiro', modulos: ['fornecedores', 'fluxo_caixa', 'conta_corrente', 'controlo_pagamentos', 'custos_receitas', 'orcamentos', 'dre', 'indicadores_fin', 'transferencias', 'reconciliacao'] },
  contabilidade: { nome: 'Contabilidade', modulos: ['contabilidade', 'plano_contas', 'lancamentos', 'diario_geral', 'razao_geral', 'balancete', 'saldos_contas', 'balanco_patrimonial', 'periodos_fiscais', 'encerramento'] },
  analise: { nome: 'Relatórios', modulos: ['relatorios_mod', 'graficos_mod', 'analise_geral'] }
};

async function buscarIndicadoresEmpresa(empresaId) {
  const [funcionarios, clientes, fornecedores, produtos, viaturas, pagamentosFolha] = await Promise.all([
    require('../models/Funcionario').find({ empresaId }).catch(() => []),
    require('../models/Cliente').find({ empresaId }).catch(() => []),
    require('../models/Fornecedor').find({ empresaId }).catch(() => []),
    require('../models/Stock').find({ empresaId }).catch(() => []),
    require('../models/Viatura').find({ empresaId }).catch(() => []),
    require('../models/Pagamento').find({ empresaId, tipo: 'Folha Salarial', status: 'Pago' }).catch(() => [])
  ]);
  const funcionariosAtivos = funcionarios.filter(f => f.status === 'Ativo' || f.status === 'ativo').length;
  const salarioTotal = pagamentosFolha.reduce((sum, p) => sum + (p.valor || 0), 0);
  const quantidadeTotalStock = produtos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
  const valorTotalStock = produtos.reduce((sum, p) => sum + ((p.precoVenda || 0) * (p.quantidade || 0)), 0);
  const viaturasAtivas = viaturas.filter(v => v.ativo === true).length;
  return { totalFuncionarios: funcionarios.length, funcionariosAtivos, salarioTotal, totalClientes: clientes.length, totalFornecedores: fornecedores.length, totalProdutos: produtos.length, quantidadeTotalStock, valorTotalStock, totalViaturas: viaturas.length, viaturasAtivas };
}

async function calcularSaldoEmConta(empresaId, dataRef) {
  try {
    const dataLimite = new Date(dataRef); dataLimite.setHours(23, 59, 59, 999);
    const bancos = await require('../models/Banco').find({ empresaId, ativo: true });
    let saldoTotal = 0; const detalhes = [];
    for (const banco of bancos) {
      const entradas = await require('../models/RegistoBancario').find({ empresaId, conta: banco.codNome, entradaSaida: 'entrada', data: { $lte: dataLimite } });
      const saidas = await require('../models/RegistoBancario').find({ empresaId, conta: banco.codNome, entradaSaida: 'saida', data: { $lte: dataLimite } });
      const totalEntradas = entradas.reduce((s, r) => s + (r.valor || 0), 0);
      const totalSaidas = saidas.reduce((s, r) => s + (r.valor || 0), 0);
      const saldoConta = (banco.saldoInicial || 0) + totalEntradas - totalSaidas;
      saldoTotal += saldoConta;
      detalhes.push({ nome: banco.nome, codNome: banco.codNome, saldoInicial: banco.saldoInicial || 0, entradas: totalEntradas, saidas: totalSaidas, saldoAtual: saldoConta, percentual: 0 });
    }
    detalhes.forEach(c => { c.percentual = saldoTotal > 0 ? (c.saldoAtual / saldoTotal) * 100 : 0; });
    return { saldoTotal, detalhesContas: detalhes };
  } catch (e) { return { saldoTotal: 0, detalhesContas: [] }; }
}

async function calcularIndicadoresFinanceiros(empresaId, dataInicio, dataFim) {
  try {
    const [vendas, pagamentos] = await Promise.all([
      require('../models/Venda').find({ empresaId, status: 'finalizada', data: { $gte: dataInicio, $lte: dataFim } }).catch(() => []),
      require('../models/Pagamento').find({ empresaId, dataPagamento: { $gte: dataInicio, $lte: dataFim } }).catch(() => [])
    ]);
    const saldoInicial = await calcularSaldoEmConta(empresaId, dataInicio);
    const saldoFinal = await calcularSaldoEmConta(empresaId, dataFim);
    let totalReceitas = vendas.reduce((s, v) => s + (v.total || 0), 0);
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
    vendas.forEach(v => { if (v.cliente) { if (clientesMap.has(v.cliente)) clientesMap.get(v.cliente).total += v.total; else clientesMap.set(v.cliente, { nome: v.cliente, total: v.total }); } });
    const topClientes = Array.from(clientesMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);
    return { saldoInicial: saldoInicial.saldoTotal, saldoFinal: saldoFinal.saldoTotal, detalhesContas: saldoFinal.detalhesContas, totalReceitas, totalDespesas, despesasPorCategoria: { fornecedores: despesasFornecedores, salarios: despesasSalarios, impostos: despesasImpostos, outros: despesasOutros }, resultadoAntesImpostos, imposto, resultadoLiquido, margemLucro: margemLucro.toFixed(2), margemBruta: margemBruta.toFixed(2), ticketMedio, totalVendas: vendas.length, topClientes };
  } catch (e) { return { saldoInicial: 0, saldoFinal: 0, detalhesContas: [], totalReceitas: 0, totalDespesas: 0, despesasPorCategoria: { fornecedores: 0, salarios: 0, impostos: 0, outros: 0 }, resultadoAntesImpostos: 0, imposto: 0, resultadoLiquido: 0, margemLucro: '0.00', margemBruta: '0.00', ticketMedio: 0, totalVendas: 0, topClientes: [] }; }
}

router.get('/submodulo/:moduloId', logMiddleware('relatorio-submodulo'), async (req, res) => {
  try {
    const { moduloId } = req.params;
    const { empresaId, tipoPeriodo = 'mensal', ano, mes } = req.query;
    if (!empresaId) return res.status(400).json({ erro: "Empresa não informada" });
    if (!MODULOS[moduloId]) return res.status(400).json({ erro: `Módulo "${moduloId}" não encontrado` });

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

    const periodo = calcPeriodo(tipoPeriodo, ano, mes);
    const [dados, financeiros, indicadoresEmpresa] = await Promise.all([
      executarRelatorioModulo(moduloId, empresaId, periodo),
      calcularIndicadoresFinanceiros(empresaId, periodo.dataInicio, periodo.dataFim),
      buscarIndicadoresEmpresa(empresaId)
    ]);

    const texto = gerarTextoModulo(MODULOS[moduloId], dados, empresa.nome, periodo, financeiros, indicadoresEmpresa);

    const relatorio = {
      sucesso: true, modulo: moduloId, grupo: MODULOS[moduloId].grupo,
      nome: MODULOS[moduloId].nome,
      empresa: { nome: empresa.nome, nif: empresa.nif },
      periodo: { tipo: tipoPeriodo, nome: periodo.nome, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim },
      dataGeracao: new Date().toISOString(),
      dados,
      indicadoresFinanceiros: financeiros,
      indicadoresEmpresa,
      texto,
      topClientes: financeiros.topClientes
    };

    try { await new Relatorio({ titulo: `${MODULOS[moduloId].nome} - ${periodo.nome}`, tipo: 'submodulo', modulo: moduloId, periodo: { mes: periodo.mes, ano: periodo.ano, nomeMes: periodo.nome, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim }, dados: relatorio, empresaId, usuario: req.user?.nome || 'Sistema' }).save(); } catch {}

    res.json(relatorio);
  } catch (error) {
    console.error('Erro relatório sub-módulo:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/grupo/:grupoId', logMiddleware('relatorio-grupo'), async (req, res) => {
  try {
    const { grupoId } = req.params;
    const { empresaId, tipoPeriodo = 'mensal', ano, mes } = req.query;
    if (!empresaId) return res.status(400).json({ erro: "Empresa não informada" });
    if (!GRUPOS[grupoId]) return res.status(400).json({ erro: `Grupo "${grupoId}" não encontrado` });

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

    const periodo = calcPeriodo(tipoPeriodo, ano, mes);
    const grupo = GRUPOS[grupoId];
    const subModulos = [];

    for (const modId of grupo.modulos) {
      const mod = MODULOS[modId];
      if (!mod) continue;
      try {
        const dados = await executarRelatorioModulo(modId, empresaId, periodo);
        subModulos.push({ modulo: modId, nome: mod.nome, dados });
      } catch (e) {
        subModulos.push({ modulo: modId, nome: mod.nome, dados: null, erro: e.message });
      }
    }

    const totalIndicadores = {};
    for (const sub of subModulos) {
      if (!sub.dados?.indicadores) continue;
      for (const ind of sub.dados.indicadores) {
        if (!totalIndicadores[ind.nome]) totalIndicadores[ind.nome] = 0;
        totalIndicadores[ind.nome] += Number(ind.valor) || 0;
      }
    }

    const [financeiros, indicadoresEmpresa] = await Promise.all([
      calcularIndicadoresFinanceiros(empresaId, periodo.dataInicio, periodo.dataFim),
      buscarIndicadoresEmpresa(empresaId)
    ]);

    const texto = gerarTextoModulo({ nome: grupo.nome }, { indicadores: Object.entries(totalIndicadores).map(([k, v]) => ({ nome: k, valor: v, fmt: v > 999 ? 'moeda' : 'numero' })), alertas: [] }, empresa.nome, periodo, financeiros, indicadoresEmpresa);

    const relatorio = {
      sucesso: true, grupo: grupoId, nome: grupo.nome,
      empresa: { nome: empresa.nome, nif: empresa.nif },
      periodo: { tipo: tipoPeriodo, nome: periodo.nome, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim },
      dataGeracao: new Date().toISOString(),
      indicadoresFinanceiros: financeiros,
      indicadoresEmpresa,
      texto,
      dados: {
        totalModulos: subModulos.length,
        indicadoresAgregados: Object.entries(totalIndicadores).map(([nome, valor]) => ({ nome, valor })),
        subModulos
      }
    };

    try { await new Relatorio({ titulo: `Relatório ${grupo.nome} - ${periodo.nome}`, tipo: 'grupo', modulo: grupoId, periodo: { mes: periodo.mes, ano: periodo.ano, nomeMes: periodo.nome, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim }, dados: relatorio, empresaId, usuario: req.user?.nome || 'Sistema' }).save(); } catch {}

    res.json(relatorio);
  } catch (error) {
    console.error('Erro relatório grupo:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/geral', logMiddleware('relatorio-geral'), async (req, res) => {
  try {
    const { empresaId, tipoPeriodo = 'mensal', ano, mes } = req.query;
    if (!empresaId) return res.status(400).json({ erro: "Empresa não informada" });

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

    const periodo = calcPeriodo(tipoPeriodo, ano, mes);
    const grupoResultados = {};

    for (const [grupoId, grupo] of Object.entries(GRUPOS)) {
      const subs = [];
      for (const modId of grupo.modulos) {
        try {
          const dados = await executarRelatorioModulo(modId, empresaId, periodo);
          subs.push({ modulo: modId, nome: MODULOS[modId]?.nome || modId, indicadores: dados?.indicadores || [] });
        } catch {}
      }
      grupoResultados[grupoId] = { nome: grupo.nome, totalSubModulos: subs.length, subModulos: subs };
    }

    const [financeiros, indicadoresEmpresa] = await Promise.all([
      calcularIndicadoresFinanceiros(empresaId, periodo.dataInicio, periodo.dataFim),
      buscarIndicadoresEmpresa(empresaId)
    ]);

    const texto = gerarTextoModulo({ nome: 'Geral' }, { indicadores: [], alertas: [] }, empresa.nome, periodo, financeiros, indicadoresEmpresa);

    const relatorio = {
      sucesso: true, modulo: 'geral',
      empresa: { nome: empresa.nome, nif: empresa.nif },
      periodo: { tipo: tipoPeriodo, nome: periodo.nome, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim },
      dataGeracao: new Date().toISOString(),
      indicadoresFinanceiros: financeiros,
      indicadoresEmpresa,
      texto,
      dados: { grupos: grupoResultados }
    };

    try { await new Relatorio({ titulo: `Relatório Geral - ${periodo.nome}`, tipo: 'geral', modulo: 'Geral', periodo: { mes: periodo.mes, ano: periodo.ano, nomeMes: periodo.nome }, dados: relatorio, empresaId, usuario: req.user?.nome || 'Sistema' }).save(); } catch {}

    res.json(relatorio);
  } catch (error) {
    console.error('Erro relatório geral:', error);
    res.status(500).json({ erro: error.message });
  }
});

router.get('/lista-modulos', (req, res) => {
  const grupos = {};
  for (const [gid, g] of Object.entries(GRUPOS)) {
    grupos[gid] = { nome: g.nome, modulos: g.modulos.map(mid => ({ id: mid, nome: MODULOS[mid]?.nome || mid })) };
  }
  res.json({ sucesso: true, grupos, total: Object.keys(MODULOS).length });
});

// ============================================
// HELPERS FOR NARRATIVE TEXT GENERATION
// ============================================
const FN = (v) => { if (v == null) return "0,00"; const n = Number(v); return isNaN(n) ? "0,00" : n.toLocaleString('pt-AO', { minimumFractionDigits: 2 }); };
const FI = (v) => { if (v == null) return "0"; const n = Number(v); return isNaN(n) ? "0" : n.toLocaleString('pt-AO'); };
const PL = (v, s, p) => v === 1 ? s : p;

function analisarVariacaoSaldo(saldoInicial, saldoFinal) {
  const va = saldoFinal - saldoInicial;
  const vp = saldoInicial !== 0 ? (va / Math.abs(saldoInicial)) * 100 : (saldoFinal !== 0 ? 100 : 0);
  let desc = "", pos = false;
  if (va > 0) { pos = true; desc = vp > 20 ? `crescimento expressivo de +${vp.toFixed(2)}% (${FN(Math.abs(va))} Kz)` : vp > 5 ? `crescimento moderado de +${vp.toFixed(2)}% (${FN(Math.abs(va))} Kz)` : vp > 0 ? `ligeiro aumento de +${vp.toFixed(2)}% (${FN(Math.abs(va))} Kz)` : `manutenção do mesmo valor (0%)`; }
  else if (va < 0) { desc = vp < -20 ? `diminuição significativa de ${Math.abs(vp).toFixed(2)}% (${FN(Math.abs(va))} Kz)` : vp < -5 ? `redução de ${Math.abs(vp).toFixed(2)}% (${FN(Math.abs(va))} Kz)` : `ligeira diminuição de ${Math.abs(vp).toFixed(2)}% (${FN(Math.abs(va))} Kz)`; }
  else { desc = `manutenção do mesmo valor (0%)`; }
  return { descricao: desc, positivo: pos, variacaoPercentual: vp, variacaoAbsoluta: va };
}

function analisarResultado(rl, ml) {
  const ra = Math.abs(rl); const m = parseFloat(ml);
  if (rl > 0) { if (m > 25) return { tipo: "excelente", desc: `excelente, com lucro de ${FN(ra)} Kwanzas e margem de ${m}%`, pos: true }; if (m > 10) return { tipo: "bom", desc: `bom, com lucro de ${FN(ra)} Kwanzas e margem de ${m}%`, pos: true }; if (m > 0) return { tipo: "moderado", desc: `moderado, com lucro de ${FN(ra)} Kwanzas mas margem reduzida de ${m}%`, pos: true }; return { tipo: "positivo", desc: `positivo, a empresa gerou lucro de ${FN(ra)} Kwanzas`, pos: true }; }
  if (rl < 0) { if (m < -20) return { tipo: "crítico", desc: `crítico, com prejuízo de ${FN(ra)} Kwanzas (${Math.abs(m)}% de margem negativa)`, pos: false }; if (m < -5) return { tipo: "preocupante", desc: `preocupante, a empresa registou prejuízo de ${FN(ra)} Kwanzas`, pos: false }; return { tipo: "negativo", desc: `negativo, a empresa operou com prejuízo de ${FN(ra)} Kwanzas`, pos: false }; }
  return { tipo: "neutro", desc: `neutro, a empresa atingiu o ponto de equilíbrio`, pos: true };
}

function analisarEficiencia(mb, ml) {
  const m = parseFloat(mb);
  if (m < 0) return "ineficiente - as operações estão a gerar prejuízo, situação que exige reestruturação urgente";
  if (m < 5) return "baixa - a empresa tem dificuldade em converter receitas em lucro operacional";
  if (m < 15) return "moderada - há espaço para optimização dos processos e redução de custos";
  if (m < 25) return "boa - a empresa demonstra eficiência operacional satisfatória";
  return "excelente - a gestão operacional é altamente eficiente";
}

// ============================================
// NARRATIVE TEXT GENERATOR FOR ANY MODULE
// ============================================
function gerarTextoModulo(cfg, dados, empresaNome, periodo, financeiros, indicadoresEmpresa) {
  const fi = financeiros || {};
  const ei = indicadoresEmpresa || {};
  const totalReceitas = fi.totalReceitas || 0;
  const totalDespesas = fi.totalDespesas || 0;
  const resultadoLiquido = fi.resultadoLiquido || 0;
  const margemLucro = fi.margemLucro || "0.00";
  const margemBruta = fi.margemBruta || "0.00";
  const ticketMedio = fi.ticketMedio || 0;
  const totalVendas = fi.totalVendas || 0;
  const saldoInicial = fi.saldoInicial || 0;
  const saldoFinal = fi.saldoFinal || 0;
  const despesasPorCategoria = fi.despesasPorCategoria || { fornecedores: 0, salarios: 0, impostos: 0, outros: 0 };

  const variacaoSaldo = analisarVariacaoSaldo(saldoInicial, saldoFinal);
  const resultadoAnalise = analisarResultado(resultadoLiquido, margemLucro);
  const eficienciaAnalise = analisarEficiencia(margemBruta, margemLucro);
  const nomeModulo = cfg?.nome || "Módulo";
  const textoVariacaoSaldo = variacaoSaldo.positivo
    ? `evolução favorável, com ${variacaoSaldo.descricao}, sinalizando uma gestão de tesouraria eficaz`
    : `evolução desfavorável, com ${variacaoSaldo.descricao}, situação que merece atenção da administração`;

  // Get module-specific indicators for contextual text
  const inds = dados?.indicadores || [];
  const indMap = {};
  inds.forEach(ind => { indMap[ind.id] = ind.valor; });

  // INTRODUCAO
  const introducao = `O presente Relatório de Gestão do módulo "${nomeModulo}", elaborado nos termos da legislação comercial angolana e das boas práticas de governação corporativa, tem como objectivo primordial apresentar uma análise exaustiva e pormenorizada da execução financeira, operacional e estratégica da sociedade comercial denominada "${empresaNome}", relativamente ao período compreendido entre ${periodo.dataInicio ? new Date(periodo.dataInicio).toLocaleDateString('pt-AO') : 'N/A'} e ${periodo.dataFim ? new Date(periodo.dataFim).toLocaleDateString('pt-AO') : 'N/A'}, correspondente ao ${periodo.nome || 'período em análise'} do exercício económico em curso.

Este documento constitui um instrumento de gestão fundamental para a tomada de decisões informadas, permitindo aos órgãos de administração, accionistas e demais stakeholders uma visão clara e transparente do desempenho organizacional no âmbito do módulo "${nomeModulo}". A metodologia adoptada baseou-se na recolha, tratamento e análise crítica dos dados registados no sistema de gestão empresarial.

Durante o período em análise, a empresa manteve o seu compromisso com a excelência operacional e a satisfação dos seus clientes, tendo implementado diversas acções com vista à optimização dos seus processos internos. Os resultados alcançados reflectem o esforço colectivo de toda a equipa e a eficácia das estratégias delineadas pela administração.

Importa salientar que este relatório foi produzido em conformidade com os princípios de transparência, rigor e objectividade, constituindo-se como uma ferramenta de trabalho indispensável para a avaliação do desempenho organizacional e para a definição de objectivos futuros.`;

  // ENQUADRAMENTO GERAL (company-wide context)
  const textoVendas = `${totalVendas} ${PL(totalVendas, "transacção comercial", "transacções comerciais")}`;
  const textoResultado = resultadoLiquido !== 0 ? `${FN(Math.abs(resultadoLiquido))} Kwanzas` : "zero Kwanzas";
  const textoSinal = resultadoLiquido > 0 ? "lucro" : (resultadoLiquido < 0 ? "prejuízo" : "equilíbrio");

  const enquadramento = `No período em análise, a "${empresaNome}" registou receitas totais no montante de ${FN(totalReceitas)} Kwanzas, provenientes da comercialização de produtos e da prestação de serviços, com destaque para as transacções comerciais realizadas com os seus clientes, que totalizaram ${textoVendas}. Do lado das despesas, a empresa incorreu em custos totais de ${FN(totalDespesas)} Kwanzas, distribuídos pelas seguintes categorias: pagamentos a fornecedores (${totalDespesas > 0 ? ((despesasPorCategoria.fornecedores / totalDespesas) * 100).toFixed(1) : 0}% do total), despesas com pessoal (${totalDespesas > 0 ? ((despesasPorCategoria.salarios / totalDespesas) * 100).toFixed(1) : 0}%), obrigações fiscais (${totalDespesas > 0 ? ((despesasPorCategoria.impostos / totalDespesas) * 100).toFixed(1) : 0}%) e outras despesas (${totalDespesas > 0 ? ((despesasPorCategoria.outros / totalDespesas) * 100).toFixed(1) : 0}%).

${fi.resultadoAntesImpostos !== undefined ? `O resultado antes de impostos apurado foi de ${FN(fi.resultadoAntesImpostos)} Kwanzas. ${fi.resultadoAntesImpostos > 0 ? `Após a aplicação do imposto industrial à taxa de 25%, no montante de ${FN(fi.imposto || 0)} Kwanzas, o resultado líquido do período foi de ${FN(Math.abs(resultadoLiquido))} Kwanzas, configurando um desempenho financeiro ${resultadoAnalise.tipo} (${textoSinal} de ${textoResultado}).` : `Não houve imposto a pagar uma vez que não se registou lucro tributável.`}` : ''}

A margem de lucro líquida situou-se em ${margemLucro}%, enquanto a margem bruta se fixou em ${margemBruta}%. A eficiência operacional é considerada ${eficienciaAnalise}. O ticket médio das transacções foi de ${FN(ticketMedio)} Kwanzas.

No que concerne à liquidez, o saldo bancário ${textoVariacaoSaldo}. Partiu de ${FN(saldoInicial)} Kwanzas no início do período e encerrou em ${FN(saldoFinal)} Kwanzas no final do período.${fi.detalhesContas && fi.detalhesContas.length > 0 ? ` A distribuição do saldo pelas contas bancárias é: ${fi.detalhesContas.map(c => `${c.nome}: ${FN(c.saldoAtual)} Kz (${c.percentual.toFixed(1)}%)`).join(', ')}.` : ''}

Relativamente ao módulo "${nomeModulo}", ${inds.length > 0 ? `foram apurados os seguintes indicadores: ${inds.map(i => `${i.nome}: ${i.fmt === 'moeda' ? FN(i.valor) + ' Kz' : FI(i.valor)}`).join('; ')}.` : 'não foram registados indicadores específicos no período.'}`;

  // ANALISE FINANCEIRA
  let analiseFinanceira = `A análise financeira detalhada da "${empresaNome}" revela aspectos importantes sobre a saúde financeira da organização. As receitas totais de ${FN(totalReceitas)} Kwanzas reflectem a actividade comercial do período. `;

  if (resultadoLiquido < 0) {
    analiseFinanceira += `O resultado líquido negativo de ${FN(Math.abs(resultadoLiquido))} Kwanzas indica que a empresa está a gastar mais do que arrecada. Esta situação requer uma revisão aprofundada da estrutura de custos e da política de preços. Recomenda-se a implementação de medidas de contenção de despesas e aumento da eficiência operacional. `;
  } else if (parseFloat(margemLucro) < 10 && resultadoLiquido > 0) {
    analiseFinanceira += `Embora a empresa tenha gerado lucro de ${FN(resultadoLiquido)} Kwanzas, a margem reduzida de ${margemLucro}% sugere vulnerabilidade a pequenas variações nos custos ou receitas. Recomenda-se a optimização da eficiência operacional. `;
  } else if (parseFloat(margemLucro) > 25) {
    analiseFinanceira += `A excelente margem de lucro de ${margemLucro}% demonstra a capacidade da empresa de gerar valor a partir das suas operações. `;
  } else if (parseFloat(margemLucro) === 0) {
    analiseFinanceira += `A empresa operou no ponto de equilíbrio, sem gerar lucro nem prejuízo no período. `;
  }

  if (parseFloat(margemBruta) < 0) {
    analiseFinanceira += `A margem bruta negativa de ${margemBruta}% é preocupante, indicando que as operações principais estão a gerar prejuízo antes mesmo de considerar despesas administrativas ou financeiras. `;
  }

  analiseFinanceira += `No contexto do módulo "${nomeModulo}", `;
  if (inds.length > 0) {
    analiseFinanceira += `os indicadores apurados reflectem o desempenho específico desta área funcional, contribuindo para a análise integrada da organização. `;
  } else {
    analiseFinanceira += `não foram registados indicadores específicos neste período, recomendando-se o preenchimento dos dados necessários para uma análise mais precisa. `;
  }

  // ANALISE OPERACIONAL
  const totalFuncionarios = ei.totalFuncionarios || 0;
  const totalClientes = ei.totalClientes || 0;
  const totalProdutos = ei.totalProdutos || 0;
  const totalViaturas = ei.totalViaturas || 0;

  let analiseOperacional = `Do ponto de vista operacional, a empresa realizou ${totalVendas} ${PL(totalVendas, "transacção comercial", "transacções comerciais")} no período. `;

  if (totalVendas === 0) {
    analiseOperacional += `A ausência de vendas é um sinal de alerta que requer investigação imediata. `;
  } else if (totalVendas < 10) {
    analiseOperacional += `O volume reduzido de negócios sugere necessidade de reforço das acções de marketing e prospecção. `;
  }

  if (totalFuncionarios === 0) {
    analiseOperacional += `A empresa não possui colaboradores registados, lacuna que compromete a gestão de recursos humanos. `;
  } else {
    analiseOperacional += `A equipa é composta por ${totalFuncionarios} ${PL(totalFuncionarios, "colaborador", "colaboradores")}. `;
  }
  if (totalClientes === 0) {
    analiseOperacional += `Não existem clientes cadastrados, o que limita a análise do relacionamento comercial. `;
  } else {
    analiseOperacional += `Existem ${totalClientes} ${PL(totalClientes, "cliente cadastrado", "clientes cadastrados")}. `;
  }
  if (totalProdutos === 0) {
    analiseOperacional += `O cadastro de produtos está vazio, impossibilitando o controlo de inventário. `;
  } else {
    analiseOperacional += `O inventário conta com ${totalProdutos} ${PL(totalProdutos, "produto", "produtos")}. `;
  }
  if (totalViaturas > 0) {
    analiseOperacional += `A frota é constituída por ${totalViaturas} ${PL(totalViaturas, "viatura", "viaturas")}. `;
  }

  analiseOperacional += `No âmbito do módulo "${nomeModulo}", `;
  const alertas = dados?.alertas || [];
  if (alertas.length > 0) {
    analiseOperacional += `foram identificados ${alertas.length} ${PL(alertas.length, "alerta", "alertas")} que requerem atenção: ${alertas.map(a => `${a.nome} (${a.quantidade})`).join(', ')}. `;
  } else {
    analiseOperacional += `não foram identificados alertas ou anomalias no período, indicando uma operação dentro dos parâmetros esperados. `;
  }

  // ANALISE CONTAS CORRENTES (placeholder)
  let analiseContasCorrentes = `\n\nANÁLISE DE CONTAS CORRENTES\n`;
  analiseContasCorrentes += `Não existem dados de contas correntes de fornecedores específicos para o módulo "${nomeModulo}". `;

  // RECOMENDACOES
  const todasRecomendacoes = [];
  if (resultadoLiquido < 0) {
    todasRecomendacoes.push("Implementação urgente de um plano de recuperação financeira com metas mensais de redução de custos e aumento de receitas.");
    todasRecomendacoes.push("Revisão aprofundada da estrutura de custos, identificando e eliminando despesas não essenciais.");
  }
  if (!variacaoSaldo.positivo) {
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
  if (altoNumeroAlertas(alertas)) {
    todasRecomendacoes.push(`Atenção especial aos ${alertas.length} alertas identificados no módulo "${nomeModulo}", priorizando a resolução dos mais críticos.`);
  }
  todasRecomendacoes.push(`Monitorização contínua dos indicadores do módulo "${nomeModulo}" com reporte periódico à administração.`);
  todasRecomendacoes.push("Manutenção do registo actualizado de todas as operações no sistema de gestão empresarial.");
  todasRecomendacoes.push("Estabelecimento de um sistema de metas e incentivos alinhado com os objectivos estratégicos da organização.");

  let textoRecomendacoes = "Com base na análise efectuada, recomenda-se:\n\n";
  todasRecomendacoes.forEach((rec, index) => { textoRecomendacoes += `${index + 1}. ${rec}\n`; });

  // CONCLUSAO
  let conclusao = `Em síntese, o presente Relatório de Gestão do módulo "${nomeModulo}" permite concluir que a "${empresaNome}" encerrou o período ${periodo.nome || 'em análise'} com um desempenho financeiro ${resultadoAnalise.tipo}. `;
  if (resultadoLiquido > 0) {
    conclusao += `A empresa gerou lucro de ${FN(resultadoLiquido)} Kwanzas, com margem de ${margemLucro}%. `;
  } else if (resultadoLiquido < 0) {
    conclusao += `A empresa registou prejuízo de ${FN(Math.abs(resultadoLiquido))} Kwanzas, situação que exige acção correctiva urgente. `;
  } else {
    conclusao += `A empresa atingiu o ponto de equilíbrio, sem lucro nem prejuízo, situação que requer identificação de oportunidades de crescimento. `;
  }
  if (variacaoSaldo.positivo) conclusao += `O saldo bancário evoluiu favoravelmente (${variacaoSaldo.descricao}), sinal positivo para a liquidez. `;
  if (totalVendas === 0 || totalClientes === 0) {
    conclusao += `Verifica-se a necessidade de preenchimento de dados críticos no sistema, fundamentais para uma gestão mais eficaz. `;
  }
  conclusao += `Recomenda-se a implementação das medidas propostas e o acompanhamento contínuo dos indicadores de desempenho. A administração mantém o compromisso com a melhoria contínua, a transparência na gestão e a criação de valor sustentável para todos os stakeholders.`;

  return { introducao, enquadramento, analiseFinanceira, analiseOperacional, analiseContasCorrentes, recomendacoes: textoRecomendacoes, conclusao };
}

function altoNumeroAlertas(alertas) {
  return alertas.some(a => a.quantidade > 5);
}

module.exports = router;
