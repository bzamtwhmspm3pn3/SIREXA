// backend/models/RegistoBancario.js
const mongoose = require('mongoose');

const RegistoBancarioSchema = new mongoose.Schema({
  // ============================================
  // DADOS BÁSICOS
  // ============================================
  data: { type: Date, required: true },
  conta: { type: String, required: true },
  contaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Banco' },
  descricao: { type: String, required: true },
  
  // ============================================
  // TIPO DE REGISTO (AMPLIADO)
  // ============================================
  tipo: { 
    type: String, 
    enum: [
      'Receita - Venda', 
      'Receita - Serviço', 
      'Receita - Transferência',
      'Receita - Investimento',
      'Receita - Financiamento',
      'Receita - Parcela',
      'Receita - Juros',
      'Receita - Outros',
      'Despesa - Fornecedor', 
      'Despesa - Salário', 
      'Despesa - Transferência',
      'Despesa - Investimento',
      'Despesa - Financiamento',
      'Despesa - Imposto',
      'Despesa - Manutenção',
      'Despesa - Abastecimento',
      'Despesa - Aluguer',
      'Despesa - Utilidades',
      'Despesa - Outros'
    ],
    default: 'Despesa - Outros'
  },
  
  // ============================================
  // VALORES
  // ============================================
  valor: { type: Number, required: true },
  entradaSaida: { type: String, enum: ['entrada', 'saida'], required: true },
  
  // ============================================
  // 🔥 CAMPOS FISCAIS (IMPORTANTES PARA VENDAS)
  // ============================================
  iva: { type: Number, default: 0 },
  retencao: { type: Number, default: 0 },
  taxaIVA: { type: Number, default: 14 },
  taxaRetencao: { type: Number, default: 0 },
  
  // ============================================
  // PERÍODO
  // ============================================
  ano: { type: Number, required: true },
  mes: { type: String, required: true },
  
  // ============================================
  // REFERÊNCIAS
  // ============================================
  documentoReferencia: { type: String }, // ID da venda, factura, etc.
  facturaReferencia: { type: String }, // Número da factura
  clienteReferencia: { type: String }, // Nome do cliente
  nifCliente: { type: String }, // NIF do cliente
  
  // ============================================
  // DETALHES ADICIONAIS
  // ============================================
  detalhesAdicionais: {
    numeroFactura: { type: String },
    cliente: { type: String },
    nifCliente: { type: String },
    formaPagamento: { type: String },
    subtotal: { type: Number },
    desconto: { type: Number },
    itensCount: { type: Number },
    parcelaNumero: { type: Number },
    totalParcelas: { type: Number }
  },
  
  observacao: { type: String },
  
  // ============================================
  // RECONCILIAÇÃO BANCÁRIA
  // ============================================
  reconcilado: { type: Boolean, default: false },
  reconciladoCom: { type: String }, // ID do extrato bancário
  tipoReconciliacao: { type: String, enum: ['auto', 'manual', 'extrato'] },
  dataReconciliacao: { type: Date },
  
  // ============================================
  // IMPORTAÇÃO DE EXTRATO
  // ============================================
  arquivoOriginal: { type: String },
  linhaOriginal: { type: String },
  referenciaBancaria: { type: String }, // Referência do banco (IBAN, etc.)
  
  // ============================================
  // CONTROLOS
  // ============================================
  dataRegisto: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now },
  usuario: { type: String }, // Quem criou o registo
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // ============================================
  // EMPRESA
  // ============================================
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true }
}, { timestamps: true });

// ============================================
// ÍNDICES PARA PERFORMANCE
// ============================================
RegistoBancarioSchema.index({ empresaId: 1, data: -1 });
RegistoBancarioSchema.index({ conta: 1, empresaId: 1 });
RegistoBancarioSchema.index({ documentoReferencia: 1 });
RegistoBancarioSchema.index({ reconcilado: 1 });
RegistoBancarioSchema.index({ ano: 1, mes: 1 });
RegistoBancarioSchema.index({ entradaSaida: 1 });
RegistoBancarioSchema.index({ tipo: 1 });

// ============================================
// MIDDLEWARE PRE-SAVE
// ============================================
RegistoBancarioSchema.pre('save', function(next) {
  this.dataAtualizacao = new Date();
  
  // Garantir que ano e mês estejam preenchidos
  if (!this.ano && this.data) {
    this.ano = this.data.getFullYear();
  }
  if (!this.mes && this.data) {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                   "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    this.mes = meses[this.data.getMonth()];
  }
  
  next();
});

// ============================================
// MÉTODOS ESTÁTICOS
// ============================================

// Buscar registos por período
RegistoBancarioSchema.statics.findByPeriodo = function(empresaId, dataInicio, dataFim) {
  return this.find({
    empresaId,
    data: { $gte: new Date(dataInicio), $lte: new Date(dataFim) }
  }).sort({ data: 1 });
};

// Buscar registos por conta
RegistoBancarioSchema.statics.findByConta = function(empresaId, conta, dataInicio, dataFim) {
  const query = { empresaId, conta };
  if (dataInicio && dataFim) {
    query.data = { $gte: new Date(dataInicio), $lte: new Date(dataFim) };
  }
  return this.find(query).sort({ data: 1 });
};

// Calcular saldo de uma conta
RegistoBancarioSchema.statics.calcularSaldoConta = async function(empresaId, conta, ateData = null) {
  const query = { empresaId, conta };
  if (ateData) {
    query.data = { $lte: new Date(ateData) };
  }
  
  const entradas = await this.find({ ...query, entradaSaida: 'entrada' });
  const saidas = await this.find({ ...query, entradaSaida: 'saida' });
  
  const totalEntradas = entradas.reduce((sum, r) => sum + (r.valor || 0), 0);
  const totalSaidas = saidas.reduce((sum, r) => sum + (r.valor || 0), 0);
  
  return totalEntradas - totalSaidas;
};

// Buscar registos não reconciliados
RegistoBancarioSchema.statics.findNaoReconciliados = function(empresaId, conta = null) {
  const query = { empresaId, reconcilado: false };
  if (conta) {
    query.conta = conta;
  }
  return this.find(query).sort({ data: 1 });
};

// Buscar registos por documento de referência
RegistoBancarioSchema.statics.findByDocumentoReferencia = function(empresaId, documentoReferencia) {
  return this.find({ empresaId, documentoReferencia });
};

// ============================================
// MÉTODOS DE INSTÂNCIA
// ============================================

// Marcar como reconciliado
RegistoBancarioSchema.methods.marcarReconciliado = async function(referenciaExtrato, tipoReconciliacao = 'manual') {
  this.reconcilado = true;
  this.reconciladoCom = referenciaExtrato;
  this.tipoReconciliacao = tipoReconciliacao;
  this.dataReconciliacao = new Date();
  await this.save();
  return this;
};

// Desmarcar reconciliado
RegistoBancarioSchema.methods.desmarcarReconciliado = async function() {
  this.reconcilado = false;
  this.reconciladoCom = null;
  this.tipoReconciliacao = null;
  this.dataReconciliacao = null;
  await this.save();
  return this;
};

// Obter resumo fiscal (IVA e retenções)
RegistoBancarioSchema.methods.getResumoFiscal = function() {
  return {
    valorBase: this.valor + (this.retencao || 0) - (this.iva || 0),
    iva: this.iva || 0,
    taxaIVA: this.taxaIVA || 0,
    retencao: this.retencao || 0,
    taxaRetencao: this.taxaRetencao || 0,
    valorLiquido: this.valor
  };
};

// ============================================
// VIRTUAIS
// ============================================

RegistoBancarioSchema.virtual('saldoApos').get(async function() {
  const registosPosteriores = await this.constructor.find({
    empresaId: this.empresaId,
    conta: this.conta,
    data: { $gt: this.data }
  });
  
  const saldoPosterior = registosPosteriores.reduce((sum, r) => {
    return sum + (r.entradaSaida === 'entrada' ? r.valor : -r.valor);
  }, 0);
  
  return saldoPosterior;
});

RegistoBancarioSchema.virtual('isEntrada').get(function() {
  return this.entradaSaida === 'entrada';
});

RegistoBancarioSchema.virtual('isSaida').get(function() {
  return this.entradaSaida === 'saida';
});

RegistoBancarioSchema.virtual('valorAbsoluto').get(function() {
  return Math.abs(this.valor);
});

// Garantir que os virtuais sejam incluídos no JSON
RegistoBancarioSchema.set('toJSON', { virtuals: true });
RegistoBancarioSchema.set('toObject', { virtuals: true });

// ============================================
// COMPARAÇÃO COM VERSÃO ANTERIOR
// ============================================
// 🔥 CAMPOS ADICIONADOS:
// - iva, retencao, taxaIVA, taxaRetencao (FISCAIS)
// - facturaReferencia, clienteReferencia, nifCliente (REFERÊNCIAS)
// - detalhesAdicionais (DETALHES COMPLETOS)
// - referenciaBancaria (BANCÁRIO)
// - usuario, usuarioId (CONTROLO)
// - dataAtualizacao (TIMESTAMP)
// ============================================

module.exports = mongoose.models.RegistoBancario || mongoose.model('RegistoBancario', RegistoBancarioSchema);