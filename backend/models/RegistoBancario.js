// backend/models/RegistoBancario.js
const mongoose = require('mongoose');

const RegistoBancarioSchema = new mongoose.Schema({
  data: { type: Date, required: true },
  conta: { type: String, required: true },
  contaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Banco' },
  descricao: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: [
      'Receita - Venda', 
      'Receita - Serviço', 
      'Receita - Transferência',
      'Receita - Investimento',
      'Receita - Financiamento',
      'Receita - Outros',
      'Despesa - Fornecedor', 
      'Despesa - Salário', 
      'Despesa - Transferência',
      'Despesa - Investimento',
      'Despesa - Financiamento',
      'Despesa - Imposto',
      'Despesa - Manutenção',
      'Despesa - Abastecimento',
      'Despesa - Outros'
    ],
    default: 'Despesa - Outros'
  },
  valor: { type: Number, required: true },
  entradaSaida: { type: String, enum: ['entrada', 'saida'], required: true },
  ano: { type: Number, required: true },
  mes: { type: String, required: true },
  documentoReferencia: { type: String },
  observacao: { type: String },
  reconcilado: { type: Boolean, default: false },
  reconciladoCom: { type: String },
  tipoReconciliacao: { type: String },
  dataReconciliacao: { type: Date },
  dataRegisto: { type: Date, default: Date.now },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  arquivoOriginal: { type: String },
  linhaOriginal: { type: String }
});

module.exports = mongoose.model('RegistoBancario', RegistoBancarioSchema);