const mongoose = require('mongoose');

const FacturaSchema = new mongoose.Schema({
  // Identificação
  numeroDocumento: { type: Number }, // Para orçamentos e notas de crédito
  numeroFactura: { type: Number }, // Para facturas
  serie: { type: String, default: "FT" },
  tipo: { 
    type: String, 
    enum: ["Orcamento", "Factura Proforma", "Factura", "Factura Recibo", "Recibo", "Nota Credito", "Nota Debito"],
    default: "Factura"
  },
  
  // Empresa
  empresaNif: { type: String, required: true, index: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  
  // Cliente
  cliente: { type: String, required: true },
  nifCliente: { type: String, required: true },
  enderecoCliente: { type: String, default: "" },
  emailCliente: { type: String, default: "" },
  telefoneCliente: { type: String, default: "" },
  
  // Dados do documento
  dataEmissao: { type: Date, default: Date.now },
  dataVencimento: { type: Date },
  tipoActividade: { type: String, enum: ["Venda", "Prestação de Serviço", "Mista"], default: "Venda" },
  
  // Itens
  itens: [{
    linha: Number,
    produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
    produtoOuServico: String,
    codigoProduto: String,
    quantidade: Number,
    precoUnitario: Number,
    desconto: { type: Number, default: 0 },
    total: Number,
    taxaIVA: { type: Number, default: 14 },
    iva: Number
  }],
  
  // Totais
  subtotal: { type: Number, required: true },
  totalIva: { type: Number, default: 0 },
  totalRetencao: { type: Number, default: 0 },
  desconto: { type: Number, default: 0 },
  total: { type: Number, required: true },
  
  // Pagamento
  formaPagamento: { 
  type: String, 
  enum: ["Dinheiro", "Transferência", "Transferência Bancária", "Cartão", "Cartão Crédito", "Cartão Débito", "POS", "Multicaixa Express", "Cheque", "A definir", "Estorno"], 
  default: "A definir" 
},
  detalhesPagamento: {
    iban: String,
    referenciaPOS: String,
    telefoneExpress: String,
    dataPagamento: Date,
    banco: String,
    cheque: String
  },
  
  // Status
  status: { 
    type: String, 
    enum: ["rascunho", "emitido","emitida", "aprovado", "convertido", "pago", "cancelado", "estornado"],
    default: "rascunho"
  },
  dataPagamento: { type: Date },
  valorPago: { type: Number, default: 0 },
  troco: { type: Number, default: 0 },
  
  // Controlo
  usuario: { type: String },
  hashDocumento: { type: String },
  observacoes: { type: String },
  
  // Documento original (para conversões)
  documentoOriginalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Factura' },
  notaCreditoOriginalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Factura' },
  
  // Controlo de impressão
  segundaVia: { type: Boolean, default: false },
  motivoSegundaVia: { type: String },
  impressoes: { type: Number, default: 1 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índices
FacturaSchema.index({ empresaNif: 1, serie: 1, numeroFactura: 1 }, { unique: true, sparse: true });
FacturaSchema.index({ empresaNif: 1, tipo: 1, numeroDocumento: 1 }, { unique: true, sparse: true });
FacturaSchema.index({ cliente: 1 });
FacturaSchema.index({ nifCliente: 1 });
FacturaSchema.index({ dataEmissao: -1 });
FacturaSchema.index({ status: 1 });
FacturaSchema.index({ tipo: 1 });

module.exports = mongoose.models.Factura || mongoose.model('Factura', FacturaSchema);