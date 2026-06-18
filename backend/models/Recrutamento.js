const mongoose = require('mongoose');

const CandidaturaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true },
  telefone: { type: String },
  nif: { type: String },
  dataNascimento: { type: Date },
  genero: { type: String },
  foto: { type: String },
  curriculo: { type: String },
  cartaApresentacao: { type: String },
  cargoPretendido: { type: String },
  nivelEscolaridade: { type: String },
  areaFormacao: { type: String },
  experienciaAnos: { type: Number },
  empresaAtual: { type: String },
  salarioPretendido: { type: Number },
  salarioActual: { type: Number },
  disponibilidade: { type: String },
  comoConheceu: { type: String },
  linkedin: { type: String },
  portfolio: { type: String },
  status: { type: String, enum: ['Recebido', 'EmAnalise', 'Entrevista', 'Aprovado', 'Rejeitado', 'Contratado', 'Cancelado'], default: 'Recebido' },
  dataCandidatura: { type: Date, default: Date.now },
  origem: { type: String, enum: ['Site', 'LinkedIn', 'Indicacao', 'Agencia', 'Anuncio', 'Outro'] },
  tags: [String],
  observacoes: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  vagaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vaga' },
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
  criadoPor: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CandidaturaSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const EntrevistaSchema = new mongoose.Schema({
  candidaturaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidatura', required: true },
  candidatoNome: { type: String },
  tipo: { type: String, enum: ['Presencial', 'Video', 'Telefonica', 'Tecnica', 'RH', 'Final'], default: 'Presencial' },
  data: { type: Date, required: true },
  duracao: { type: Number },
  entrevistador: { type: String },
  local: { type: String },
  linkVideo: { type: String },
  pontuacaoGeral: { type: Number, min: 0, max: 100 },
  resultado: { type: String, enum: ['Agendada', 'Realizada', 'Cancelada', 'Remarcada', 'Aprovado', 'Reprovado'], default: 'Agendada' },
  observacoes: { type: String },
  avaliacao: {
    apresentacao: { type: Number, min: 0, max: 10 },
    comunicacao: { type: Number, min: 0, max: 10 },
    experiencia: { type: Number, min: 0, max: 10 },
    formacao: { type: Number, min: 0, max: 10 },
    motivacao: { type: Number, min: 0, max: 10 },
    trabalhosEquipa: { type: Number, min: 0, max: 10 },
    resolucaoProblemas: { type: Number, min: 0, max: 10 }
  },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  criadoPor: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EntrevistaSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const VagaSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  departamento: { type: String },
  local: { type: String },
  tipoContrato: { type: String, enum: ['Efetivo', 'Estagio', 'Temporario', 'TermoCerto', 'PrestacaoServicos'], default: 'Efetivo' },
  regime: { type: String, enum: ['Presencial', 'Remoto', 'Hibrido'], default: 'Presencial' },
  descricao: { type: String },
  requisitos: { type: String },
  responsabilidades: { type: String },
  oferecemos: { type: String },
  salarioMin: { type: Number },
  salarioMax: { type: Number },
  vagasDisponiveis: { type: Number, default: 1 },
  dataAbertura: { type: Date, default: Date.now },
  dataFecho: { type: Date },
  status: { type: String, enum: ['Aberta', 'Pausada', 'Fechada', 'Cancelada'], default: 'Aberta' },
  prioridade: { type: String, enum: ['Baixa', 'Media', 'Alta', 'Urgente'], default: 'Media' },
  publicarExternamente: { type: Boolean, default: false },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  criadoPor: { type: String },
  candidatos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidatura' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

VagaSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const TalentoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true },
  telefone: { type: String },
  nif: { type: String },
  cargo: { type: String },
  nivel: { type: String, enum: ['Junior', 'Pleno', 'Senior', 'Especialista'], default: 'Pleno' },
  competencias: [String],
  experienciaGlobal: { type: Number },
  salarioPretendido: { type: Number },
  curriculo: { type: String },
  notas: { type: String },
  status: { type: String, enum: ['Disponivel', 'EmProcesso', 'Contratado', 'Indisponivel'], default: 'Disponivel' },
  origem: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TalentoSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = {
  Vaga: mongoose.models.Vaga || mongoose.model('Vaga', VagaSchema),
  Candidatura: mongoose.models.Candidatura || mongoose.model('Candidatura', CandidaturaSchema),
  Entrevista: mongoose.models.Entrevista || mongoose.model('Entrevista', EntrevistaSchema),
  Talento: mongoose.models.Talento || mongoose.model('Talento', TalentoSchema)
};
