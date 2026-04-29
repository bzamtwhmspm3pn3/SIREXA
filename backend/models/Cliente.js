// backend/models/Cliente.js
const mongoose = require('mongoose');

const ClienteSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  nif: { type: String, required: true, unique: true },
  email: { type: String },
  telefone: { type: String },
  endereco: { type: String },
  cidade: { type: String, default: 'Luanda' },
  tipo: { type: String, enum: ['particular', 'empresa', 'revendedor'], default: 'particular' },
  limiteCredito: { type: Number, default: 0 },
  saldoDevedor: { type: Number, default: 0 },
  observacoes: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  ativo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cliente', ClienteSchema);