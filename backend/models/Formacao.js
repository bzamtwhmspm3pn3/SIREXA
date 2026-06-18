const mongoose = require('mongoose');

const CursoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String },
  tipo: { type: String, enum: ['Presencial', 'Online', 'EAD', 'Workshop', 'Seminario', 'CursoLivre', 'PosGraduacao', 'MBA'], default: 'CursoLivre' },
  categoria: { type: String, enum: ['Tecnica', 'Comportamental', 'Gestao', 'Idiomas', 'Seguranca', 'Outros'], default: 'Tecnica' },
  cargaHoraria: { type: Number },
  nivel: { type: String, enum: ['Basico', 'Intermediario', 'Avancado'], default: 'Basico' },
  instituicao: { type: String },
  instrutor: { type: String },
  dataInicio: { type: Date },
  dataFim: { type: Date },
  custo: { type: Number },
  modalidadeCusto: { type: String, enum: ['Gratuito', 'Pago', 'Reembolsavel', 'Comparticipado'], default: 'Pago' },
  percentualComparticipacao: { type: Number, default: 100 },
  conteudo: { type: String },
  certificadoEmite: { type: Boolean, default: false },
  vagas: { type: Number },
  vagasDisponiveis: { type: Number },
  status: { type: String, enum: ['Planeado', 'EmAndamento', 'Concluido', 'Cancelado'], default: 'Planeado' },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  criadoPor: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CursoSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const InscricaoSchema = new mongoose.Schema({
  cursoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true },
  cursoNome: { type: String },
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String },
  dataInscricao: { type: Date, default: Date.now },
  status: { type: String, enum: ['Inscrito', 'EmAndamento', 'Concluido', 'Reprovado', 'Cancelado', 'Desistente'], default: 'Inscrito' },
  notaFinal: { type: Number },
  aprovado: { type: Boolean },
  certificado: { type: String },
  dataConclusao: { type: Date },
  feedback: { type: String },
  avaliacaoCurso: { type: Number, min: 0, max: 5 },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

InscricaoSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const CertificacaoSchema = new mongoose.Schema({
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String },
  nome: { type: String, required: true },
  entidade: { type: String },
  dataObtencao: { type: Date },
  dataValidade: { type: Date },
  numeroCertificado: { type: String },
  arquivo: { type: String },
  tipo: { type: String, enum: ['Profissional', 'Academica', 'Idiomas', 'Tecnica', 'Outros'], default: 'Profissional' },
  nivel: { type: String },
  obrigatoria: { type: Boolean, default: false },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CertificacaoSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = {
  Curso: mongoose.models.Curso || mongoose.model('Curso', CursoSchema),
  Inscricao: mongoose.models.Inscricao || mongoose.model('Inscricao', InscricaoSchema),
  Certificacao: mongoose.models.Certificacao || mongoose.model('Certificacao', CertificacaoSchema)
};
