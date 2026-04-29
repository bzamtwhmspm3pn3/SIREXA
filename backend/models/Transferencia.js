// backend/models/Transferencia.js
const mongoose = require('mongoose');

const TransferenciaSchema = new mongoose.Schema({
  designacao: { type: String, required: true },
  destinatario: { type: String, required: true },
  contaDebitar: { type: String, required: true },
  ibanDebitar: { type: String, required: true },
  valorDebitar: { type: Number, required: true },
  contaCreditar: { type: String, required: true },
  ibanCreditar: { type: String, required: true },
  valorCreditar: { type: Number, required: true },
  observacao: { type: String, default: '' },
  status: { type: String, enum: ['Concluída', 'Pendente', 'Cancelada'], default: 'Concluída' },
  tipo: { type: String, enum: ['Entrada', 'Saída'], default: 'Saída' },
  categoria: { type: String, enum: ['Operacional', 'Investimento', 'Financiamento'], default: 'Operacional' },
  subtipo: { type: String, default: '' },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  data: { type: Date, default: Date.now },
  referencia: { type: String, default: '' },
  destinoTipo: { type: String, enum: ['conta_interna', 'fornecedor', 'externo'], default: 'conta_interna' },
  destinoOriginal: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Transferencia', TransferenciaSchema);