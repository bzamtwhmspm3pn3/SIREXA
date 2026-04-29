// backend/models/Abastecimento.js
const mongoose = require('mongoose');

const AbastecimentoSchema = new mongoose.Schema({
  viaturaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viatura', required: true },
  viaturaMatricula: { type: String, required: true },
  quantidade: { type: Number, required: true },
  precoLitro: { type: Number, required: true },
  tipoCombustivel: { 
    type: String, 
    enum: ['Gasolina', 'Diesel', 'Elétrico', 'Híbrido', 'GNV'], 
    required: true 
  },
  km: { type: Number, required: true },
  total: { type: Number, required: true },
  postoCombustivel: { type: String },
  observacao: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  dataAbastecimento: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  usuario: { type: String }
});

// Índices
AbastecimentoSchema.index({ empresaId: 1 });
AbastecimentoSchema.index({ viaturaId: 1 });
AbastecimentoSchema.index({ dataAbastecimento: -1 });
AbastecimentoSchema.index({ empresaId: 1, dataAbastecimento: -1 });

module.exports = mongoose.models.Abastecimento || mongoose.model('Abastecimento', AbastecimentoSchema);