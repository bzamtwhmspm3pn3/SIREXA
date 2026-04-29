const mongoose = require('mongoose');

const FluxoCaixaSchema = new mongoose.Schema({
  referencia: { type: String, unique: true, sparse: true },
  data: { type: Date, required: true, default: Date.now },
  descricao: { type: String, required: true },
  tipo: { type: String, enum: ['Entrada', 'Saída'], required: true },
  valor: { type: Number, required: true, min: 0 },
  categoria: { type: String, default: 'Outros' },
  subtipo: { type: String, default: '' },
  observacao: { type: String, default: '' },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  origem: { 
    type: String, 
    enum: ['Manual', 'Vendas', 'Pagamentos', 'Transferencias'],
    default: 'Manual'
  },
  origemId: { type: mongoose.Schema.Types.ObjectId },
  origemModel: { type: String },
  status: { type: String, enum: ['Pendente', 'Aprovado', 'Cancelado'], default: 'Aprovado' },
  criadoPor: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Índices
FluxoCaixaSchema.index({ referencia: 1 }, { sparse: true, unique: true });
FluxoCaixaSchema.index({ empresaId: 1 });
FluxoCaixaSchema.index({ data: -1 });
FluxoCaixaSchema.index({ tipo: 1 });

module.exports = mongoose.models.FluxoCaixa || mongoose.model('FluxoCaixa', FluxoCaixaSchema);