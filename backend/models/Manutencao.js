// backend/models/Manutencao.js
const mongoose = require('mongoose');

const ManutencaoSchema = new mongoose.Schema({
  viaturaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viatura', required: true },
  viaturaMatricula: { type: String, required: true },
  descricao: { type: String, required: true },
  custo: { type: Number, required: true },
  tipoManutencao: { 
    type: String, 
    enum: ['Preventiva', 'Corretiva', 'Urgente', 'Revisão'],
    default: 'Preventiva'
  },
  motorista: { type: String },
  km: { type: Number, default: 0 },
  dataManutencao: { type: Date, required: true },
  observacao: { type: String },
  imagemUrl: { type: String },
  fornecedor: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  usuario: { type: String }
});

// Índices
ManutencaoSchema.index({ empresaId: 1 });
ManutencaoSchema.index({ viaturaId: 1 });
ManutencaoSchema.index({ dataManutencao: -1 });
ManutencaoSchema.index({ empresaId: 1, dataManutencao: -1 });

module.exports = mongoose.models.Manutencao || mongoose.model('Manutencao', ManutencaoSchema);