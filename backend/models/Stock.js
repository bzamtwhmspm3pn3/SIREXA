// backend/models/Stock.js
const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema(
  {
    // ============================================
    // IDENTIFICAÇÃO BÁSICA
    // ============================================
    produto: { 
      type: String, 
      required: [true, 'Nome do produto é obrigatório'], 
      trim: true, 
      index: true 
    },
    codigoBarras: { 
      type: String, 
      trim: true, 
      sparse: true, 
      unique: true, 
      index: true 
    },
    codigoInterno: { 
      type: String, 
      trim: true, 
      unique: true, 
      sparse: true,
      index: true 
    },
    
    // ============================================
    // VÍNCULOS
    // ============================================
    empresaId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Empresa', 
      required: [true, 'Empresa é obrigatória'], 
      index: true 
    },
    fornecedorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Fornecedor',
      index: true 
    },
    
    // ============================================
    // CATEGORIZAÇÃO
    // ============================================
    categoria: { 
      type: String, 
      trim: true, 
      default: 'Geral', 
      index: true 
    },
    subcategoria: { type: String, trim: true },
    marca: { type: String, trim: true, index: true },
    modelo: { type: String, trim: true },
    
    // ============================================
    // UNIDADES DE MEDIDA
    // ============================================
    unidadeMedida: { 
      type: String, 
      enum: ['Unidade', 'KG', 'Litro', 'Metro', 'Pacote', 'Caixa', 'Palete', 'Outro'],
      default: 'Unidade'
    },
    
    // ============================================
    // MÉTODOS DE CUSTEIO
    // ============================================
    metodoCusteio: {
      type: String,
      enum: ['FIFO', 'LIFO', 'Custo Médio Ponderado', 'PEPS', 'UEPS'],
      default: 'FIFO'
    },
    
    // ============================================
    // PREÇOS
    // ============================================
    precoCompra: { 
      type: Number, 
      required: [true, 'Preço de compra é obrigatório'], 
      min: 0,
      default: 0
    },
    precoVenda: { 
      type: Number, 
      required: [true, 'Preço de venda é obrigatório'], 
      min: 0,
      default: 0
    },
    precoVendaMinimo: { type: Number, min: 0, default: 0 },
    precoPromocional: { type: Number, min: 0, default: 0 },
    dataInicioPromocao: { type: Date },
    dataFimPromocao: { type: Date },
    
    // ============================================
    // TRIBUTAÇÃO (Angola)
    // ============================================
    codigoPauta: { type: String, trim: true },
    taxaIVA: { type: Number, default: 14, min: 0, max: 36 },
    taxaISC: { type: Number, default: 0, min: 0, max: 100 },
    taxaImpostoImportacao: { type: Number, default: 0, min: 0 },
    
    // ============================================
    // ESTOQUE
    // ============================================
    quantidade: { 
      type: Number, 
      required: true, 
      min: 0, 
      default: 0,
      index: true 
    },
    quantidadeMinima: { type: Number, default: 5, min: 0 },
    quantidadeMaxima: { type: Number, default: 1000, min: 0 },
    estoqueSeguranca: { type: Number, default: 0, min: 0 },
    pontoReposicao: { type: Number, default: 0, min: 0 },
    
    // ============================================
    // DATAS
    // ============================================
    dataValidade: { 
      type: Date, 
      required: [true, 'Data de validade é obrigatória'],
      index: true 
    },
    dataFabricacao: { type: Date },
    dataUltimaEntrada: { type: Date },
    dataUltimaSaida: { type: Date },
    
    // ============================================
    // FORNECEDOR
    // ============================================
    fornecedor: { type: String, trim: true },
    fornecedorReferencia: { type: String, trim: true },
    
    // ============================================
    // LOCALIZAÇÃO
    // ============================================
    localizacao: { type: String, trim: true },
    armazem: { type: String, default: 'Principal', trim: true, index: true },
    prateleira: { type: String, trim: true },
    
    // ============================================
    // LOTE E RASTREABILIDADE
    // ============================================
    numeroLote: { type: String, trim: true, index: true },
    serie: { type: String, trim: true },
    
    // ============================================
    // IMAGEM
    // ============================================
    imagemUrl: { type: String },
    imagemPublicId: { type: String },
    
    // ============================================
    // STATUS E CONTROLES
    // ============================================
    ativo: { type: Boolean, default: true, index: true },
    controlaValidade: { type: Boolean, default: true },
    controlaLote: { type: Boolean, default: false },
    
    // ============================================
    // HISTÓRICO DE MOVIMENTAÇÕES
    // ============================================
    historicoMovimentacoes: [{
      data: { type: Date, default: Date.now },
      tipo: { type: String, enum: ['entrada', 'saida', 'ajuste', 'devolucao', 'descarte'] },
      quantidade: { type: Number, required: true },
      quantidadeAnterior: { type: Number, required: true },
      quantidadeNova: { type: Number, required: true },
      motivo: { type: String, trim: true },
      usuario: { type: String, trim: true },
      usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    
    // ============================================
    // HISTÓRICO DE DEVOLUÇÕES
    // ============================================
    historicoDevolucoes: [{
      data: { type: Date, default: Date.now },
      quantidade: { type: Number, required: true },
      motivo: { type: String, enum: ['vencido', 'danificado', 'erro_pedido', 'defeito', 'cliente', 'outro'], required: true },
      observacao: { type: String, trim: true },
      usuario: { type: String, trim: true }
    }],
    
    // ============================================
    // OBSERVAÇÕES
    // ============================================
    observacoes: { type: String, trim: true },
    
    // ============================================
    // AUDITORIA
    // ============================================
    criadoPor: { type: String, trim: true },
    criadoPorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    atualizadoPor: { type: String, trim: true },
    
    // ============================================
    // TIMESTAMPS
    // ============================================
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ============================================
// ÍNDICES COMPOSTOS (Performance)
// ============================================
StockSchema.index({ empresaId: 1, produto: 1 });
StockSchema.index({ empresaId: 1, codigoBarras: 1 });
StockSchema.index({ empresaId: 1, categoria: 1 });
StockSchema.index({ empresaId: 1, dataValidade: 1 });
StockSchema.index({ empresaId: 1, quantidade: 1 });
StockSchema.index({ empresaId: 1, ativo: 1 });
StockSchema.index({ empresaId: 1, armazem: 1 });
StockSchema.index({ dataValidade: 1, quantidade: 1 });

// ============================================
// VIRTUAIS
// ============================================

// Margem de lucro em %
StockSchema.virtual('margemLucro').get(function() {
  if (!this.precoCompra || this.precoCompra === 0) return 0;
  return ((this.precoVenda - this.precoCompra) / this.precoCompra) * 100;
});

// Valor total em stock (preço de venda)
StockSchema.virtual('valorTotalVenda').get(function() {
  return (this.quantidade * this.precoVenda) || 0;
});

// Valor total em stock (preço de compra)
StockSchema.virtual('valorTotalCompra').get(function() {
  return (this.quantidade * this.precoCompra) || 0;
});

// Lucro total estimado
StockSchema.virtual('lucroTotalEstimado').get(function() {
  return (this.quantidade * (this.precoVenda - this.precoCompra)) || 0;
});

// Status de validade
StockSchema.virtual('statusValidade').get(function() {
  if (!this.dataValidade) return 'sem_data';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(this.dataValidade);
  validade.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
  
  if (diffDias < 0) return 'vencido';
  if (diffDias <= 30) return 'proximo_vencer';
  return 'valido';
});

// Status de estoque
StockSchema.virtual('statusEstoque').get(function() {
  if (this.quantidade === 0) return 'esgotado';
  if (this.quantidade <= this.quantidadeMinima) return 'baixo';
  if (this.quantidade >= this.quantidadeMaxima) return 'excesso';
  return 'normal';
});

// Necessita reposição?
StockSchema.virtual('necessitaReposicao').get(function() {
  return this.quantidade <= this.pontoReposicao;
});

// Dias para vencer
StockSchema.virtual('diasParaVencer').get(function() {
  if (!this.dataValidade) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(this.dataValidade);
  validade.setHours(0, 0, 0, 0);
  return Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
});

// Preço atual (considera promoção)
StockSchema.virtual('precoAtual').get(function() {
  if (!this.precoPromocional) return this.precoVenda;
  
  const hoje = new Date();
  const inicioPromo = this.dataInicioPromocao ? new Date(this.dataInicioPromocao) : null;
  const fimPromo = this.dataFimPromocao ? new Date(this.dataFimPromocao) : null;
  
  if (inicioPromo && fimPromo && hoje >= inicioPromo && hoje <= fimPromo) {
    return this.precoPromocional;
  }
  return this.precoVenda;
});

// Valor com IVA
StockSchema.virtual('valorComIVA').get(function() {
  return this.precoVenda * (1 + this.taxaIVA / 100);
});

// ============================================
// MÉTODOS DE INSTÂNCIA
// ============================================

// Registrar movimentação
StockSchema.methods.registrarMovimentacao = async function(tipo, quantidade, motivo, usuario, usuarioId) {
  const quantidadeAnterior = this.quantidade;
  
  if (tipo === 'entrada') {
    this.quantidade += quantidade;
    this.dataUltimaEntrada = new Date();
  } else if (tipo === 'saida' || tipo === 'ajuste') {
    if (this.quantidade < quantidade) {
      throw new Error(`Estoque insuficiente. Disponível: ${this.quantidade}`);
    }
    this.quantidade -= quantidade;
    this.dataUltimaSaida = new Date();
  }
  
  this.historicoMovimentacoes.push({
    data: new Date(),
    tipo,
    quantidade,
    quantidadeAnterior,
    quantidadeNova: this.quantidade,
    motivo,
    usuario,
    usuarioId
  });
  
  this.updatedAt = new Date();
  await this.save();
  
  return this;
};

// Registrar devolução
StockSchema.methods.registrarDevolucao = async function(quantidade, motivo, observacao, usuario) {
  if (this.quantidade < quantidade) {
    throw new Error(`Estoque insuficiente para devolução. Disponível: ${this.quantidade}`);
  }
  
  this.quantidade -= quantidade;
  this.dataUltimaSaida = new Date();
  
  this.historicoDevolucoes.push({
    data: new Date(),
    quantidade,
    motivo,
    observacao,
    usuario
  });
  
  this.historicoMovimentacoes.push({
    data: new Date(),
    tipo: 'devolucao',
    quantidade,
    quantidadeAnterior: this.quantidade + quantidade,
    quantidadeNova: this.quantidade,
    motivo: `Devolução: ${motivo}`,
    usuario
  });
  
  this.updatedAt = new Date();
  await this.save();
  
  return this;
};

// Verificar se está vencido
StockSchema.methods.estaVencido = function() {
  if (!this.dataValidade) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(this.dataValidade);
  validade.setHours(0, 0, 0, 0);
  return validade < hoje;
};

// Verificar se está próximo a vencer
StockSchema.methods.estaProximoVencer = function(dias = 30) {
  if (!this.dataValidade) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(this.dataValidade);
  validade.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
  return diffDias <= dias && diffDias > 0;
};

// ============================================
// MIDDLEWARE PRE-SAVE
// ============================================
StockSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ============================================
// MIDDLEWARE PRE-VALIDATE
// ============================================
StockSchema.pre('validate', function(next) {
  if (this.precoVenda < this.precoCompra) {
    next(new Error('Preço de venda não pode ser menor que o preço de compra'));
  }
  next();
});

module.exports = mongoose.models.Stock || mongoose.model('Stock', StockSchema);