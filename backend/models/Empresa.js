// backend/models/Empresa.js
const mongoose = require('mongoose');

const EnderecoSchema = new mongoose.Schema({
  rua: { type: String, default: '' },
  numero: { type: String, default: '' },
  bairro: { type: String, default: '' },
  cidade: { type: String, default: '' },
  provincia: { type: String, default: '' },
  pais: { type: String, default: 'Angola' },
  codigoPostal: { type: String, default: '' }
});

const ContactoSchema = new mongoose.Schema({
  email: { type: String, default: '' },
  telefone: { type: String, default: '' },
  telefoneAlternativo: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  website: { type: String, default: '' }
});

const EmpresaSchema = new mongoose.Schema({
  // Informações Básicas
  nome: { type: String, required: true },
  nomeComercial: { type: String, default: '' },
  nif: { type: String, required: true, unique: true },
  regimeIva: { type: String, enum: ['Normal', 'Isento', 'Não Sujeito'], default: 'Normal' },
  
  // Gestor
  gestorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gestor', default: null },
  gestorNome: { type: String, default: '' },
  
  // Endereço
  endereco: { type: EnderecoSchema, default: () => ({}) },
  
  // Contactos
  contactos: { type: ContactoSchema, default: () => ({}) },
  
  // Informações Corporativas
  objetoSocial: { type: String, default: '' },
  dataConstituicao: { type: Date, default: null },
  capitalSocial: { type: Number, default: 0 },
  numeroFuncionarios: { type: Number, default: 0 },
  servicos: { type: [String], default: [] },
  
  // Informações Bancárias
  banco: { type: String, default: '' },
  iban: { type: String, default: '' },
  swift: { type: String, default: '' },
  
  // Informações Fiscais
  caed: { type: String, default: '' }, // Código de Atividade Económica
  regimeTributario: { type: String, default: '' },
  
  // ============================================
  // CONFIGURAÇÕES DE INSS (Segurança Social)
  // ============================================
  
  // Indica se a empresa é de baixos rendimentos (INSS reduzido)
  isBaixosRendimentos: {
    type: Boolean,
    default: false
  },
  
  // Regime INSS (normal = 3%/8%, baixos_rendimentos = 1.5%/4%)
  regimeINSS: {
    type: String,
    enum: ['normal', 'baixos_rendimentos'],
    default: 'normal'
  },
  
  // Taxa INSS do colaborador (pode ser personalizada)
  inssColaboradorTaxa: {
    type: Number,
    default: 0.03,  // 3% padrão
    min: 0,
    max: 1
  },
  
  // Taxa INSS do empregador (pode ser personalizada)
  inssEmpregadorTaxa: {
    type: Number,
    default: 0.08,  // 8% padrão
    min: 0,
    max: 1
  },
  
  // Limite para considerar baixos rendimentos (padrão: 350.000 Kz)
  limiteBaixosRendimentos: {
    type: Number,
    default: 350000
  },
  
  // ============================================
  // CONFIGURAÇÕES DE IRT
  // ============================================
  
  // Tipo de cálculo IRT padrão (progressivo ou fixo)
  irtTipoCalculo: {
    type: String,
    enum: ['progressivo', 'fixo'],
    default: 'progressivo'
  },
  
  // Taxa IRT fixa para empresas que usam regime especial
  irtTaxaFixa: {
    type: Number,
    default: 0.065,  // 6.5%
    min: 0,
    max: 1
  },
  
  // ============================================
  // IVA
  // ============================================
  taxaIVA: {
    type: Number,
    default: 14,
    min: 0,
    max: 100
  },
  incluiIVA: {
    type: Boolean,
    default: true
  },
  incluiRetencao: {
    type: Boolean,
    default: false
  },
  taxaRetencao: {
    type: Number,
    default: 7,
    min: 0,
    max: 100
  },
  
  // Documentos
  logotipo: { type: String, default: null },
  alvara: { type: String, default: null },
  
  // Status
  ativo: { type: Boolean, default: true },
  
  // Datas
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Índices para busca
EmpresaSchema.index({ nome: 'text', nif: 'text', 'contactos.email': 'text' });

// Middleware para atualizar updatedAt
EmpresaSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual para saber se tem INSS reduzido
EmpresaSchema.virtual('hasINSSReduzido').get(function() {
  return this.isBaixosRendimentos || this.regimeINSS === 'baixos_rendimentos';
});

// Virtual para obter descrição do regime INSS
EmpresaSchema.virtual('descricaoRegimeINSS').get(function() {
  if (this.isBaixosRendimentos || this.regimeINSS === 'baixos_rendimentos') {
    return `Baixos Rendimentos (${this.inssColaboradorTaxa * 100}% / ${this.inssEmpregadorTaxa * 100}%)`;
  }
  return `Normal (${this.inssColaboradorTaxa * 100}% / ${this.inssEmpregadorTaxa * 100}%)`;
});

module.exports = mongoose.models.Empresa || mongoose.model('Empresa', EmpresaSchema);