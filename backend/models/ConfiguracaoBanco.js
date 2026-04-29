// backend/models/ConfiguracaoBanco.js
const mongoose = require('mongoose');

const ConfiguracaoBancoSchema = new mongoose.Schema({
  empresaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Empresa', 
    required: true,
    unique: true 
  },
  
  // Dados Bancários da Empresa
  banco: { type: String, default: '' },
  numeroConta: { type: String, default: '' },
  iban: { type: String, default: '' },
  swift: { type: String, default: '' },
  titular: { type: String, default: '' },
  nif: { type: String, default: '' },
  
  // Dados de Contacto
  endereco: { type: String, default: '' },
  telefone: { type: String, default: '' },
  email: { type: String, default: '' },
  
  // Status
  ativo: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware para atualizar o updatedAt
ConfiguracaoBancoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Índice para busca por empresa
ConfiguracaoBancoSchema.index({ empresaId: 1 });

module.exports = mongoose.models.ConfiguracaoBanco || mongoose.model('ConfiguracaoBanco', ConfiguracaoBancoSchema);