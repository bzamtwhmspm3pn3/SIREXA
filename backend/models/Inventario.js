// models/Inventario.js
const mongoose = require('mongoose');

const InventarioSchema = new mongoose.Schema({
  // Associação à empresa
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  
  // Código PGCA
  codigo: { type: String, required: true },
  codigoCompleto: { type: String },
  
  // Classificação PGCA
  classe: { type: String, required: true }, // 1, 2, 3, 4, 5, 6, 7, 8
  grupo: { type: String }, // Ex: 3.1, 4.1
  subgrupo: { type: String }, // Ex: 3.1.1, 4.1.1
  item: { type: String }, // Ex: 3.1.1.01
  
  // Tipo de Ativo
  tipoAtivo: { 
    type: String, 
    enum: ['Mercadoria', 'Imobilizado', 'Intangivel', 'Financeiro', 'Outros'],
    required: true 
  },
  
  // Categoria específica
  categoria: { 
    type: String, 
    enum: [
      'Produtos Alimentares', 'Produtos Não Alimentares', 'Matérias-Primas',
      'Viaturas', 'Equipamentos', 'Mobiliário', 'Imóveis', 'Software',
      'Patentes', 'Investimentos', 'Outros'
    ],
    required: true 
  },
  
  // Dados do Item
  nome: { type: String, required: true },
  descricao: { type: String },
  marca: { type: String },
  modelo: { type: String },
  
  // Dados de Quantidade e Valor
  quantidade: { type: Number, default: 0, min: 0 },
  unidade: { type: String, default: 'Unidade' },
  valorUnitario: { type: Number, required: true, min: 0 },
  valorTotal: { type: Number, default: 0 },
  valorDepreciado: { type: Number, default: 0 },
  
  // Dados Específicos (dependendo do tipo)
  dadosEspecificos: {
    // Para viaturas
    matricula: { type: String },
    ano: { type: Number },
    km: { type: Number },
    combustivel: { type: String },
    motorista: { type: String },
    ultimaRevisao: { type: Date },
    proximaRevisao: { type: Date },
    
    // Para mercadorias
    dataValidade: { type: Date },
    codigoBarras: { type: String },
    fornecedor: { type: String },
    localizacao: { type: String },
    
    // Para imóveis
    area: { type: Number },
    endereco: { type: String },
    escritura: { type: String },
    
    // Para equipamentos
    numeroSerie: { type: String },
    garantia: { type: Date },
    potencia: { type: String }
  },
  
  // Estado do Ativo
  estado: { 
    type: String, 
    enum: ['Ativo', 'Em manutenção', 'Depreciado', 'Baixado', 'Reserva'],
    default: 'Ativo' 
  },
  
  // Datas de Controle
  dataAquisicao: { type: Date, required: true },
  dataUltimaAtualizacao: { type: Date, default: Date.now },
  dataBaixa: { type: Date },
  motivoBaixa: { type: String },
  
  // Depreciação
  taxaDepreciacao: { type: Number, default: 0 }, // Percentual anual
  vidaUtil: { type: Number }, // em anos
  depreciacaoAcumulada: { type: Number, default: 0 },
  valorResidual: { type: Number, default: 0 },
  
  // Controle
  responsavel: { type: String },
  localizacao: { type: String },
  observacoes: { type: String },
  imagemUrl: { type: String },
  
  // Auditoria
  criadoPor: { type: String },
  atualizadoPor: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índices compostos para garantir unicidade por empresa
InventarioSchema.index({ empresaId: 1, codigo: 1 }, { unique: true });
InventarioSchema.index({ empresaId: 1, codigoCompleto: 1 }, { unique: true, sparse: true });
InventarioSchema.index({ empresaId: 1, nome: 1 });
InventarioSchema.index({ empresaId: 1, tipoAtivo: 1 });
InventarioSchema.index({ empresaId: 1, categoria: 1 });
InventarioSchema.index({ empresaId: 1, estado: 1 });
InventarioSchema.index({ empresaId: 1, 'dadosEspecificos.matricula': 1 }, { sparse: true });
InventarioSchema.index({ empresaId: 1, 'dadosEspecificos.codigoBarras': 1 }, { sparse: true });

// Virtuals
InventarioSchema.virtual('depreciacaoMensal').get(function() {
  if (!this.vidaUtil || this.vidaUtil === 0) return 0;
  return (this.valorUnitario / (this.vidaUtil * 12)).toFixed(2);
});

InventarioSchema.virtual('valorAtual').get(function() {
  return this.valorUnitario - this.depreciacaoAcumulada;
});

// Método para calcular depreciação
InventarioSchema.methods.calcularDepreciacao = function() {
  if (!this.vidaUtil || this.vidaUtil <= 0) return 0;
  
  const anosDesdeAquisicao = (new Date() - this.dataAquisicao) / (1000 * 60 * 60 * 24 * 365);
  const depreciacaoAnual = this.valorUnitario / this.vidaUtil;
  const depreciacaoCalculada = depreciacaoAnual * Math.min(anosDesdeAquisicao, this.vidaUtil);
  
  this.depreciacaoAcumulada = Math.min(depreciacaoCalculada, this.valorUnitario);
  this.valorDepreciado = this.valorUnitario - this.depreciacaoAcumulada;
  
  return this.depreciacaoAcumulada;
};

// Middleware para atualizar valorTotal e dataUltimaAtualizacao
InventarioSchema.pre('save', function(next) {
  // Calcular valor total
  this.valorTotal = (this.quantidade || 0) * (this.valorUnitario || 0);
  
  // Atualizar data
  this.updatedAt = new Date();
  
  // Calcular depreciação se aplicável
  if (this.tipoAtivo === 'Imobilizado' && this.vidaUtil) {
    this.calcularDepreciacao();
  }
  
  next();
});

// Middleware para atualização
InventarioSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.models.Inventario || mongoose.model('Inventario', InventarioSchema);