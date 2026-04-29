// backend/models/Gestor.js
const mongoose = require('mongoose');

const GestorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  telefone: { type: String, default: '' },
  empresas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Empresa' }], // ← IMPORTANTE
  role: { type: String, default: 'gestor' },
  ativo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Gestor || mongoose.model('Gestor', GestorSchema);