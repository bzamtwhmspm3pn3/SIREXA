const mongoose = require('mongoose');

const AvencaAdiantamentoSchema = new mongoose.Schema({
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String, required: true },
  funcionarioNif: { type: String },
  departamento: { type: String },
  cargo: { type: String },
  salarioBase: { type: Number },

  tipo: {
    type: String,
    enum: ['AdiantamentoSalarial', 'Avenca'],
    required: true
  },
  valor: { type: Number, required: true },
  valorPago: { type: Number, default: 0 },
  saldoRestante: { type: Number, default: 0 },

  dataSolicitacao: { type: Date, default: Date.now },
  dataAprovacao: { type: Date },
  dataVencimento: { type: Date },
  dataConclusao: { type: Date },

  numeroParcelas: { type: Number, default: 1 },
  parcelaAtual: { type: Number, default: 0 },
  valorParcela: { type: Number, default: 0 },
  periodicidade: { type: String, enum: ['Unico', 'Mensal', 'Semanal', 'Personalizado'], default: 'Unico' },

  motivo: { type: String },
  descricao: { type: String },

  status: {
    type: String,
    enum: ['Pendente', 'Aprovado', 'EmPagamento', 'Pago', 'Cancelado'],
    default: 'Pendente'
  },

  integradoFolha: { type: Boolean, default: false },
  folhaId: { type: mongoose.Schema.Types.ObjectId, ref: 'FolhaSalarial' },
  mesReferencia: { type: Number },
  anoReferencia: { type: Number },

  criadoPor: { type: String },
  criadoPorId: { type: mongoose.Schema.Types.ObjectId },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

AvencaAdiantamentoSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.valorPago !== undefined) {
    this.saldoRestante = this.valor - this.valorPago;
  }
  next();
});

AvencaAdiantamentoSchema.index({ funcionarioId: 1, status: 1 });
AvencaAdiantamentoSchema.index({ empresaId: 1, tipo: 1, status: 1 });

module.exports = mongoose.models.AvencaAdiantamento || mongoose.model('AvencaAdiantamento', AvencaAdiantamentoSchema);
