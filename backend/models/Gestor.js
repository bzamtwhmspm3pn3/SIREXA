// backend/models/Gestor.js
const mongoose = require('mongoose');

const GestorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senha: { type: String, required: true },
  telefone: { type: String, default: '' },
  empresas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Empresa' }],
  role: { type: String, default: 'gestor' },
  
  // 🔥 NOVOS CAMPOS PARA VALIDAÇÃO DE EMAIL
  ativo: { type: Boolean, default: false }, // ⚠️ MUDAR PARA false (inativo até confirmar email)
  tokenValidacao: { type: String }, // Token para confirmar email
  tokenValidacaoExpira: { type: Date }, // Expiração do token (24h)
  dataConfirmacaoEmail: { type: Date }, // Data que confirmou o email
  
  // 🔥 NOVOS CAMPOS PARA LICENÇA
  chaveAtivacao: { type: String }, // Chave usada no cadastro
  licencaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Licenca' },
  
  // 👤 PREFERÊNCIAS DO UTILIZADOR (tema, etc)
  prefs: {
    tema: { type: String, default: 'normal' },
    contraste: { type: String, default: 'normal' },
    tamanhoFonte: { type: String, default: 'normal' }
  },

  // 🔥 SEGURANÇA
  loginAttempts: { type: Number, default: 0 }, // Tentativas de login falhas
  lockUntil: { type: Date }, // Data até quando está bloqueado
  ultimoLogin: { type: Date }, // Último login bem-sucedido
  ultimoIP: { type: String }, // Último IP de acesso
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 🔥 ÍNDICES PARA MELHOR PERFORMANCE
GestorSchema.index({ email: 1 });
GestorSchema.index({ tokenValidacao: 1 });
GestorSchema.index({ licencaId: 1 });
GestorSchema.index({ ativo: 1 });

// 🔥 MÉTODO PARA VERIFICAR SE CONTA ESTÁ BLOQUEADA
GestorSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// 🔥 MÉTODO PARA REGISTRAR TENTATIVA DE LOGIN FALHA
GestorSchema.methods.incrementLoginAttempts = async function() {
  this.loginAttempts += 1;
  
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 30 * 60 * 1000; // Bloquear por 30 minutos
  }
  
  await this.save();
};

// 🔥 MÉTODO PARA RESETAR TENTATIVAS DE LOGIN
GestorSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = null;
  await this.save();
};

// 🔥 MÉTODO PARA VERIFICAR SE EMAIL ESTÁ CONFIRMADO
GestorSchema.methods.isEmailConfirmado = function() {
  return this.ativo === true;
};

// 🔥 MIDDLEWARE PARA ATUALIZAR updatedAt
GestorSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.Gestor || mongoose.model('Gestor', GestorSchema);