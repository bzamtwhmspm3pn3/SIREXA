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

router.get('/submodulo/:moduloId', logMiddleware('relatorio-submodulo'), async (req, res) => {
  try {
    const { moduloId } = req.params;
    const { empresaId, tipoPeriodo = 'mensal', ano, mes } = req.query;
    if (!empresaId) return res.status(400).json({ erro: "Empresa não informada" });
    if (!MODULOS[moduloId]) return res.status(400).json({ erro: `Módulo "${moduloId}" não encontrado` });

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

    const periodo = calcPeriodo(tipoPeriodo, ano, mes);
    const dados = await executarRelatorioModulo(moduloId, empresaId, periodo);

    const relatorio = {
      sucesso: true, modulo: moduloId, grupo: MODULOS[moduloId].grupo,
      nome: MODULOS[moduloId].nome,
      empresa: { nome: empresa.nome, nif: empresa.nif },
      periodo: { tipo: tipoPeriodo, nome: periodo.nome, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim },
      dataGeracao: new Date().toISOString(),
      dados
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

    const relatorio = {
      sucesso: true, grupo: grupoId, nome: grupo.nome,
      empresa: { nome: empresa.nome, nif: empresa.nif },
      periodo: { tipo: tipoPeriodo, nome: periodo.nome, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim },
      dataGeracao: new Date().toISOString(),
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

    const relatorio = {
      sucesso: true, modulo: 'geral',
      empresa: { nome: empresa.nome, nif: empresa.nif },
      periodo: { tipo: tipoPeriodo, nome: periodo.nome, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim },
      dataGeracao: new Date().toISOString(),
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

module.exports = router;
