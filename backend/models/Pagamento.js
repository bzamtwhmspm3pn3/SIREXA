// backend/models/Pagamento.js
const mongoose = require('mongoose');

const PagamentoSchema = new mongoose.Schema({
  referencia: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: ['Operacional', 'Fornecedor', 'Folha Salarial', 'Manutenção', 'Abastecimento', 
           'Investimento', 'Financiamento', 'Imposto', 'Infraestrutura', 'Tecnologia', 
           'Marketing', 'Educação', 'Saúde', 'Imobiliário', 'Veículos', 'Outro'],
    required: true 
  },
  categoria: { type: String, default: 'Operacional' },
  subtipo: { type: String, default: '' },
  origemId: { type: mongoose.Schema.Types.ObjectId },
  origemModel: { type: String },
  origemDescricao: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  empresaNome: { type: String },
  beneficiario: { type: String, required: true },
  beneficiarioDocumento: { type: String },
  valor: { type: Number, required: true, min: 0 },
  valorBruto: { type: Number, default: 0 },
  valorRetencao: { type: Number, default: 0 },
  taxaRetencao: { type: Number, default: 0 },
  valorPago: { type: Number, default: 0 },
  saldo: { type: Number, default: 0 },
  dataVencimento: { type: Date, required: true },
  dataPagamento: { type: Date },
  dataAprovacao: { type: Date },
  dataCancelamento: { type: Date },
  status: { 
    type: String, 
    enum: ['Pendente', 'Pago', 'Atrasado', 'Parcial', 'Cancelado', 'Aguardando Aprovação', 'Recusado'],
    default: 'Pendente'
  },
  motivoStatus: { type: String },
  aprovadoPor: { type: String },
  liquidezDisponivel: { type: Number, default: 0 },
  notaInformativa: { type: String },
  descricao: { type: String, default: '' },
  observacao: { type: String, default: '' },
  referenciaBancaria: { type: String },
  comprovativo: { type: String },
  formaPagamento: { 
    type: String, 
    enum: ['Transferência Bancária', 'Dinheiro', 'Cheque', 'POS/Débito', 'Multicaixa Express', 
           'Depósito Bancário', 'PayPal', 'Transferência Internacional', 'Letra de Câmbio', 'Financiamento'],
    default: 'Transferência Bancária'
  },
  
  // CONTA BANCÁRIA PARA DÉBITO (origem do pagamento)
  contaDebito: { type: String, required: true },
  contaDebitoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Banco' },
  ibanDebito: { type: String },
  
  // Campos específicos para Financiamento
  parcelas: { type: Number, default: 1 },
  parcelaAtual: { type: Number, default: 1 },
  juros: { type: Number, default: 0 },
  taxaJuros: { type: Number, default: 0 },
  garantia: { type: String, default: '' },
  
  // Campos específicos para Investimento
  contrato: { type: String, default: '' },
  projeto: { type: String, default: '' },
  
  // Campos de controle
  criadoPor: { type: String },
  atualizadoPor: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// 🔥 ÍNDICE COMPOSTO: empresaId + referencia (único por empresa)
PagamentoSchema.index({ empresaId: 1, referencia: 1 }, { unique: true });

// Índices simples para consultas
PagamentoSchema.index({ status: 1 });
PagamentoSchema.index({ dataVencimento: 1 });
PagamentoSchema.index({ tipo: 1 });
PagamentoSchema.index({ categoria: 1 });
PagamentoSchema.index({ contaDebito: 1 });

module.exports = mongoose.models.Pagamento || mongoose.model('Pagamento', PagamentoSchema);