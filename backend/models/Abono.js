const mongoose = require('mongoose');

const AbonoSchema = new mongoose.Schema({
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String, required: true },
  funcionarioNif: { type: String },
  departamento: { type: String },
  cargo: { type: String },
  salarioBase: { type: Number }, // Para validação de limites
  
  // Dados do abono
  tipoAbono: { 
    type: String, 
    enum: ['Subsídio de Alimentação', 'Subsídio de Transporte', 'Subsídio de Férias', 
           'Décimo Terceiro', 'Bónus', 'Prémio', 'Ajuda de Custo', 
           'Abono Especial', 'Outro'],
    required: true 
  },
  valor: { type: Number, required: true },
  valorIsento: { type: Number, default: 0 },  // Valor isento de impostos
  valorTributavel: { type: Number, default: 0 }, // Valor sujeito a impostos
  
  // Para Subsídio de Férias específico
  percentualFerias: { type: Number, default: 0 }, // Percentual aplicado (ex: 100, 50)
  diasFerias: { type: Number, default: 0 },
  periodoAquisitivo: { type: String }, // Ex: "2024-01 a 2024-12"
  
  // Para Subsídio de Alimentação
  diasTrabalhados: { type: Number, default: 22 },
  valorDiario: { type: Number, default: 2500 },
  
  // Período de referência
  dataReferencia: { type: Date, default: Date.now },
  dataInicio: { type: Date },
  dataFim: { type: Date },
  
  // Descrição e justificativa
  descricao: { type: String },
  motivo: { type: String },
  observacao: { type: String },
  
  // Status
  status: { 
    type: String, 
    enum: ['Pendente', 'Aprovado', 'Pago', 'Cancelado', 'Integrado'],
    default: 'Pendente'
  },
  
  // Integração com folha salarial
  integradoFolha: { type: Boolean, default: false },
  folhaId: { type: mongoose.Schema.Types.ObjectId, ref: 'FolhaSalarial' },
  mesReferencia: { type: Number },
  anoReferencia: { type: Number },
  
  // Controlo
  criadoPor: { type: String },
  criadoPorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índices
AbonoSchema.index({ funcionarioId: 1, dataAbono: -1 });
AbonoSchema.index({ empresaId: 1, tipoAbono: 1 });
AbonoSchema.index({ status: 1, integradoFolha: 1 });

module.exports = mongoose.models.Abono || mongoose.model('Abono', AbonoSchema);