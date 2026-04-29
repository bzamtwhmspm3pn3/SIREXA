const mongoose = require('mongoose');

const IndicadorSchema = new mongoose.Schema({
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  mes: { type: Number, required: true },
  ano: { type: Number, required: true },
  
  // Indicadores Financeiros
  liquidez: { type: Number, default: 0 },
  rentabilidade: { type: Number, default: 0 },
  margemLucro: { type: Number, default: 0 },
  endividamento: { type: Number, default: 0 },
  pontoEquilibrio: { type: Number, default: 0 },
  resultadoOperacional: { type: Number, default: 0 },
  resultadoLiquido: { type: Number, default: 0 },
  impostosPagos: { type: Number, default: 0 },
  fluxoCaixaOperacional: { type: Number, default: 0 },
  fluxoCaixaInvestimento: { type: Number, default: 0 },
  fluxoCaixaFinanciamento: { type: Number, default: 0 },
  caixaFinal: { type: Number, default: 0 },
  
  // Indicadores da Empresa
  totalEmpresas: { type: Number, default: 0 },
  totalTecnicos: { type: Number, default: 0 },
  totalFuncionarios: { type: Number, default: 0 },
  totalViaturas: { type: Number, default: 0 },
  totalAbastecimentos: { type: Number, default: 0 },
  totalManutencoes: { type: Number, default: 0 },
  totalFornecedores: { type: Number, default: 0 },
  totalVendas: { type: Number, default: 0 },
  totalPagamentos: { type: Number, default: 0 },
  
  // Evolução e Distribuição
  evolucaoMensal: { type: mongoose.Schema.Types.Mixed, default: [] },
  distribuicaoReceitas: { type: mongoose.Schema.Types.Mixed, default: [] },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

IndicadorSchema.index({ empresaId: 1, ano: 1, mes: 1 }, { unique: true });

module.exports = mongoose.models.Indicador || mongoose.model('Indicador', IndicadorSchema);