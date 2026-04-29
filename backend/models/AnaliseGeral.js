// backend/models/AnaliseGeral.js
const mongoose = require('mongoose');

const AnaliseGeralSchema = new mongoose.Schema({
  periodo: {
    ano: { type: Number, required: true },
    mes: { type: Number, required: true },
    nomeMes: { type: String, required: true }
  },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  
  // Métricas Financeiras
  financeiro: {
    receitaTotal: { type: Number, default: 0 },
    despesaTotal: { type: Number, default: 0 },
    lucroLiquido: { type: Number, default: 0 },
    margemLucro: { type: Number, default: 0 },
    roi: { type: Number, default: 0 },
    ticketMedio: { type: Number, default: 0 },
    tendenciaReceita: { type: Number, default: 0 },
    tendenciaDespesa: { type: Number, default: 0 },
    projecaoReceita: { type: Number, default: 0 },
    projecaoLucro: { type: Number, default: 0 },
    receitasPorCategoria: { type: Object, default: {} },
    despesasPorCategoria: { type: Object, default: {} }
  },
  
  // Métricas Operacionais
  operacional: {
    totalVendas: { type: Number, default: 0 },
    totalTransferencias: { type: Number, default: 0 },
    totalPagamentos: { type: Number, default: 0 },
    totalClientes: { type: Number, default: 0 },
    totalFornecedores: { type: Number, default: 0 },
    totalFuncionarios: { type: Number, default: 0 },
    eficienciaOperacional: { type: Number, default: 0 },
    produtividade: { type: Number, default: 0 },
    giroEstoque: { type: Number, default: 0 }
  },
  
  // Saúde Financeira
  saudeFinanceira: {
    score: { type: Number, default: 0 },
    classificacao: { type: String, default: 'Regular' },
    liquidez: { type: Number, default: 0 },
    endividamento: { type: Number, default: 0 },
    rentabilidade: { type: Number, default: 0 },
    recomendacoes: [{ type: String }]
  },
  
  // Insights IA
  insightsIA: [{
    tipo: { type: String, enum: ['positivo', 'neutro', 'alerta', 'critico'] },
    titulo: { type: String },
    descricao: { type: String },
    impacto: { type: String },
    acaoRecomendada: { type: String },
    prioridade: { type: String, enum: ['alta', 'media', 'baixa'] }
  }],
  
  // Previsões
  previsoes: [{
    periodo: { type: String },
    valor: { type: Number },
    intervaloConfianca: { type: Number },
    descricao: { type: String },
    cenario: { type: String, enum: ['otimista', 'conservador', 'pessimista'] }
  }],
  
  // Comparativos
  comparativos: {
    mesAnterior: {
      crescimentoReceita: { type: Number, default: 0 },
      crescimentoLucro: { type: Number, default: 0 }
    },
    anoAnterior: {
      crescimentoReceita: { type: Number, default: 0 },
      crescimentoLucro: { type: Number, default: 0 }
    }
  },
  
  // Evolução Mensal
  evolucaoMensal: [{
    mes: { type: String },
    receita: { type: Number },
    despesa: { type: Number },
    lucro: { type: Number }
  }],
  
  // Top Performers
  topClientes: [{
    nome: { type: String },
    totalCompras: { type: Number },
    quantidade: { type: Number }
  }],
  
  topProdutos: [{
    nome: { type: String },
    quantidade: { type: Number },
    receita: { type: Number }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AnaliseGeral', AnaliseGeralSchema);