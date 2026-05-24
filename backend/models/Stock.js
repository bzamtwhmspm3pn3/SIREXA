const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema(
  {
    // ============================================
    // IDENTIFICAÇÃO BÁSICA
    // ============================================
    produto: { 
      type: String, 
      required: [true, 'Nome do produto/serviço é obrigatório'], 
      trim: true, 
      index: true 
    },
    codigoBarras: { 
      type: String, 
      trim: true, 
      sparse: true, 
      index: true 
    },
    codigoInterno: { 
      type: String, 
      trim: true, 
      sparse: true,
      index: true 
    },
    
    // ============================================
    // TIPO: PRODUTO ou SERVIÇO
    // ============================================
    tipo: {
      type: String,
      enum: ['produto', 'servico'],
      default: 'produto',
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
    
    // ============================================
    // 🆕 ASSOCIAÇÃO COM FORNECEDORES
    // ============================================
    fornecedorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Fornecedor',
      index: true 
    },
    ultimoFornecedor: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Fornecedor' 
    },
    fornecedoresAssociados: [{
      fornecedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fornecedor' },
      fornecedorNome: { type: String },
      ultimaCompra: { type: Date },
      ultimoPreco: { type: Number },
      quantidadeTotal: { type: Number, default: 0 }
    }],
    
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
      enum: ['Unidade', 'KG', 'Litro', 'Metro', 'Pacote', 'Caixa', 'Palete', 'Hora', 'Dia', 'Mês', 'Serviço', 'Outro'],
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
      required: function() { return this.tipo === 'produto'; },
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
    // ESTOQUE (apenas para produtos)
    // ============================================
    quantidade: { 
      type: Number, 
      required: function() { return this.tipo === 'produto'; },
      min: 0, 
      default: 0,
      index: true 
    },
    quantidadeMinima: { type: Number, default: 5, min: 0 },
    quantidadeMaxima: { type: Number, default: 1000, min: 0 },
    estoqueSeguranca: { type: Number, default: 0, min: 0 },
    pontoReposicao: { type: Number, default: 0, min: 0 },
    
    // ============================================
    // DATAS (validade opcional para serviços)
    // ============================================
    dataValidade: { 
      type: Date, 
      required: function() { return this.tipo === 'produto' && this.controlaValidade === true; },
      index: true 
    },
    dataFabricacao: { type: Date },
    dataUltimaEntrada: { type: Date },
    dataUltimaSaida: { type: Date },
    
    // ============================================
    // FORNECEDOR (informação textual)
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
    // CAMPOS ESPECÍFICOS PARA SERVIÇOS
    // ============================================
    duracaoEstimada: { type: Number, default: 0 },
    unidadeTempo: { type: String, enum: ['minutos', 'horas', 'dias'], default: 'horas' },
    precoHora: { type: Number, default: 0 },
    executadoPor: { type: String, trim: true },
    requerAgendamento: { type: Boolean, default: false },
    localExecucao: { type: String, trim: true },
    recursosNecessarios: { type: String, trim: true },
    instrucoes: { type: String, trim: true },
    
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
      usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      fornecedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fornecedor' }, // 🆕
      precoUnitario: { type: Number } // 🆕
    }],
    
    // ============================================
    // 🆕 HISTÓRICO DE COMPRAS (POR FORNECEDOR)
    // ============================================
    historicoCompras: [{
      data: { type: Date, default: Date.now },
      fornecedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fornecedor' },
      fornecedorNome: { type: String },
      quantidade: { type: Number, required: true },
      precoUnitario: { type: Number, required: true },
      valorTotal: { type: Number, required: true },
      numeroFactura: { type: String },
      usuario: { type: String }
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
// ÍNDICES COMPOSTOS
// ============================================
StockSchema.index({ empresaId: 1, produto: 1 });
StockSchema.index({ empresaId: 1, codigoBarras: 1 }, { unique: true, partialFilterExpression: { codigoBarras: { $exists: true, $ne: null } } });
StockSchema.index({ empresaId: 1, codigoInterno: 1 }, { unique: true, partialFilterExpression: { codigoInterno: { $exists: true, $ne: null } } });
StockSchema.index({ empresaId: 1, categoria: 1 });
StockSchema.index({ empresaId: 1, dataValidade: 1 });
StockSchema.index({ empresaId: 1, quantidade: 1 });
StockSchema.index({ empresaId: 1, ativo: 1 });
StockSchema.index({ empresaId: 1, armazem: 1 });
StockSchema.index({ dataValidade: 1, quantidade: 1 });
StockSchema.index({ empresaId: 1, tipo: 1 });
StockSchema.index({ fornecedorId: 1 }); // 🆕
StockSchema.index({ ultimoFornecedor: 1 }); // 🆕

// ============================================
// VIRTUAIS
// ============================================

StockSchema.virtual('margemLucro').get(function() {
  if (!this.precoCompra || this.precoCompra === 0) return 0;
  return ((this.precoVenda - this.precoCompra) / this.precoCompra) * 100;
});

StockSchema.virtual('valorTotalVenda').get(function() {
  const qtd = this.tipo === 'servico' ? 1 : (this.quantidade || 0);
  return (qtd * this.precoVenda) || 0;
});

StockSchema.virtual('valorTotalCompra').get(function() {
  const qtd = this.tipo === 'servico' ? 1 : (this.quantidade || 0);
  return (qtd * this.precoCompra) || 0;
});

StockSchema.virtual('lucroTotalEstimado').get(function() {
  const qtd = this.tipo === 'servico' ? 1 : (this.quantidade || 0);
  return (qtd * (this.precoVenda - this.precoCompra)) || 0;
});

StockSchema.virtual('statusValidade').get(function() {
  if (this.tipo !== 'produto') return 'nao_aplica';
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

StockSchema.virtual('statusEstoque').get(function() {
  if (this.tipo !== 'produto') return 'nao_aplica';
  if (this.quantidade === 0) return 'esgotado';
  if (this.quantidade <= this.quantidadeMinima) return 'baixo';
  if (this.quantidade >= this.quantidadeMaxima) return 'excesso';
  return 'normal';
});

StockSchema.virtual('necessitaReposicao').get(function() {
  if (this.tipo !== 'produto') return false;
  return this.quantidade <= this.pontoReposicao;
});

StockSchema.virtual('diasParaVencer').get(function() {
  if (this.tipo !== 'produto') return null;
  if (!this.dataValidade) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(this.dataValidade);
  validade.setHours(0, 0, 0, 0);
  return Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
});

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

StockSchema.virtual('valorComIVA').get(function() {
  return this.precoVenda * (1 + this.taxaIVA / 100);
});

// 🆕 VIRTUAL: Último fornecedor nome
StockSchema.virtual('ultimoFornecedorNome').get(async function() {
  if (!this.ultimoFornecedor) return null;
  const Fornecedor = mongoose.model('Fornecedor');
  const fornecedor = await Fornecedor.findById(this.ultimoFornecedor);
  return fornecedor ? fornecedor.nome : null;
});

// ============================================
// 🆕 MÉTODO: ASSOCIAR FORNECEDOR AO PRODUTO
// ============================================
StockSchema.methods.associarFornecedor = async function(fornecedorId, fornecedorNome, precoCompra, quantidade, numeroFactura = null) {
  try {
    const Fornecedor = mongoose.model('Fornecedor');
    const fornecedor = await Fornecedor.findById(fornecedorId);
    
    if (!fornecedor) {
      throw new Error(`Fornecedor ${fornecedorId} não encontrado`);
    }
    
    // Atualizar o fornecedor atual do produto
    this.fornecedorId = fornecedorId;
    this.ultimoFornecedor = fornecedorId;
    this.fornecedor = fornecedor.nome;
    
    // Adicionar ou atualizar na lista de fornecedores associados
    const associadoExistente = this.fornecedoresAssociados.find(
      f => f.fornecedorId && f.fornecedorId.toString() === fornecedorId.toString()
    );
    
    if (associadoExistente) {
      associadoExistente.ultimaCompra = new Date();
      associadoExistente.ultimoPreco = precoCompra;
      associadoExistente.quantidadeTotal += quantidade;
    } else {
      this.fornecedoresAssociados.push({
        fornecedorId: fornecedorId,
        fornecedorNome: fornecedor.nome,
        ultimaCompra: new Date(),
        ultimoPreco: precoCompra,
        quantidadeTotal: quantidade
      });
    }
    
    // Registrar no histórico de compras
    this.historicoCompras.push({
      data: new Date(),
      fornecedorId: fornecedorId,
      fornecedorNome: fornecedor.nome,
      quantidade: quantidade,
      precoUnitario: precoCompra,
      valorTotal: quantidade * precoCompra,
      numeroFactura: numeroFactura,
      usuario: 'Sistema'
    });
    
    // Atualizar preço de compra (último preço)
    this.precoCompra = precoCompra;
    
    await this.save();
    
    // Também registrar no fornecedor (associação reversa)
    await fornecedor.associarProduto(this._id, quantidade, precoCompra, numeroFactura);
    
    console.log(`✅ Produto "${this.produto}" associado ao fornecedor ${fornecedor.nome}`);
    
    return { sucesso: true };
    
  } catch (error) {
    console.error(`❌ Erro ao associar fornecedor:`, error.message);
    return { sucesso: false, erro: error.message };
  }
};

// ============================================
// 🆕 MÉTODO: REGISTAR COMPRA (ATUALIZA ESTOQUE E ASSOCIA FORNECEDOR)
// ============================================
StockSchema.methods.registrarCompra = async function(quantidade, precoUnitario, fornecedorId, numeroFactura = null, usuario = "Sistema") {
  if (this.tipo !== 'produto') {
    throw new Error('Registro de compra só é permitido para produtos físicos');
  }
  
  const quantidadeAnterior = this.quantidade;
  
  // Atualizar quantidade
  this.quantidade += quantidade;
  this.dataUltimaEntrada = new Date();
  
  // Associar fornecedor
  if (fornecedorId) {
    await this.associarFornecedor(fornecedorId, null, precoUnitario, quantidade, numeroFactura);
  }
  
  // Registrar movimentação
  this.historicoMovimentacoes.push({
    data: new Date(),
    tipo: 'entrada',
    quantidade: quantidade,
    quantidadeAnterior: quantidadeAnterior,
    quantidadeNova: this.quantidade,
    motivo: `Compra - Fornecedor ID: ${fornecedorId} - Factura: ${numeroFactura || 'N/A'}`,
    usuario: usuario,
    fornecedorId: fornecedorId,
    precoUnitario: precoUnitario
  });
  
  this.updatedAt = new Date();
  await this.save();
  
  console.log(`💰 Compra registrada: +${quantidade} de ${this.produto} (${precoUnitario} Kz/un) - Total: ${(quantidade * precoUnitario).toLocaleString()} Kz`);
  
  return {
    sucesso: true,
    produto: this.produto,
    quantidadeAnterior,
    quantidadeNova: this.quantidade,
    valorTotal: quantidade * precoUnitario
  };
};

// ============================================
// 🆕 MÉTODO: OBTER FORNECEDORES DO PRODUTO
// ============================================
StockSchema.methods.getFornecedores = async function() {
  const Fornecedor = mongoose.model('Fornecedor');
  const fornecedores = [];
  
  for (const assoc of this.fornecedoresAssociados) {
    const fornecedor = await Fornecedor.findById(assoc.fornecedorId);
    if (fornecedor) {
      fornecedores.push({
        id: fornecedor._id,
        nome: fornecedor.nome,
        nif: fornecedor.nif,
        ultimoPreco: assoc.ultimoPreco,
        ultimaCompra: assoc.ultimaCompra,
        quantidadeTotal: assoc.quantidadeTotal
      });
    }
  }
  
  return fornecedores;
};

// ============================================
// MÉTODOS DE INSTÂNCIA (EXISTENTES)
// ============================================

StockSchema.methods.registrarMovimentacao = async function(tipo, quantidade, motivo, usuario, usuarioId) {
  if (this.tipo !== 'produto') {
    throw new Error('Movimentações de estoque só são permitidas para produtos físicos');
  }
  
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

StockSchema.methods.registrarDevolucao = async function(quantidade, motivo, observacao, usuario) {
  if (this.tipo !== 'produto') {
    throw new Error('Devoluções só são permitidas para produtos físicos');
  }
  
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

StockSchema.methods.estaVencido = function() {
  if (this.tipo !== 'produto') return false;
  if (!this.dataValidade) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(this.dataValidade);
  validade.setHours(0, 0, 0, 0);
  return validade < hoje;
};

StockSchema.methods.estaProximoVencer = function(dias = 30) {
  if (this.tipo !== 'produto') return false;
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
  
  if (this.tipo === 'servico') {
    this.quantidade = 0;
    this.controlaValidade = false;
    this.precoCompra = this.precoCompra || 0;
  }
  
  next();
});

// ============================================
// MIDDLEWARE PRE-VALIDATE
// ============================================
StockSchema.pre('validate', function(next) {
  if (this.precoVenda < this.precoCompra && this.tipo === 'produto') {
    next(new Error('Preço de venda não pode ser menor que o preço de compra'));
  }
  next();
});

module.exports = mongoose.models.Stock || mongoose.model('Stock', StockSchema);