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
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' }, // NOVO: referência ao cliente
  nifCliente: { type: String, required: true },
  enderecoCliente: { type: String, default: "" },
  paisCliente: { type: String, default: "AO" },
  tipoFactura: { type: String, enum: ["Venda", "Prestação de Serviço", "Mista"], default: "Venda" },
  itens: [{
    linha: Number,
    produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
    produtoOuServico: String,
    codigoProduto: String,
    quantidade: Number,
    precoUnitario: Number,
    desconto: Number,
    total: Number,
    taxaIVA: Number,
    iva: Number
  }],
  subtotal: { type: Number, required: true },
  totalIva: { type: Number, default: 0 },
  totalRetencao: { type: Number, default: 0 },
  desconto: { type: Number, default: 0 },
  total: { type: Number, required: true },
  formaPagamento: { type: String, required: true },
  detalhesPagamento: {
    iban: String,
    referenciaPOS: String,
    telefoneExpress: String,
    dataPagamento: Date
  },
  status: { type: String, enum: ["pendente", "finalizada", "cancelada"], default: "finalizada" },
  usuario: { type: String },
  hashDocumento: { type: String },
  data: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

VendaSchema.index({ empresaNif: 1, serie: 1, numeroFactura: 1 }, { unique: true });

module.exports = mongoose.models.Venda || mongoose.model('Venda', VendaSchema);