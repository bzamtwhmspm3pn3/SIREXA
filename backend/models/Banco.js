// backend/models/Banco.js
const mongoose = require('mongoose');

const BancoSchema = new mongoose.Schema({
  codNome: { type: String, required: true },
  nome: { type: String, required: true },
  iban: { type: String, required: true },
  swift: { type: String },
  saldoInicial: { type: Number, default: 0 },
  moeda: { type: String, default: 'AOA' },
  ativo: { type: Boolean, default: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Banco', BancoSchema);