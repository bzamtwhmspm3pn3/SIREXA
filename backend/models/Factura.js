const mongoose = require('mongoose');

// Schema para Agendamento de Serviços
const AgendamentoServicoSchema = new mongoose.Schema({
  dataInicio: { type: Date },
  dataFim: { type: Date },
  duracaoEstimada: { type: String },
  tecnicoResponsavel: { type: String },
  enderecoServico: { type: String },
  observacoes: { type: String },
  status: { 
    type: String, 
    enum: ['agendado', 'em_andamento', 'concluido', 'cancelado', 'adiado'],
    default: 'agendado' 
  },
  contatoEmergencia: { type: String },
  materiaisUtilizados: [{ 
    nome: String,
    quantidade: Number,
    custo: Number
  }]
});

// Schema para Item da Factura (melhorado)
const ItemFacturaSchema = new mongoose.Schema({
  linha: { type: Number },
  produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
  produtoOuServico: { type: String, required: true },
  codigoProduto: { type: String },
  codigoBarras: { type: String },
  quantidade: { type: Number, required: true, min: 1, default: 1 },
  precoUnitario: { type: Number, required: true, min: 0 },
  desconto: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  taxaIVA: { type: Number, default: 14, min: 0, max: 100 },
  iva: { type: Number, default: 0 },
  tipo: { type: String, enum: ['produto', 'servico'], default: 'produto' },
  // Agendamento para serviços
  agendamento: AgendamentoServicoSchema,
  // Dados adicionais
  unidade: { type: String, default: 'un' },
  peso: { type: Number, default: 0 },
  observacoesItem: { type: String }
});

// Schema para Detalhes de Pagamento (melhorado)
const DetalhesPagamentoSchema = new mongoose.Schema({
  iban: { type: String },
  banco: { type: String },
  contaBancaria: { type: String },
  referenciaPOS: { type: String },
  telefoneExpress: { type: String },
  dataPagamento: { type: Date, default: Date.now },
  cheque: { type: String },
  bancoCheque: { type: String },
  dataCompensacao: { type: Date },
  confirmacaoPagamento: { type: String },
  valorPago: { type: Number, default: 0 },
  troco: { type: Number, default: 0 },
  parcelas: { type: Number, default: 1 },
  observacoesPagamento: { type: String }
});

// Schema para Parcelas (vendas a prazo)
const ParcelaSchema = new mongoose.Schema({
  numero: { type: Number, required: true },
  valor: { type: Number, required: true },
  dataVencimento: { type: Date, required: true },
  dataPagamento: { type: Date },
  valorPago: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pendente', 'pago', 'atrasado', 'cancelado'],
    default: 'pendente' 
  },
  juros: { type: Number, default: 0 },
  multa: { type: Number, default: 0 },
  formaPagamento: { type: String },
  contaBancaria: { type: String },
  usuario: { type: String },
  observacoes: { type: String }
});

const FacturaSchema = new mongoose.Schema({
  // ============================================
  // IDENTIFICAÇÃO
  // ============================================
  numeroDocumento: { type: Number }, // Para orçamentos e notas de crédito
  numeroFactura: { type: Number }, // Para facturas
  serie: { type: String, default: "FT" },
  tipo: { 
    type: String, 
    enum: ["Orcamento", "Factura Proforma", "Factura", "Factura Recibo", "Recibo", "Nota Credito", "Nota Debito", "Factura-Simplificada"],
    default: "Factura"
  },
  tipoVenda: { type: String, enum: ['avista', 'prazo'], default: 'avista' },
  
  // ============================================
  // EMPRESA
  // ============================================
  empresaNif: { type: String, required: true, index: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  contaBancaria: { type: String, default: '' },
  ibanBancario: { type: String, default: '' },
  
  // ============================================
  // CLIENTE
  // ============================================
  cliente: { type: String, required: true },
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  nifCliente: { type: String, required: true },
  enderecoCliente: { type: String, default: "" },
  emailCliente: { type: String, default: "" },
  telefoneCliente: { type: String, default: "" },
  cidadeCliente: { type: String, default: "" },
  paisCliente: { type: String, default: "AO" },
  
  // ============================================
  // DATAS
  // ============================================
  dataEmissao: { type: Date, default: Date.now },
  dataVencimento: { type: Date },
  dataCancelamento: { type: Date },
  motivoCancelamento: { type: String },
  
  // ============================================
  // TIPO DE ACTIVIDADE
  // ============================================
  tipoActividade: { 
    type: String, 
    enum: ["Venda", "Prestação de Serviço", "Mista", "Consultoria", "Manutenção", "Instalação"],
    default: "Venda" 
  },
  
  // ============================================
  // ITENS
  // ============================================
  itens: [ItemFacturaSchema],
  
  // ============================================
  // TOTAIS
  // ============================================
  subtotal: { type: Number, required: true, default: 0 },
  totalIva: { type: Number, default: 0 },
  totalRetencao: { type: Number, default: 0 },
  taxaRetencao: { type: Number, default: 0 },
  incluiIVA: { type: Boolean, default: true },
  incluiRetencao: { type: Boolean, default: false },
  desconto: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },
  
  // ============================================
  // VENDAS A PRAZO
  // ============================================
  entrada: { type: Number, default: 0 },
  numeroParcelas: { type: Number, default: 1 },
  jurosMensal: { type: Number, default: 0 },
  parcelas: [ParcelaSchema],
  valorParcelasRestante: { type: Number, default: 0 },
  
  // ============================================
  // PAGAMENTO
  // ============================================
  formaPagamento: { 
    type: String, 
    enum: ["Dinheiro", "Transferência", "Transferência Bancária", "Cartão", "Cartão Crédito", "Cartão Débito", "POS", "Multicaixa Express", "Cheque", "A definir", "Estorno", "Depósito Bancário"], 
    default: "A definir" 
  },
  detalhesPagamento: DetalhesPagamentoSchema,
  
  // ============================================
  // STATUS E CONTROLOS
  // ============================================
  status: { 
    type: String, 
    enum: ["rascunho", "emitido", "emitida", "aprovado", "convertido", "pago", "parcialmente_pago", "cancelado", "estornado", "vencido"],
    default: "rascunho"
  },
  usuario: { type: String },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hashDocumento: { type: String },

  // ============================================
  // CAMPOS AGT (Administração Geral Tributária)
  // ============================================
  atcud: { type: String },
  hash: { type: String },
  hashAnterior: { type: String },
  codigoValidacao: { type: String },
  numeroDocumentoEletronico: { type: String },

  observacoes: { type: String },
  
  // ============================================
  // REFERÊNCIAS ENTRE DOCUMENTOS
  // ============================================
  documentoOriginalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Factura' },
  notaCreditoOriginalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Factura' },
  vendaOriginalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venda' },
  
  // ============================================
  // CONTROLOS DE IMPRESSÃO
  // ============================================
  segundaVia: { type: Boolean, default: false },
  motivoSegundaVia: { type: String },
  impressoes: { type: Number, default: 1 },
  ultimaImpressao: { type: Date },
  
  // ============================================
  // NOTA DE CRÉDITO
  // ============================================
  motivoNotaCredito: { type: String },
  documentosEstornados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Factura' }],
  
  // ============================================
  // TIMESTAMPS
  // ============================================
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============================================
// ÍNDICES OTIMIZADOS - CORRIGIDOS (SEM ERRO DE DUPLICAÇÃO)
// ============================================

// 🔥 Índice para facturas (numeroFactura) - IGNORA NULL
FacturaSchema.index(
  { empresaNif: 1, serie: 1, numeroFactura: 1 }, 
  { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { numeroFactura: { $exists: true, $ne: null } }
  }
);

// 🔥 ÍNDICE REMOVIDO - CAUSAVA DUPLICATE KEY ERROR
// Este índice foi removido porque causava conflito com numeroDocumento: null
// Para documentos que usam numeroDocumento (Orcamento, Recibo, NotaCredito), 
// o índice não é necessário pois a unicidade é garantida pelo _id
// FacturaSchema.index({ empresaNif: 1, tipo: 1, numeroDocumento: 1 }, { unique: true, sparse: true });

// Índices simples (sem unique - nunca causam erro)
FacturaSchema.index({ empresaId: 1, dataEmissao: -1 });
FacturaSchema.index({ cliente: 1 });
FacturaSchema.index({ clienteId: 1 });
FacturaSchema.index({ nifCliente: 1 });
FacturaSchema.index({ status: 1 });
FacturaSchema.index({ tipo: 1 });
FacturaSchema.index({ tipoVenda: 1 });
FacturaSchema.index({ 'itens.tipo': 1 });
FacturaSchema.index({ 'itens.agendamento.status': 1 });
FacturaSchema.index({ 'parcelas.status': 1 });
FacturaSchema.index({ 'parcelas.dataVencimento': 1 });

// ============================================
// MIDDLEWARE PRE-SAVE
// ============================================
FacturaSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calcular totais se necessário
  if (this.itens && this.itens.length > 0) {
    this.subtotal = this.itens.reduce((sum, item) => sum + (item.total || 0), 0);
    
    if (this.incluiIVA) {
      // recalcular IVA para facturas criadas directamente (sem emitirVenda)
      if (!this.totalIva || this.totalIva === 0) {
        this.totalIva = this.itens.reduce((acc, item) => {
          return acc + (item.total || 0) * ((item.taxaIVA || 14) / 100);
        }, 0);
      }
    } else {
      this.totalIva = 0;
    }
    
    // Calcular total
    this.total = (this.subtotal - (this.desconto || 0)) + (this.totalIva || 0) - (this.totalRetencao || 0);
  }
  
  // Atualizar status baseado em parcelas
  if (this.parcelas && this.parcelas.length > 0 && this.tipoVenda === 'prazo') {
    const todasPagas = this.parcelas.every(p => p.status === 'pago');
    const algumaPaga = this.parcelas.some(p => p.status === 'pago');
    
    if (todasPagas && this.status !== 'pago') {
      this.status = 'pago';
    } else if (algumaPaga && this.status !== 'parcialmente_pago') {
      this.status = 'parcialmente_pago';
    }
  }
  
  next();
});

// ============================================
// MÉTODOS DA FACTURA
// ============================================

// Verificar se é serviço ou produto
FacturaSchema.methods.temServicos = function() {
  return this.itens.some(item => item.tipo === 'servico');
};

FacturaSchema.methods.temProdutos = function() {
  return this.itens.some(item => item.tipo === 'produto');
};

// Obter serviços agendados
FacturaSchema.methods.getServicosAgendados = function() {
  return this.itens.filter(item => item.tipo === 'servico' && item.agendamento);
};

// Obter serviços pendentes
FacturaSchema.methods.getServicosPendentes = function() {
  return this.itens.filter(item => 
    item.tipo === 'servico' && 
    item.agendamento && 
    ['agendado', 'em_andamento'].includes(item.agendamento.status)
  );
};

// Obter resumo de pagamento
FacturaSchema.methods.getResumoPagamento = function() {
  const totalPago = this.detalhesPagamento?.valorPago || 0;
  const saldo = this.total - totalPago;
  
  return {
    total: this.total,
    pago: totalPago,
    saldo: saldo > 0 ? saldo : 0,
    percentualPago: (totalPago / this.total * 100).toFixed(2),
    status: saldo <= 0 ? 'liquidado' : (totalPago > 0 ? 'parcial' : 'pendente')
  };
};

// Método estático para buscar facturas por tipo de item
FacturaSchema.statics.findByTipoItem = function(empresaId, tipoItem, query = {}) {
  const filtro = { empresaId, ...query };
  if (tipoItem === 'servico') {
    filtro['itens.tipo'] = 'servico';
  } else if (tipoItem === 'produto') {
    filtro['itens.tipo'] = 'produto';
  }
  return this.find(filtro);
};

// Método estático para buscar serviços agendados
FacturaSchema.statics.findServicosAgendados = function(empresaId, dataInicio = null, dataFim = null) {
  const filtro = { 
    empresaId, 
    'itens.tipo': 'servico',
    'itens.agendamento': { $exists: true }
  };
  
  if (dataInicio && dataFim) {
    filtro['itens.agendamento.dataInicio'] = {
      $gte: new Date(dataInicio),
      $lte: new Date(dataFim)
    };
  }
  
  return this.find(filtro);
};

// Método estático para buscar facturas com parcelas pendentes
FacturaSchema.statics.findParcelasPendentes = function(empresaId) {
  return this.find({
    empresaId,
    tipoVenda: 'prazo',
    'parcelas.status': 'pendente'
  });
};

// Método estático para gerar próximo número
FacturaSchema.statics.getProximoNumero = async function(empresaId, serie = "FT") {
  const ultimaFactura = await this.findOne({ empresaId, serie })
    .sort({ numeroFactura: -1 });
  return ultimaFactura ? ultimaFactura.numeroFactura + 1 : 1;
};

// Método estático para gerar próximo número de documento
FacturaSchema.statics.getProximoNumeroDocumento = async function(empresaId, tipo) {
  const ultimoDocumento = await this.findOne({ empresaId, tipo })
    .sort({ numeroDocumento: -1 });
  return ultimoDocumento ? ultimoDocumento.numeroDocumento + 1 : 1;
};

// ============================================
// VIRTUAIS
// ============================================

FacturaSchema.virtual('numeroFormatado').get(function() {
  if (this.tipo === 'Factura' || this.tipo === 'Factura Proforma') {
    return `${this.serie} ${this.numeroFactura}`;
  }
  if (this.tipo === 'Orcamento') {
    return `ORC ${this.numeroDocumento}`;
  }
  if (this.tipo === 'Recibo') {
    return `RC ${this.numeroDocumento || this.numeroFactura}`;
  }
  if (this.tipo === 'Nota Credito') {
    return `NC ${this.numeroDocumento || this.numeroFactura}`;
  }
  return `${this.tipo} ${this.numeroDocumento || this.numeroFactura}`;
});

FacturaSchema.virtual('totalServicos').get(function() {
  return this.itens
    .filter(item => item.tipo === 'servico')
    .reduce((sum, item) => sum + (item.total || 0), 0);
});

FacturaSchema.virtual('totalProdutos').get(function() {
  return this.itens
    .filter(item => item.tipo === 'produto')
    .reduce((sum, item) => sum + (item.total || 0), 0);
});

FacturaSchema.virtual('isTotalmentePaga').get(function() {
  if (this.tipoVenda === 'avista') {
    return this.status === 'pago';
  }
  return this.parcelas?.every(p => p.status === 'pago') || false;
});

FacturaSchema.virtual('valorPendente').get(function() {
  if (this.tipoVenda === 'avista') {
    return this.status === 'pago' ? 0 : this.total - (this.detalhesPagamento?.valorPago || 0);
  }
  return this.parcelas?.reduce((sum, p) => {
    if (p.status === 'pendente') return sum + (p.valor - (p.valorPago || 0));
    return sum;
  }, 0) || 0;
});

// Garantir que os virtuais sejam incluídos no JSON
FacturaSchema.set('toJSON', { virtuals: true });
FacturaSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.Factura || mongoose.model('Factura', FacturaSchema);