// backend/models/Venda.js
const mongoose = require('mongoose');

const ParcelaSchema = new mongoose.Schema({
  numero: { type: Number, required: true },
  valor: { type: Number, required: true },
  dataVencimento: { type: Date, required: true },
  dataPagamento: { type: Date },
  valorPago: { type: Number, default: 0 },
  status: { type: String, enum: ['pendente', 'pago', 'atrasado', 'cancelado'], default: 'pendente' },
  juros: { type: Number, default: 0 },
  multa: { type: Number, default: 0 },
  formaPagamento: { type: String, default: 'Dinheiro' },
  contaBancaria: { type: String },
  usuario: { type: String },
  observacoes: { type: String }
});

const AgendamentoServicoSchema = new mongoose.Schema({
  dataInicio: { type: Date, required: true },
  dataFim: { type: Date },
  duracaoEstimada: { type: String },
  tecnicoResponsavel: { type: String },
  enderecoServico: { type: String },
  observacoes: { type: String },
  status: { type: String, enum: ['agendado', 'em_andamento', 'concluido', 'cancelado'], default: 'agendado' }
});

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
  emailCliente: { type: String, default: "" },
  telefoneCliente: { type: String, default: "" },
  paisCliente: { type: String, default: "AO" },
  tipoFactura: { type: String, enum: ["Venda", "Prestação de Serviço", "Mista"], default: "Venda" },
  
  // ============================================
  // TIPO DE VENDA (À VISTA / A PRAZO)
  // ============================================
  tipoVenda: { type: String, enum: ['avista', 'prazo'], default: 'avista' },
  
  // Dados para venda a prazo
  entrada: { type: Number, default: 0 },
  jurosMensal: { type: Number, default: 0 },
  dataPrimeiraParcela: { type: Date },
  parcelas: [ParcelaSchema],
  valorParcelasRestante: { type: Number, default: 0 },
  
  itens: [{
    linha: Number,
    produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
    produtoOuServico: { type: String, required: true },
    codigoProduto: { type: String },
    codigoBarras: { type: String },
    quantidade: { type: Number, required: true, min: 1 },
    precoUnitario: { type: Number, required: true, min: 0 },
    desconto: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    taxaIVA: { type: Number, default: 14 },
    iva: { type: Number, default: 0 },
    tipo: { type: String, enum: ['produto', 'servico'], default: 'produto' },
    // Dados para serviços agendados
    agendamento: AgendamentoServicoSchema
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
    conta: String,
    valorPago: { type: Number, default: 0 },
    troco: { type: Number, default: 0 }
  },
  
  status: { type: String, enum: ["pendente", "finalizada", "cancelada", "parcialmente_paga"], default: "finalizada" },
  usuario: { type: String },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hashDocumento: { type: String },
  observacoes: { type: String },
  contabilizado: { type: Boolean, default: false },
  data: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

// Índices para performance
VendaSchema.index({ empresaNif: 1, serie: 1, numeroFactura: 1 }, { unique: true });
VendaSchema.index({ empresaId: 1, data: -1 });
VendaSchema.index({ clienteId: 1 });
VendaSchema.index({ status: 1 });
VendaSchema.index({ tipoVenda: 1 });
VendaSchema.index({ 'parcelas.status': 1 });
VendaSchema.index({ 'parcelas.dataVencimento': 1 });

// Middleware para atualizar dataAtualizacao
VendaSchema.pre('save', function(next) {
  this.dataAtualizacao = new Date();
  
  // Calcular valor restante das parcelas
  if (this.tipoVenda === 'prazo' && this.parcelas && this.parcelas.length > 0) {
    const parcelasPendentes = this.parcelas.filter(p => p.status === 'pendente');
    this.valorParcelasRestante = parcelasPendentes.reduce((sum, p) => sum + (p.valor - (p.valorPago || 0)), 0);
    
    // Verificar se todas parcelas foram pagas
    const todasPagas = this.parcelas.every(p => p.status === 'pago');
    if (todasPagas && this.status !== 'finalizada') {
      this.status = 'finalizada';
    } else if (!todasPagas && this.parcelas.some(p => p.status === 'pago') && this.status !== 'parcialmente_paga') {
      this.status = 'parcialmente_paga';
    }
  }
  
  next();
});

// Método para verificar se a venda está totalmente paga
VendaSchema.methods.isTotalmentePaga = function() {
  if (this.tipoVenda === 'avista') {
    return this.status === 'finalizada';
  }
  
  if (!this.parcelas || this.parcelas.length === 0) {
    return this.status === 'finalizada';
  }
  
  return this.parcelas.every(p => p.status === 'pago');
};

// Método para obter o valor total pendente
VendaSchema.methods.getValorPendente = function() {
  if (this.tipoVenda === 'avista') {
    return this.status === 'finalizada' ? 0 : this.total;
  }
  
  if (!this.parcelas || this.parcelas.length === 0) {
    return this.status === 'finalizada' ? 0 : this.total;
  }
  
  return this.parcelas
    .filter(p => p.status === 'pendente')
    .reduce((sum, p) => sum + (p.valor - (p.valorPago || 0)), 0);
};

// Método para obter a próxima parcela a vencer
VendaSchema.methods.getProximaParcela = function() {
  if (this.tipoVenda !== 'prazo' || !this.parcelas) return null;
  
  const hoje = new Date();
  return this.parcelas
    .filter(p => p.status === 'pendente')
    .sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento))[0];
};

// Método para verificar parcelas atrasadas
VendaSchema.methods.verificarParcelasAtrasadas = function() {
  if (this.tipoVenda !== 'prazo' || !this.parcelas) return [];
  
  const hoje = new Date();
  const parcelasAtrasadas = this.parcelas.filter(p => {
    if (p.status !== 'pendente') return false;
    return new Date(p.dataVencimento) < hoje;
  });
  
  // Atualizar status das parcelas atrasadas
  parcelasAtrasadas.forEach(parcela => {
    parcela.status = 'atrasado';
  });
  
  return parcelasAtrasadas;
};

// Método para registrar pagamento de parcela
VendaSchema.methods.registrarPagamentoParcela = async function(parcelaNumero, valorPago, formaPagamento, contaBancaria, usuario) {
  const parcela = this.parcelas.find(p => p.numero === parcelaNumero);
  
  if (!parcela) {
    throw new Error(`Parcela ${parcelaNumero} não encontrada`);
  }
  
  if (parcela.status === 'pago') {
    throw new Error(`Parcela ${parcelaNumero} já foi paga`);
  }
  
  const valorParcela = parcela.valor - (parcela.valorPago || 0);
  
  if (valorPago < valorParcela) {
    throw new Error(`Valor insuficiente para pagar a parcela. Valor devido: ${valorParcela}`);
  }
  
  parcela.valorPago = (parcela.valorPago || 0) + valorPago;
  parcela.dataPagamento = new Date();
  parcela.formaPagamento = formaPagamento || parcela.formaPagamento;
  parcela.contaBancaria = contaBancaria || parcela.contaBancaria;
  parcela.usuario = usuario;
  parcela.status = parcela.valorPago >= parcela.valor ? 'pago' : 'pendente';
  
  this.dataAtualizacao = new Date();
  await this.save();
  
  return parcela;
};

// Método para obter resumo de pagamentos
VendaSchema.methods.getResumoPagamentos = function() {
  if (this.tipoVenda === 'avista') {
    return {
      total: this.total,
      pago: this.status === 'finalizada' ? this.total : 0,
      pendente: this.status === 'finalizada' ? 0 : this.total,
      percentual: this.status === 'finalizada' ? 100 : 0
    };
  }
  
  const totalPago = this.parcelas.reduce((sum, p) => sum + (p.valorPago || 0), 0);
  const totalDevido = this.parcelas.reduce((sum, p) => sum + p.valor, 0);
  
  return {
    total: this.total,
    entrada: this.entrada || 0,
    totalParcelas: totalDevido,
    pago: totalPago + (this.entrada || 0),
    pendente: this.total - (totalPago + (this.entrada || 0)),
    percentual: ((totalPago + (this.entrada || 0)) / this.total * 100).toFixed(2)
  };
};

// Método estático para buscar vendas com parcelas atrasadas
VendaSchema.statics.findVendasComParcelasAtrasadas = function(empresaId) {
  const hoje = new Date();
  return this.find({
    empresaId,
    tipoVenda: 'prazo',
    status: { $in: ['parcialmente_paga', 'pendente'] },
    'parcelas.status': 'pendente',
    'parcelas.dataVencimento': { $lt: hoje }
  });
};

module.exports = mongoose.models.Venda || mongoose.model('Venda', VendaSchema);