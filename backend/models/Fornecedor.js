const mongoose = require("mongoose");

// Schema de Contrato
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
  observacoes: { type: String, default: "" }
});

// Schema de Produto/Serviço Fornecido
const itemFornecidoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['mercadoria', 'manutencao', 'abastecimento', 'equipamento', 'servicoProfissional', 'renda', 'internet', 'servicoGeral'], required: true },
  descricao: { type: String },
  valor: { type: Number, default: 0 },
  valorTotal: { type: Number, default: 0 },
  produto: { type: String },
  quantidade: { type: Number, default: 0 },
  unidadeMedida: { type: String, default: 'Unidade' },
  precoCompra: { type: Number, default: 0 },
  precoVenda: { type: Number, default: 0 },
  dataRegisto: { type: Date, default: Date.now },
  usuario: { type: String }
});

// Schema de Produto Info (para mercadoria)
const produtoInfoSchema = new mongoose.Schema({
  produto: { type: String, required: true },
  codigoBarras: { type: String, default: "" },
  codigoInterno: { type: String, default: "" },
  categoria: { type: String, default: "Geral" },
  marca: { type: String, default: "" },
  unidadeMedida: { type: String, default: "Unidade" },
  precoCompra: { type: Number, default: 0 },
  precoVenda: { type: Number, default: 0 },
  quantidade: { type: Number, default: 0 },
  quantidadeMinima: { type: Number, default: 5 },
  dataValidade: { type: Date },
  armazem: { type: String, default: "Principal" },
  numeroLote: { type: String, default: "" },
  taxaIVA: { type: Number, default: 14 },
  observacoes: { type: String, default: "" },
  stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' }
});

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
    
    // Tipo de fornecedor (mercadoria, servico, renda, internet, outro)
    tipoFornecedor: { 
      type: String, 
      enum: ['mercadoria', 'manutencao', 'abastecimento', 'equipamento', 'servicoProfissional', 'renda', 'internet', 'servicoGeral'],
      default: 'servicoGeral'
    },
    tipoServico: { type: String, default: "" },
    natureza: { type: String },
    
    // Informações do produto (se for mercadoria)
    produtoInfo: produtoInfoSchema,
    
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
    
    // Itens fornecidos
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

// Middleware para calcular próximo pagamento
fornecedorSchema.pre('save', function(next) {
  if (!this.contratos || this.contratos.length === 0) {
    this.proximoPagamento = null;
    return next();
  }
  
  const hoje = new Date();
  const pagamentosFuturos = [];
  
  for (const contrato of this.contratos) {
    const dataFim = new Date(contrato.dataFim);
    if (dataFim < hoje) continue;
    
    if (contrato.modalidadePagamento === 'Único') continue;
    
    if (!contrato.proximoPagamento || new Date(contrato.proximoPagamento) <= hoje) {
      const diaPagamento = contrato.diaPagamento || 15;
      let proximoPagamento = new Date(hoje);
      
      switch (contrato.modalidadePagamento) {
        case 'Mensal':
          proximoPagamento.setDate(diaPagamento);
          if (proximoPagamento <= hoje) {
            proximoPagamento.setMonth(proximoPagamento.getMonth() + 1);
          }
          break;
        default:
          proximoPagamento = null;
      }
      
      if (proximoPagamento && proximoPagamento <= dataFim) {
        contrato.proximoPagamento = proximoPagamento;
      }
    }
    
    if (contrato.proximoPagamento && new Date(contrato.proximoPagamento) > hoje) {
      pagamentosFuturos.push(new Date(contrato.proximoPagamento));
    }
  }
  
  if (pagamentosFuturos.length > 0) {
    pagamentosFuturos.sort((a, b) => a - b);
    this.proximoPagamento = pagamentosFuturos[0];
  } else {
    this.proximoPagamento = null;
  }
  
  next();
});

// Índices
fornecedorSchema.index({ empresaId: 1, nif: 1 }, { unique: true });
fornecedorSchema.index({ empresaId: 1, tipoFornecedor: 1 });
fornecedorSchema.index({ nome: 1 });
fornecedorSchema.index({ status: 1 });
fornecedorSchema.index({ 'contratos.dataFim': 1 });
fornecedorSchema.index({ proximoPagamento: 1 });

module.exports = mongoose.model("Fornecedor", fornecedorSchema);