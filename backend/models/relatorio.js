// backend/models/relatorio.js
const mongoose = require('mongoose');

const RelatorioSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  subtitulo: { type: String },
  tipo: { type: String, required: true },
  modulo: { type: String, required: true }, // Empresa, Tecnico, Funcionarios, Financas, Vendas, Stock, RH, Patrimonial
  periodo: {
    mes: { type: Number, required: true },
    ano: { type: Number, required: true },
    nomeMes: { type: String },
    dataInicio: { type: Date },
    dataFim: { type: Date }
  },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  empresaInfo: {
    nome: { type: String },
    nif: { type: String },
    endereco: { type: String },
    telefone: { type: String },
    email: { type: String },
    logo: { type: String }
  },
  dados: { type: Object, required: true },
  resumoExecutivo: { type: String },
  analiseCritica: { type: String },
  recomendacoes: [{ type: String }],
  indicadoresChave: [{
    nome: { type: String },
    valor: { type: String },
    tendencia: { type: String, enum: ['positiva', 'negativa', 'estavel'] },
    meta: { type: String }
  }],
  anexos: [{
    nome: { type: String },
    tipo: { type: String },
    url: { type: String }
  }],
  usuario: { type: String },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  formato: { type: String, enum: ['PDF', 'Excel', 'JSON'], default: 'PDF' },
  downloads: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

RelatorioSchema.index({ empresaId: 1, modulo: 1, tipo: 1, createdAt: -1 });
RelatorioSchema.index({ empresaId: 1, 'periodo.ano': 1, 'periodo.mes': 1 });

module.exports = mongoose.model('Relatorio', RelatorioSchema);