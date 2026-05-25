// backend/models/Fornecedor.js
const mongoose = require("mongoose");

// =============================================
// SCHEMA DE CONTRATO (MELHORADO)
// =============================================
const contratoSchema = new mongoose.Schema({
  descricao: { type: String, required: true },
  valor: { type: Number, required: true },
  dataInicio: { type: Date, required: true },
  dataFim: { type: Date, required: true },
  modalidadePagamento: {
    type: String,
    enum: ['Diário', 'Semanal', 'Quinzenal', 'Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual', 'Único'],
    default: 'Mensal'
  },
  diaVencimento: { type: Number, min: 1, max: 31, default: 5 },
  diaPagamento: { type: Number, min: 1, max: 31, default: 15 },
  avisoAntecedencia: { type: Number, default: 5 },
  proximoPagamento: { type: Date },
  valorLiquido: { type: Number, default: 0 },
  iva: { type: Number, default: 0 },
  retencao: { type: Number, default: 0 },
  observacoes: { type: String, default: "" },
  anexos: [{ type: String }]
});

// =============================================
// SCHEMA DE PRODUTO/SERVIÇO FORNECIDO (INTELIGENTE)
// =============================================
const itemFornecidoSchema = new mongoose.Schema({
  // Campos comuns
  tipo: { type: String, enum: ['mercadoria', 'manutencao', 'abastecimento', 'equipamento', 'servicoProfissional', 'renda', 'internet', 'servicoGeral'], required: true },
  descricao: { type: String },
  valor: { type: Number, default: 0 },
  valorTotal: { type: Number, default: 0 },
  
  // Para MERCADORIA
  produto: { type: String },
  codigoBarras: { type: String },
  categoria: { type: String },
  marca: { type: String },
  quantidade: { type: Number, default: 0 },
  unidadeMedida: { type: String, default: 'Unidade' },
  precoCompra: { type: Number, default: 0 },
  precoVenda: { type: Number, default: 0 },
  descontoCompra: { type: Number, default: 0 },
  taxaIVA: { type: Number, default: 14 },
  dataValidade: { type: Date },
  lote: { type: String },
  armazem: { type: String },
  estoqueMinimo: { type: Number, default: 0 },
  prazoEntrega: { type: Number, default: 0 },
  
  // Para RENDA (Aluguer)
  tipoImovel: { type: String },
  localizacao: { type: String },
  area: { type: Number },
  valorMensal: { type: Number },
  valorCondominio: { type: Number },
  caução: { type: Number },
  reajuste: { type: Number },
  periodoReajuste: { type: String },
  indexador: { type: String },
  impostoRenda: { type: Number, default: 15 },
  impostoSelo: { type: Number, default: 0 },
  utilidadesIncluidas: [{ type: String }],
  garantias: { type: String },
  clausulasEspeciais: { type: String },
  
  // Para SERVIÇOS PROFISSIONAIS
  tipoServico: { type: String },
  modalidade: { type: String },
  valorHora: { type: Number },
  valorProjeto: { type: Number },
  horasEstimadas: { type: Number },
  prazoExecucao: { type: Number },
  entregaveis: { type: String },
  relatoriosPeriodicos: { type: String },
  reunioes: { type: Number },
  
  // Para INTERNET/TELECOM
  operadora: { type: String },
  plano: { type: String },
  velocidade: { type: String },
  franquia: { type: String },
  periodoFidelizacao: { type: Number },
  multaRescisao: { type: Number },
  equipamentos: { type: String },
  ipPublico: { type: Boolean, default: false },
  suporte24h: { type: Boolean, default: false },
  dataInstalacao: { type: Date },
  
  // Para MANUTENÇÃO
  tipoManutencao: { type: String },
  equipamento: { type: String },
  pecasUtilizadas: { type: String },
  maoDeObra: { type: Number },
  garantia: { type: Number },
  dataAgendamento: { type: Date },
  horaAgendamento: { type: String },
  duracaoEstimada: { type: Number },
  tecnicoResponsavel: { type: String },
  kmAtual: { type: Number },
  proximaManutencao: { type: Number },
  
  // Para ABASTECIMENTO
  tipoCombustivel: { type: String },
  precoLitro: { type: Number },
  viatura: { type: String },
  odometro: { type: Number },
  posto: { type: String },
  motorista: { type: String },
  fatura: { type: String },
  
  // Para EQUIPAMENTO
  nome: { type: String },
  numeroSerie: { type: String },
  modelo: { type: String },
  valorAquisicao: { type: Number },
  dataAquisicao: { type: Date },
  vidaUtil: { type: Number },
  depreciacao: { type: Number },
  responsavel: { type: String },
  especificacoes: { type: String },
  acessorios: { type: String },
  
  // Para SERVIÇO GERAL
  dataExecucao: { type: Date },
  formaPagamento: { type: String },
  
  // Dados comuns adicionais
  observacoes: { type: String },
  dataRegisto: { type: Date, default: Date.now },
  usuario: { type: String }
});

// =============================================
// SCHEMA PRINCIPAL DO FORNECEDOR (ATUALIZADO)
// =============================================
const fornecedorSchema = new mongoose.Schema(
  {
    empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
    empresaNome: { type: String, default: "" },
    nome: { type: String, required: true, trim: true },
    nif: { type: String, required: true, trim: true },
    telefone: { type: String, default: "" },
    email: { type: String, default: "" },
    endereco: { type: String, default: "" },
    contato: { type: String, default: "" },
    
    // CORRIGIDO: Tipo e natureza do fornecedor - AGORA OPCIONAL com default
    tipoFornecedor: { 
      type: String, 
      enum: ['mercadoria', 'manutencao', 'abastecimento', 'equipamento', 'servicoProfissional', 'renda', 'internet', 'servicoGeral'],
      required: false,  // ← ALTERADO PARA false (compatibilidade com dados antigos)
      default: 'servicoGeral'  // ← VALOR PADRÃO
    },
    natureza: { type: String }, // Produto Físico, Serviço Recorrente, etc
    
    // Dados Fiscais
    regimeTributacao: {
      type: String,
      enum: ["Regime Geral", "Regime Simplificado", "Regime de IVA com Exclusão", "Regime de IVA com Inclusão", ""],
      default: ""
    },
    fiscal: {
      suportaIVA: { type: Boolean, default: true },
      taxaIVA: { type: Number, default: 14 },
      retencaoFonte: { type: Boolean, default: false },
      tipoRetencao: { type: String, enum: ['Renda', 'Serviços', 'Outros', ''], default: '' },
      taxaRetencao: { type: Number, default: 0 }
    },
    
    // Contratos
    contratos: [contratoSchema],
    
    // Itens fornecidos (produtos/serviços)
    itensFornecidos: [itemFornecidoSchema],
    
    // Dados Bancários
    pagamento: {
      banco: { type: String, default: "" },
      iban: { type: String, default: "" },
      swift: { type: String, default: "" },
      formaPagamento: { type: String, enum: ['Transferência', 'Dinheiro', 'Cheque', 'POS'], default: 'Transferência' }
    },
    
    // Estatísticas
    estatisticasCompras: {
      totalCompras: { type: Number, default: 0 },
      totalGasto: { type: Number, default: 0 },
      ultimaCompra: { type: Date },
      quantidadeTotalProdutos: { type: Number, default: 0 }
    },
    
    observacoes: { type: String, default: "" },
    status: { type: String, enum: ['Ativo', 'Inativo', 'Bloqueado'], default: 'Ativo' },
    ultimoPagamento: { type: Date },
    proximoPagamento: { type: Date },
    criadoPor: { type: String },
    atualizadoPor: { type: String }
  },
  { timestamps: true }
);

// =============================================
// MÉTODOS DO FORNECEDOR
// =============================================

// Calcular valor líquido com retenção
fornecedorSchema.methods.calcularValorLiquido = function(valorBruto) {
  let valorLiquido = valorBruto;
  let taxaRetencao = 0;
  let valorRetencao = 0;
  
  if (this.fiscal && this.fiscal.retencaoFonte) {
    if (this.fiscal.taxaRetencao && this.fiscal.taxaRetencao > 0) {
      taxaRetencao = this.fiscal.taxaRetencao;
    } else if (this.fiscal.tipoRetencao === 'Renda') {
      taxaRetencao = 15;
    } else if (this.fiscal.tipoRetencao === 'Serviços') {
      taxaRetencao = 6.5;
    }
    
    valorRetencao = (valorBruto * taxaRetencao) / 100;
    valorLiquido = valorBruto - valorRetencao;
  }
  
  return { valorLiquido, taxaRetencao, valorRetencao };
};

// Associar item ao fornecedor
fornecedorSchema.methods.associarItem = async function(itemData, usuario) {
  try {
    const itemCompleto = {
      ...itemData,
      usuario,
      dataRegisto: new Date()
    };
    
    this.itensFornecidos.push(itemCompleto);
    
    // Atualizar estatísticas
    this.estatisticasCompras.totalCompras += 1;
    this.estatisticasCompras.totalGasto += itemData.valorTotal || itemData.valor || 0;
    this.estatisticasCompras.ultimaCompra = new Date();
    
    await this.save();
    console.log(`✅ Item associado ao fornecedor ${this.nome}`);
    
    return { sucesso: true, item: itemCompleto };
  } catch (error) {
    console.error(`❌ Erro ao associar item:`, error.message);
    return { sucesso: false, erro: error.message };
  }
};

// Registrar compra de produto (para compatibilidade)
fornecedorSchema.methods.registrarCompra = async function(produtoId, quantidade, precoUnitario, numeroFactura, usuario) {
  try {
    const Stock = mongoose.model('Stock');
    const produto = await Stock.findById(produtoId);
    
    if (!produto) {
      return { sucesso: false, erro: 'Produto não encontrado' };
    }
    
    // Atualizar stock
    produto.quantidade += quantidade;
    produto.precoCompra = precoUnitario;
    produto.ultimoFornecedor = this._id;
    produto.dataUltimaEntrada = new Date();
    
    produto.historicoMovimentacoes = produto.historicoMovimentacoes || [];
    produto.historicoMovimentacoes.push({
      data: new Date(),
      tipo: 'entrada',
      quantidade: quantidade,
      quantidadeAnterior: produto.quantidade - quantidade,
      quantidadeNova: produto.quantidade,
      motivo: `Compra do fornecedor ${this.nome}`,
      usuario: usuario,
      fornecedorId: this._id,
      precoUnitario: precoUnitario,
      numeroFactura: numeroFactura
    });
    
    await produto.save();
    
    // Atualizar estatísticas do fornecedor
    const valorTotal = quantidade * precoUnitario;
    this.estatisticasCompras.totalCompras = (this.estatisticasCompras.totalCompras || 0) + 1;
    this.estatisticasCompras.totalGasto = (this.estatisticasCompras.totalGasto || 0) + valorTotal;
    this.estatisticasCompras.ultimaCompra = new Date();
    this.estatisticasCompras.quantidadeTotalProdutos = (this.estatisticasCompras.quantidadeTotalProdutos || 0) + quantidade;
    await this.save();
    
    return { 
      sucesso: true, 
      produto, 
      valorTotal,
      estatisticas: this.estatisticasCompras 
    };
    
  } catch (error) {
    console.error(`❌ Erro ao registrar compra:`, error.message);
    return { sucesso: false, erro: error.message };
  }
};

// =============================================
// ÍNDICES
// =============================================
fornecedorSchema.index({ empresaId: 1, nif: 1 }, { unique: true });
fornecedorSchema.index({ empresaId: 1, tipoFornecedor: 1 });
fornecedorSchema.index({ nome: 1 });
fornecedorSchema.index({ status: 1 });
fornecedorSchema.index({ 'contratos.dataFim': 1 });
fornecedorSchema.index({ proximoPagamento: 1 });

module.exports = mongoose.model("Fornecedor", fornecedorSchema);