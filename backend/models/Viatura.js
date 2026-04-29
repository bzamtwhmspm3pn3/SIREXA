// backend/models/Viatura.js - CORRIGIDO
const mongoose = require('mongoose');

const ViaturaSchema = new mongoose.Schema({
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  matricula: { type: String, required: true },
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  cor: { type: String, default: '' },
  ano: { type: Number, required: true },
  motorista: { type: String, default: '' },
  km: { type: Number, default: 0 },
  estado: { type: String, enum: ['Em uso', 'Em manutenção', 'Reserva', 'Avariada', 'Desativada'], default: 'Em uso' },
  aquisicao: { type: String, default: '' },
  valorAquisicao: { type: Number, default: 0 },
  vidaUtil: { type: String, default: '' },
  combustivel: { type: String, enum: ['Gasolina', 'Diesel', 'Elétrico', 'Híbrido', ''], default: '' },
  consumoMedio: { type: Number, default: null },
  ultimaRevisao: { type: Date, default: null },
  proximaRevisao: { type: Date, default: null },
  ativo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índice composto para garantir unicidade da matrícula por empresa (apenas ativas)
ViaturaSchema.index({ empresaId: 1, matricula: 1 }, { unique: true, partialFilterExpression: { ativo: true } });

module.exports = mongoose.model('Viatura', ViaturaSchema);