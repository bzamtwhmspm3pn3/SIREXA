// backend/models/Venda.js
const mongoose = require('mongoose');

const VendaSchema = new mongoose.Schema({
  empresaNif: { type: String, required: true, index: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  contaBancaria: { type: String, default: 'BAI01' },
  ibanBancario: { type: String },
  numeroFactura: { type: Number, required: true },
  serie: { type: String, default: "FT" },
  tipoDocumento: { type: String, default: "FT" },
  cliente: { type: String, required: true },
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  nifCliente: { type: String, required: true },
  enderecoCliente: { type: String, default: "" },
  paisCliente: { type: String, default: "AO" },
  tipoFactura: { type: String, enum: ["Venda", "Prestação de Serviço", "Mista"], default: "Venda" },
  itens: [{
    linha: Number,
    produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
    produtoOuServico: { type: String, required: true },
    codigoProduto: { type: String },
    quantidade: { type: Number, required: true, min: 1 },
    precoUnitario: { type: Number, required: true, min: 0 },
    desconto: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    taxaIVA: { type: Number, default: 14 },
    iva: { type: Number, default: 0 },
    tipo: { type: String, enum: ['produto', 'servico'], default: 'produto' }  // 🔧 NOVO CAMPO
  }],
  subtotal: { type: Number, required: true },
  totalIva: { type: Number, default: 0 },
  totalRetencao: { type: Number, default: 0 },
  taxaRetencao: { type: Number, default: 0 },
  incluiIVA: { type: Boolean, default: true },
  incluiRetencao: { type: Boolean, default: false },
  desconto: { type: Number, default: 0 },
  total: { type: Number, required: true },
  formaPagamento: { type: String, required: true },
  detalhesPagamento: {
    iban: String,
    referenciaPOS: String,
    telefoneExpress: String,
    dataPagamento: Date,
    metodo: String,
    conta: String
  },
  status: { type: String, enum: ["pendente", "finalizada", "cancelada"], default: "finalizada" },
  usuario: { type: String },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hashDocumento: { type: String },
  observacoes: { type: String },
  data: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

// Índices para performance
VendaSchema.index({ empresaNif: 1, serie: 1, numeroFactura: 1 }, { unique: true });
VendaSchema.index({ empresaId: 1, data: -1 });
VendaSchema.index({ clienteId: 1 });
VendaSchema.index({ status: 1 });

// Middleware para atualizar dataAtualizacao
VendaSchema.pre('save', function(next) {
  this.dataAtualizacao = new Date();
  next();
});

module.exports = mongoose.models.Venda || mongoose.model('Venda', VendaSchema);