// backend/models/ContaCorrente.js
const mongoose = require('mongoose');

const movimentoSchema = new mongoose.Schema({
  tipo: { 
    type: String, 
    enum: ['Crédito', 'Débito', 'Pagamento', 'Recebimento', 'Pagamento Fornecedor', 'Pagamento Salário'], 
    required: true 
  },
  valor: { type: Number, required: true },
  valorBruto: { type: Number, default: 0 },
  retencaoFonte: { type: Number, default: 0 },
  taxaRetencao: { type: Number, default: 0 },
  descricao: { type: String, default: '' },
  data: { type: Date, default: Date.now },
  dataVencimento: { type: Date },
  referencia: { type: String, unique: false },
  documentoReferencia: { type: String },
  formaPagamento: { type: String, default: 'Transferência Bancária' },
  origemId: { type: mongoose.Schema.Types.ObjectId },
  origemModel: { 
    type: String, 
    enum: ['Pagamento', 'Fornecedor', 'Funcionario', 'Venda', 'Fatura', 'Transferencia'], // 🔥 ADICIONADO 'Transferencia'
    default: 'Pagamento'
  },
  contratoId: { type: mongoose.Schema.Types.ObjectId },
  mesReferencia: { type: String }, // Ex: "2024-01"
  status: { type: String, enum: ['Pendente', 'Pago', 'Cancelado'], default: 'Pendente' },
  dataPagamento: { type: Date },
  pagamentoReferencia: { type: String },
  saldoAnterior: { type: Number, required: true },
  saldoAtual: { type: Number, required: true }
}, { timestamps: true });

const ContaCorrenteSchema = new mongoose.Schema({
  empresaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Empresa', 
    required: true 
  },
  beneficiario: { 
    type: String, 
    required: true,
    trim: true 
  },
  beneficiarioDocumento: { 
    type: String,
    trim: true 
  },
  tipo: { 
    type: String, 
    enum: ['Fornecedor', 'Funcionário', 'Cliente', 'Outro'], 
    required: true,
    default: 'Fornecedor'
  },
  categoria: { 
    type: String, 
    enum: ['Serviços', 'Produtos', 'Salários', 'Aluguer', 'Outros'],
    default: 'Serviços'
  },
  contato: { type: String, trim: true },
  endereco: { type: String, trim: true },
  email: { type: String, trim: true },
  telefone: { type: String, trim: true },
  
  // Saldos
  saldo: { type: Number, default: 0 },
  limiteCredito: { type: Number, default: 0 },
  saldoInicial: { type: Number, default: 0 },
  
  // Datas
  dataUltimaMovimentacao: { type: Date },
  dataUltimaFatura: { type: Date },
  dataUltimoPagamento: { type: Date },
  
  // Movimentos
  movimentos: [movimentoSchema],
  
  // Estatísticas
  estatisticas: {
    totalFaturas: { type: Number, default: 0 },
    totalPagamentos: { type: Number, default: 0 },
    totalJuros: { type: Number, default: 0 },
    totalMultas: { type: Number, default: 0 }
  },
  
  // Configurações
  observacoes: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Ativo', 'Bloqueado', 'Inativo'], 
    default: 'Ativo' 
  },
  
  // Auditoria
  criadoPor: { type: String, default: 'Sistema' },
  atualizadoPor: { type: String, default: 'Sistema' },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// VIRTUAIS
// ============================================

// Situação da conta
ContaCorrenteSchema.virtual('situacao').get(function() {
  if (this.saldo > 0) return 'Credor (empresa deve)';
  if (this.saldo < 0) return 'Devedor (fornecedor deve)';
  return 'Zerado';
});

// Saldo formatado
ContaCorrenteSchema.virtual('saldoFormatado').get(function() {
  return Math.abs(this.saldo).toLocaleString('pt-AO', { minimumFractionDigits: 2 });
});

// Dias desde última movimentação
ContaCorrenteSchema.virtual('diasUltimaMovimentacao').get(function() {
  if (!this.dataUltimaMovimentacao) return null;
  const diff = Math.floor((new Date() - this.dataUltimaMovimentacao) / (1000 * 60 * 60 * 24));
  return diff;
});

// ============================================
// MÉTODOS DE INSTÂNCIA
// ============================================

// Adicionar movimento
ContaCorrenteSchema.methods.adicionarMovimento = async function(movimentoData) {
  const saldoAnterior = this.saldo;
  let novoSaldo = saldoAnterior;
  
  if (movimentoData.tipo === 'Crédito') {
    novoSaldo = saldoAnterior + movimentoData.valor;
  } else if (movimentoData.tipo === 'Débito') {
    novoSaldo = saldoAnterior - movimentoData.valor;
  }
  
  const movimento = {
    ...movimentoData,
    saldoAnterior: saldoAnterior,
    saldoAtual: novoSaldo
  };
  
  this.movimentos.push(movimento);
  this.saldo = novoSaldo;
  this.dataUltimaMovimentacao = new Date();
  
  if (movimentoData.tipo === 'Crédito') {
    this.dataUltimaFatura = new Date();
    this.estatisticas.totalFaturas += 1;
  } else if (movimentoData.tipo === 'Débito') {
    this.dataUltimoPagamento = new Date();
    this.estatisticas.totalPagamentos += 1;
  }
  
  await this.save();
  return movimento;
};

// Verificar se tem saldo suficiente
ContaCorrenteSchema.methods.temSaldoSuficiente = function(valor) {
  return this.saldo >= valor;
};

// Calcular multa por atraso
ContaCorrenteSchema.methods.calcularMulta = function(valor, diasAtraso, taxaMulta = 2, taxaJuros = 1) {
  const multa = valor * (taxaMulta / 100);
  const juros = valor * (taxaJuros / 100) * (diasAtraso / 30);
  return { multa, juros, total: multa + juros };
};

// ============================================
// MÉTODOS ESTÁTICOS
// ============================================

// Buscar conta por beneficiário
ContaCorrenteSchema.statics.buscarPorBeneficiario = function(empresaId, beneficiario) {
  return this.findOne({ empresaId, beneficiario, tipo: 'Fornecedor' });
};

// Buscar todas as contas com saldo devedor
ContaCorrenteSchema.statics.buscarDevedores = function(empresaId) {
  return this.find({ empresaId, saldo: { $lt: 0 }, status: 'Ativo' }).sort({ saldo: 1 });
};

// Buscar todas as contas com saldo credor
ContaCorrenteSchema.statics.buscarCredores = function(empresaId) {
  return this.find({ empresaId, saldo: { $gt: 0 }, status: 'Ativo' }).sort({ saldo: -1 });
};

// Buscar contas vencidas (sem movimentação há mais de X dias)
ContaCorrenteSchema.statics.buscarInativas = function(empresaId, dias = 90) {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);
  return this.find({ 
    empresaId, 
    dataUltimaMovimentacao: { $lt: dataLimite },
    status: 'Ativo'
  });
};

// Resumo geral da empresa
ContaCorrenteSchema.statics.resumoEmpresa = async function(empresaId) {
  const resultado = await this.aggregate([
    { $match: { empresaId: new mongoose.Types.ObjectId(empresaId) } },
    { 
      $group: {
        _id: '$tipo',
        totalContas: { $sum: 1 },
        saldoTotal: { $sum: '$saldo' },
        totalCreditos: { $sum: { $cond: [{ $gt: ['$saldo', 0] }, '$saldo', 0] } },
        totalDebitos: { $sum: { $cond: [{ $lt: ['$saldo', 0] }, { $abs: '$saldo' }, 0] } }
      }
    }
  ]);
  
  return resultado;
};

// ============================================
// ÍNDICES
// ============================================
ContaCorrenteSchema.index({ empresaId: 1, beneficiario: 1 });
ContaCorrenteSchema.index({ empresaId: 1, beneficiarioDocumento: 1 });
ContaCorrenteSchema.index({ tipo: 1 });
ContaCorrenteSchema.index({ status: 1 });
ContaCorrenteSchema.index({ saldo: 1 });
ContaCorrenteSchema.index({ 'movimentos.referencia': 1 });
ContaCorrenteSchema.index({ 'movimentos.data': -1 });
ContaCorrenteSchema.index({ dataUltimaMovimentacao: -1 });

// Índice composto para buscas rápidas
ContaCorrenteSchema.index({ empresaId: 1, status: 1, saldo: 1 });

// ============================================
// MIDDLEWARE
// ============================================

// Pré-save: atualizar updatedAt
ContaCorrenteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pós-save: log
ContaCorrenteSchema.post('save', function(doc) {
  console.log(`📋 Conta atualizada: ${doc.beneficiario} - Saldo: ${doc.saldo} Kz`);
});

// ============================================
// EXPORTAÇÃO
// ============================================
module.exports = mongoose.models.ContaCorrente || mongoose.model('ContaCorrente', ContaCorrenteSchema);