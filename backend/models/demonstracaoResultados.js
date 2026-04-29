const mongoose = require('mongoose');

const DemonstracaoResultadosSchema = new mongoose.Schema({
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  empresaNome: { type: String, required: true },
  
  // Período
  periodo: {
    tipo: { type: String, enum: ['mensal', 'bimestral', 'trimestral', 'semestral', 'anual'], required: true },
    ano: { type: Number, required: true },
    mes: { type: Number, required: true },
    dataInicio: { type: Date, required: true },
    dataFim: { type: Date, required: true }
  },
  
  // ========== PROVEITOS OPERACIONAIS ==========
  proveitosOperacionais: {
    vendas: { type: Number, default: 0 },
    prestacoesServicos: { type: Number, default: 0 },
    outrosProveitosOperacionais: { type: Number, default: 0 },
    variacoesProdutosAcabados: { type: Number, default: 0 },
    trabalhosPropriaEmpresa: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // ========== CUSTOS OPERACIONAIS ==========
  custosOperacionais: {
    custoMercadoriasVendidas: { type: Number, default: 0 },
    materiasPrimasConsumidas: { type: Number, default: 0 },
    custosPessoal: { type: Number, default: 0 },
    amortizacoes: { type: Number, default: 0 },
    outrosCustosPerdasOperacionais: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // ========== RESULTADOS ==========
  resultados: {
    operacionais: { type: Number, default: 0 },
    financeiros: { type: Number, default: 0 },
    filiaisAssociados: { type: Number, default: 0 },
    naoOperacionais: { type: Number, default: 0 },
    antesImpostos: { type: Number, default: 0 },
    impostoRendimento: { type: Number, default: 0 },
    liquidosAtividadesCorrentes: { type: Number, default: 0 },
    extraordinarios: { type: Number, default: 0 },
    impostoRendimentoExtraordinario: { type: Number, default: 0 },
    liquidosExercicio: { type: Number, default: 0 }
  },
  
  // Metadados
  criadoPor: { type: String },
  atualizadoPor: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Índices
DemonstracaoResultadosSchema.index({ empresaId: 1, periodo: 1 });
DemonstracaoResultadosSchema.index({ 'periodo.ano': 1, 'periodo.mes': 1 });

module.exports = mongoose.models.DemonstracaoResultados || mongoose.model('DemonstracaoResultados', DemonstracaoResultadosSchema);