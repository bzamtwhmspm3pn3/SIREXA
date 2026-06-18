const mongoose = require('mongoose');

const CompetenciaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String },
  categoria: { type: String, enum: ['Tecnica', 'Comportamental', 'Idiomas', 'Lideranca', 'Gestao', 'Digital', 'Outros'], default: 'Tecnica' },
  nivelEsperado: { type: String, enum: ['Basico', 'Intermediario', 'Avancado', 'Expert'], default: 'Intermediario' },
  certificacaoObrigatoria: { type: Boolean, default: false },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CompetenciaSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const CompetenciaFuncionarioSchema = new mongoose.Schema({
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String },
  competenciaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competencia', required: true },
  competenciaNome: { type: String },
  nivelAtual: { type: String, enum: ['Basico', 'Intermediario', 'Avancado', 'Expert'], default: 'Basico' },
  nivelDesejado: { type: String, enum: ['Basico', 'Intermediario', 'Avancado', 'Expert'] },
  ultimaAvaliacao: { type: Date },
  formaAquisicao: { type: String, enum: ['Formacao', 'Experiencia', 'Certificacao', 'AutoDidata'], default: 'Experiencia' },
  observacoes: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CompetenciaFuncionarioSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
CompetenciaFuncionarioSchema.index({ funcionarioId: 1, competenciaId: 1 }, { unique: true });

module.exports = {
  Competencia: mongoose.models.Competencia || mongoose.model('Competencia', CompetenciaSchema),
  CompetenciaFuncionario: mongoose.models.CompetenciaFuncionario || mongoose.model('CompetenciaFuncionario', CompetenciaFuncionarioSchema)
};
