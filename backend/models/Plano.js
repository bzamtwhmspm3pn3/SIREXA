// backend/models/Plano.js
const mongoose = require('mongoose');

const planoSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  descricao: { type: String, default: '' },
  preco: { type: Number, default: 0 },
  duracaoDias: { type: Number, default: 365 },
  ordem: { type: Number, default: 0 },
  
  limites: {
    maxEmpresas: { type: Number, default: 1 },
    maxUsuarios: { type: Number, default: 1 },
    maxFuncionarios: { type: Number, default: 5 },
    maxProdutos: { type: Number, default: 100 },
    maxFornecedores: { type: Number, default: 20 },
    maxClientes: { type: Number, default: 50 },
    espacoArmazenamento: { type: Number, default: 100 }
  },
  
  modulos: {
    stock: { type: Boolean, default: true },
    fornecedores: { type: Boolean, default: true },
    gestaoCompras: { type: Boolean, default: true },
    vendas: { type: Boolean, default: false },
    rh: { type: Boolean, default: false },
    contabilidade: { type: Boolean, default: false },
    financas: { type: Boolean, default: false },
    relatorios: { type: Boolean, default: true },
    dashboard: { type: Boolean, default: true },
    config: { type: Boolean, default: true }
  },
  
  ativo: { type: Boolean, default: true }
}, { 
  timestamps: true,
  collection: 'planos' // FORÇA O NOME DA COLEÇÃO
});

// Garantir que não há modelo registrado antes
module.exports = mongoose.models.Plano || mongoose.model('Plano', planoSchema);