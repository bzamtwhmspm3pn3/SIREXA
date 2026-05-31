// backend/models/Licenca.js
const mongoose = require('mongoose');

const licencaSchema = new mongoose.Schema({
  chave: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true
  },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa' },
  empresaNome: { type: String },
  email: { type: String, required: true },
  
  // Planos - ATUALIZADO para aceitar os nomes dos planos
  plano: { 
    type: String, 
    enum: ['FREE', 'BÁSICO', 'PROFISSIONAL', 'EMPRESARIAL', 'PLATINUM', 'basico', 'profissional', 'empresarial', 'enterprise', 'trial'],
    default: 'trial'
  },
  
  // Módulos habilitados
  modulos: {
    stock: { type: Boolean, default: true },
    fornecedores: { type: Boolean, default: true },
    gestaoCompras: { type: Boolean, default: true },
    rh: { type: Boolean, default: false },
    contabilidade: { type: Boolean, default: false },
    financas: { type: Boolean, default: false },
    relatorios: { type: Boolean, default: true },
    dashboard: { type: Boolean, default: true },
    config: { type: Boolean, default: true },
    manutencoes: { type: Boolean, default: false },
    abastecimentos: { type: Boolean, default: false },
    viaturas: { type: Boolean, default: false }
  },
  
  // Limites
  limites: {
    maxUsuarios: { type: Number, default: 1 },
    maxFuncionarios: { type: Number, default: 5 },
    maxProdutos: { type: Number, default: 100 },
    maxFornecedores: { type: Number, default: 20 },
    maxClientes: { type: Number, default: 50 },
    espacoArmazenamento: { type: Number, default: 100 }
  },
  
  // Datas
  dataAtivacao: { type: Date, default: Date.now },
  dataExpiracao: { type: Date },
  ultimaRenovacao: { type: Date },
  
  // Status
  status: { 
    type: String, 
    enum: ['ativa', 'expirada', 'cancelada', 'suspensa', 'trial'],
    default: 'trial'
  },
  
  // Metadados
  ativadoPor: { type: String },
  ipAtivacao: { type: String },
  observacoes: { type: String }
}, { timestamps: true });

// Índices
licencaSchema.index({ chave: 1 });
licencaSchema.index({ empresaId: 1 });
licencaSchema.index({ status: 1, dataExpiracao: 1 });
licencaSchema.index({ email: 1 });

// Método para verificar se está expirada
licencaSchema.methods.isExpirada = function() {
  if (!this.dataExpiracao) return false;
  return new Date() > this.dataExpiracao;
};

// Método para obter dias restantes
licencaSchema.methods.diasRestantes = function() {
  if (!this.dataExpiracao) return null;
  const diff = this.dataExpiracao - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('Licenca', licencaSchema);