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
  
  isBaixosRendimentos: {
    type: Boolean,
    default: false
  },
  
  regimeINSS: {
    type: String,
    enum: ['normal', 'baixos_rendimentos'],
    default: 'normal'
  },
  
  inssColaboradorTaxa: {
    type: Number,
    default: 0.03,
    min: 0,
    max: 1
  },
  
  inssEmpregadorTaxa: {
    type: Number,
    default: 0.08,
    min: 0,
    max: 1
  },
  
  limiteBaixosRendimentos: {
    type: Number,
    default: 350000
  },
  
  // ============================================
  // CONFIGURAÇÕES DE IRT
  // ============================================
  
  irtTipoCalculo: {
    type: String,
    enum: ['progressivo', 'fixo'],
    default: 'progressivo'
  },
  
  irtTaxaFixa: {
    type: Number,
    default: 0.065,
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
  
  // ============================================
  // 🔥 NOVOS CAMPOS PARA LICENÇA E COMERCIALIZAÇÃO
  // ============================================
  
  // Licença
  licencaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Licenca', default: null },
  plano: { 
  type: String, 
  enum: ['trial', 'basico', 'profissional', 'empresarial', 'enterprise', 'FREE', 'BÁSICO', 'PROFISSIONAL', 'EMPRESARIAL', 'PLATINUM'], 
  default: 'trial' 
},
  dataAtivacao: { type: Date, default: Date.now },
  dataExpiracaoLicenca: { type: Date, default: null },
  
  // Status da licença
  statusLicenca: { 
    type: String, 
    enum: ['ativa', 'expirada', 'suspensa', 'trial'], 
    default: 'trial' 
  },
  
  // Módulos habilitados (sobrescreve os da licença se necessário)
  modulosHabilitados: {
    stock: { type: Boolean, default: true },
    fornecedores: { type: Boolean, default: true },
    gestaoCompras: { type: Boolean, default: true },
    rh: { type: Boolean, default: false },
    rhAvancado: { type: Boolean, default: false },
    contabilidade: { type: Boolean, default: false },
    financas: { type: Boolean, default: false },
    relatorios: { type: Boolean, default: true },
    dashboard: { type: Boolean, default: true },
    config: { type: Boolean, default: true },
    manutencoes: { type: Boolean, default: false },
    abastecimentos: { type: Boolean, default: false },
    viaturas: { type: Boolean, default: false }
  },
  
  // Limites da empresa
  limites: {
    maxUsuarios: { type: Number, default: 1 },
    maxFuncionarios: { type: Number, default: 5 },
    maxProdutos: { type: Number, default: 100 },
    maxFornecedores: { type: Number, default: 20 },
    maxClientes: { type: Number, default: 50 },
    espacoArmazenamento: { type: Number, default: 100 } // MB
  },

  modulosAtivos: { 
    type: [String], 
    default: ['stock', 'fornecedores'] 
  },
  
  // Datas
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Índices para busca
EmpresaSchema.index({ nome: 'text', nif: 'text', 'contactos.email': 'text' });
EmpresaSchema.index({ licencaId: 1 });
EmpresaSchema.index({ plano: 1 });
EmpresaSchema.index({ statusLicenca: 1 });

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

// 🔥 Virtual para verificar se licença está ativa
EmpresaSchema.virtual('licencaAtiva').get(function() {
  if (this.statusLicenca !== 'ativa') return false;
  if (this.dataExpiracaoLicenca && new Date() > this.dataExpiracaoLicenca) return false;
  return true;
});

// 🔥 Virtual para dias restantes de licença
EmpresaSchema.virtual('diasRestantesLicenca').get(function() {
  if (!this.dataExpiracaoLicenca) return null;
  const diff = this.dataExpiracaoLicenca - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.models.Empresa || mongoose.model('Empresa', EmpresaSchema);