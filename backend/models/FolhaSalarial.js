// models/FolhaSalarial.js
const mongoose = require('mongoose');

const AbonoDetalheSchema = new mongoose.Schema({
  valor: Number,
  data: Date,
  tipo: String
}, { _id: false });

const FuncionarioFolhaSchema = new mongoose.Schema({
  id: String,
  nome: String,
  cargo: String,
  departamento: String,
  salarioBase: Number,
  valorFaltas: Number,
  diasFaltas: Number,
  abonosAlimentacao: [AbonoDetalheSchema],
  totalAbonosAlimentacao: Number,
  abonosTransporte: [AbonoDetalheSchema],
  totalAbonosTransporte: Number,
  abonosFerias: [AbonoDetalheSchema],
  totalAbonosFerias: Number,
  abonosDecimoTerceiro: [AbonoDetalheSchema],
  totalAbonosDecimoTerceiro: Number,
  abonosBonus: [AbonoDetalheSchema],
  totalAbonosBonus: Number,
  abonosOutros: [AbonoDetalheSchema],
  totalAbonosOutros: Number,
  inssColaborador: Number,
  inssEmpregador: Number,
  irt: Number,
  salarioLiquido: Number,
  iban: String
}, { _id: false });

const FolhaSalarialSchema = new mongoose.Schema({
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  empresaNome: { type: String, required: true },
  empresaNif: { type: String },
  empresaGestor: { type: String, default: '' },
  mesReferencia: { type: Number, required: true },
  anoReferencia: { type: Number, required: true },
  funcionarios: [FuncionarioFolhaSchema],
  totais: {
    totalSalarios: Number,
    totalINSSColaborador: Number,
    totalINSSEmpregador: Number,
    totalIRT: Number,
    totalFaltas: Number,
    totalAbonosAlimentacao: Number,
    totalAbonosTransporte: Number,
    totalAbonosFerias: Number,
    totalAbonosDecimoTerceiro: Number,
    totalAbonosBonus: Number,
    totalAbonosOutros: Number,
    totalLiquido: Number
  },
  status: { type: String, enum: ['rascunho', 'finalizado'], default: 'rascunho' },
  processadoPor: String,
  dataProcessamento: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.FolhaSalarial || mongoose.model('FolhaSalarial', FolhaSalarialSchema);