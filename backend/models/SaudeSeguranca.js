const mongoose = require('mongoose');

const ExameMedicoSchema = new mongoose.Schema({
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String },
  tipo: { type: String, enum: ['Admissional', 'Periodico', 'Demissional', 'RetornoTrabalho', 'MudancaFuncao'], required: true },
  dataRealizacao: { type: Date, required: true },
  dataValidade: { type: Date },
  medico: { type: String },
  clinica: { type: String },
  resultado: { type: String, enum: ['Apto', 'AptoComRestricoes', 'Inapto'], default: 'Apto' },
  restricoes: { type: String },
  observacoes: { type: String },
  arquivo: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ExameMedicoSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const AcidenteTrabalhoSchema = new mongoose.Schema({
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String },
  data: { type: Date, required: true },
  hora: { type: String },
  local: { type: String },
  tipo: { type: String, enum: ['Tipico', 'Trajeto', 'DoencaProfissional'], default: 'Tipico' },
  descricao: { type: String, required: true },
  causas: { type: String },
  parteAtingida: { type: String },
  gravidade: { type: String, enum: ['Leve', 'Moderada', 'Grave', 'Fatal'], default: 'Leve' },
  diasAfastamento: { type: Number },
  afastado: { type: Boolean, default: false },
  dataRetorno: { type: Date },
  comunicadoAutoridades: { type: Boolean, default: false },
  medidasCorretivas: { type: String },
  observacoes: { type: String },
  anexos: [{ nome: String, arquivo: String }],
  status: { type: String, enum: ['Registado', 'EmInvestigacao', 'Concluido'], default: 'Registado' },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

AcidenteTrabalhoSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const EPISchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String },
  categoria: { type: String, enum: ['Cabeca', 'Olhos', 'Audicao', 'Respiratorio', 'Maos', 'Pes', 'Corpo', 'Altura'], default: 'Corpo' },
  quantidade: { type: Number, default: 0 },
  quantidadeMinima: { type: Number, default: 5 },
  unidade: { type: String, default: 'Unidade' },
  fornecedor: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EPISchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const EPIEntregaSchema = new mongoose.Schema({
  epiId: { type: mongoose.Schema.Types.ObjectId, ref: 'EPI', required: true },
  epiNome: { type: String },
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String },
  quantidade: { type: Number, required: true },
  dataEntrega: { type: Date, default: Date.now },
  dataDevolucao: { type: Date },
  devolvido: { type: Boolean, default: false },
  observacoes: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EPIEntregaSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = {
  ExameMedico: mongoose.models.ExameMedico || mongoose.model('ExameMedico', ExameMedicoSchema),
  AcidenteTrabalho: mongoose.models.AcidenteTrabalho || mongoose.model('AcidenteTrabalho', AcidenteTrabalhoSchema),
  EPI: mongoose.models.EPI || mongoose.model('EPI', EPISchema),
  EPIEntrega: mongoose.models.EPIEntrega || mongoose.model('EPIEntrega', EPIEntregaSchema)
};
