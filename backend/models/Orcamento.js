const mongoose = require('mongoose');

const OrcamentoSchema = new mongoose.Schema({
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  
  // Informações básicas
  descricao: { type: String, required: true },
  categoria: { type: String, required: true },
  
  // Tipos de Orçamento
  tipoOrcamento: {
    type: String,
    enum: [
      'Base Zero',      // Orçamento do zero, sem base histórica
      'Opex',           // Operational Expenditure (despesas operacionais)
      'Capex',          // Capital Expenditure (investimentos)
      'Vendas',         // Orçamento de vendas
      'Custos',         // Orçamento de custos
      'Fluxo Caixa',    // Orçamento de fluxo de caixa
      'Investimento',   // Orçamento de investimentos
      'Marketing',      // Orçamento de marketing
      'Pessoal',        // Orçamento de pessoal
      'Tecnologia',     // Orçamento de TI
      'Infraestrutura', // Orçamento de infraestrutura
      'Outros'
    ],
    required: true,
    default: 'Base Zero'
  },
  
  // Cenários
  cenario: {
    type: String,
    enum: ['Otimista', 'Pessimista', 'Realista', 'Aprovado'],
    default: 'Realista'
  },
  
  // Status
  status: {
    type: String,
    enum: ['Rascunho', 'Pendente', 'Aprovado', 'Rejeitado', 'Em Execução', 'Concluído'],
    default: 'Rascunho'
  },
  
  // Valores
  valor: { type: Number, required: true, min: 0 },
  valorRealizado: { type: Number, default: 0 },
  desvio: { type: Number, default: 0 },
  percentualExecucao: { type: Number, default: 0 },
  
  // Período
  mes: { type: Number, required: true, min: 1, max: 12 },
  ano: { type: Number, required: true },
  dataOrcamento: { type: Date, required: true },
  
  // Justificativa e observações
  justificativa: { type: String, default: '' },
  observacoes: { type: String, default: '' },
  
  // Aprovação
  aprovadoPor: { type: String, default: '' },
  dataAprovacao: { type: Date },
  motivoRejeicao: { type: String, default: '' },
  
  // Histórico de alterações
  historico: [{
    data: { type: Date, default: Date.now },
    campo: { type: String },
    valorAntigo: { type: mongoose.Schema.Types.Mixed },
    valorNovo: { type: mongoose.Schema.Types.Mixed },
    alteradoPor: { type: String }
  }],
  
  // Comentários
  comentarios: [{
    texto: { type: String },
    autor: { type: String },
    data: { type: Date, default: Date.now }
  }],
  
  // Metadados
  criadoPor: { type: String },
  atualizadoPor: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índices
OrcamentoSchema.index({ empresaId: 1, ano: 1, mes: 1 });
OrcamentoSchema.index({ empresaId: 1, tipoOrcamento: 1 });
OrcamentoSchema.index({ empresaId: 1, cenario: 1 });

// Middleware para calcular desvio e percentual antes de salvar
OrcamentoSchema.pre('save', function(next) {
  if (this.valorRealizado > 0) {
    this.desvio = this.valorRealizado - this.valor;
    this.percentualExecucao = (this.valorRealizado / this.valor) * 100;
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.Orcamento || mongoose.model('Orcamento', OrcamentoSchema);