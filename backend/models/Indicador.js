const mongoose = require('mongoose');

const IndicadorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  valor: { type: Number, required: true },
  tipo: { type: String, enum: ['financeiro', 'operacional', 'mercado'] },
  periodo: { type: String },
  mes: { type: Number },
  ano: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Indicador', IndicadorSchema);