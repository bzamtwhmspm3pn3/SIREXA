// backend/models/LogAtividade.js
const mongoose = require('mongoose');

const logAtividadeSchema = new mongoose.Schema({
  // Quem fez a ação
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usuarioNome: { type: String, required: true },
  usuarioTipo: { type: String, enum: ['gestor', 'tecnico', 'admin'], required: true },
  usuarioEmail: { type: String, required: true },
  
  // Qual empresa
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  empresaNome: { type: String, required: true },
  
  // O que foi feito
  acao: { type: String, required: true }, // CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT
  modulo: { type: String, required: true }, // vendas, stock, contabilidade, etc.
  descricao: { type: String, required: true },
  
  // Detalhes adicionais
  detalhes: {
    antes: { type: mongoose.Schema.Types.Mixed },
    depois: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String }
  },
  
  // Status
  sucesso: { type: Boolean, default: true },
  mensagemErro: { type: String },
  
  createdAt: { type: Date, default: Date.now }
});

// Índices para consultas rápidas
logAtividadeSchema.index({ empresaId: 1, createdAt: -1 });
logAtividadeSchema.index({ usuarioId: 1, createdAt: -1 });
logAtividadeSchema.index({ modulo: 1, createdAt: -1 });
logAtividadeSchema.index({ acao: 1, createdAt: -1 });

module.exports = mongoose.model('LogAtividade', logAtividadeSchema);