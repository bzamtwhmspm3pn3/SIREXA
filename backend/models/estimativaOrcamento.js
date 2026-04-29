const mongoose = require('mongoose');

const EstimativaOrcamentoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  ano: {
    type: Number,
    required: true
  },
  mes: {
    type: String,
    required: true
  },
  categoria: {
    type: String,
    required: true // Ex: Educação, Finanças, Agricultura, etc.
  },
  tipo: {
    type: String,
    enum: ['Receita', 'Custo'],
    required: true
  },
  valorEstimado: {
    type: Number,
    required: true
  },
  valorReal: {
    type: Number,
    default: 0
  },
  diferenca: {
    type: Number,
    default: 0 // Será calculado no frontend ou por script: valorEstimado - valorReal
  },
  observacoes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('EstimativaOrcamento', EstimativaOrcamentoSchema);