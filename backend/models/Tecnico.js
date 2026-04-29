// backend/models/Tecnico.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TecnicoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  telefone: { type: String, default: '' },
  funcao: { type: String, default: 'Técnico' },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  empresaNome: { type: String, required: true },
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
  
  // ESTRUTURA COMPLETA DE MÓDULOS
  modulos: {
    // Operacional
    vendas: { type: Boolean, default: false },
    stock: { type: Boolean, default: false },
    facturacao: { type: Boolean, default: false },
    
    // Recursos Humanos
    funcionarios: { type: Boolean, default: false },
    folhaSalarial: { type: Boolean, default: false },
    gestaoFaltas: { type: Boolean, default: false },
    gestaoAbonos: { type: Boolean, default: false },
    avaliacao: { type: Boolean, default: false },
    
    // Gestão Patrimonial
    viaturas: { type: Boolean, default: false },
    abastecimentos: { type: Boolean, default: false },
    manutencoes: { type: Boolean, default: false },
    inventario: { type: Boolean, default: false },
    
    // Financeiro
    fornecedores: { type: Boolean, default: false },
    fluxoCaixa: { type: Boolean, default: false },
    contaCorrente: { type: Boolean, default: false },
    controloPagamento: { type: Boolean, default: false },
    custosReceitas: { type: Boolean, default: false },
    orcamentos: { type: Boolean, default: false },
    dre: { type: Boolean, default: false },
    indicadores: { type: Boolean, default: false },
    transferencias: { type: Boolean, default: false },
    reconciliacao: { type: Boolean, default: false },
    
    // Relatórios
    relatorios: { type: Boolean, default: false },
    graficos: { type: Boolean, default: false },
    analise: { type: Boolean, default: false }
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