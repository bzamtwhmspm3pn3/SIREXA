const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TecnicoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  telefone: { type: String, required: true },
  cargo: { type: String, required: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  empresaNome: { type: String, required: true },
  // Módulos que o técnico tem acesso
  modulos: {
    operacional: { type: Boolean, default: false },
    recursosHumanos: { type: Boolean, default: false },
    gestaoPatrimonial: { type: Boolean, default: false },
    financeiro: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now }
});

// Hash da senha antes de salvar
TecnicoSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senha
TecnicoSchema.methods.compararSenha = async function(senha) {
  return await bcrypt.compare(senha, this.senha);
};

module.exports = mongoose.models.Tecnico || mongoose.model('Tecnico', TecnicoSchema);