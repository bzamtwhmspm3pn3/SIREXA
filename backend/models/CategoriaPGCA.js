// models/CategoriaPGCA.js
const mongoose = require('mongoose');

const CategoriaPGCASchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: ['Ativo', 'Passivo', 'Capital', 'Resultado', 'Custos', 'Receitas'],
    required: true 
  },
  classe: { type: String, required: true }, // 1 a 8
  grupo: { type: String }, // 2 dígitos
  subgrupo: { type: String }, // 3 dígitos
  nivel: { type: Number, default: 1 },
  paiId: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoriaPGCA' },
  descricao: { type: String },
  ativo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Índices
CategoriaPGCASchema.index({ codigo: 1 });
CategoriaPGCASchema.index({ tipo: 1 });
CategoriaPGCASchema.index({ classe: 1 });

module.exports = mongoose.models.CategoriaPGCA || mongoose.model('CategoriaPGCA', CategoriaPGCASchema);