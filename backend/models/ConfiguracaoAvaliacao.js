// backend/models/ConfiguracaoAvaliacao.js
const mongoose = require('mongoose');

const CriterioSchema = new mongoose.Schema({
  id: { type: String },
  nome: { type: String, default: '' },
  descricao: { type: String, default: '' },
  peso: { type: Number, default: 1 }
});

const CategoriaSchema = new mongoose.Schema({
  id: { type: String },
  nome: { type: String, default: '' },
  descricao: { type: String, default: '' },
  peso: { type: Number, default: 1 },
  criterios: [CriterioSchema]
});

const ConfiguracaoAvaliacaoSchema = new mongoose.Schema({
  empresaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Empresa', 
    required: true,
    unique: true
  },
  // Múltiplos métodos
  metodosSelecionados: {
    type: [{
      key: { type: String },
      nome: { type: String },
      descricao: { type: String }
    }],
    default: []
  },
  metodoPadrao: { type: String, default: '' },
  // Campos antigos (opcionais para compatibilidade)
  metodo: { type: String, default: '' },
  nomeMetodo: { type: String, default: '' },
  descricaoMetodo: { type: String, default: '' },
  categorias: {
    type: [CategoriaSchema],
    default: []
  },
  configuracao: {
    type: {
      escalas: {
        min: { type: Number, default: 1 },
        max: { type: Number, default: 5 },
        labels: { type: Map, of: String }
      },
      pesos: {
        avaliador: { type: Number, default: 1 },
        autoavaliacao: { type: Number, default: 0 },
        pares: { type: Number, default: 0 },
        subordinados: { type: Number, default: 0 },
        clientes: { type: Number, default: 0 }
      }
    },
    default: {
      escalas: { min: 1, max: 5 },
      pesos: { avaliador: 1, autoavaliacao: 0, pares: 0, subordinados: 0, clientes: 0 }
    }
  },
  ativo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Remover a validação de required dos campos antigos
ConfiguracaoAvaliacaoSchema.path('metodo').required(false);
ConfiguracaoAvaliacaoSchema.path('nomeMetodo').required(false);

module.exports = mongoose.model('ConfiguracaoAvaliacao', ConfiguracaoAvaliacaoSchema);