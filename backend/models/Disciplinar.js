const mongoose = require('mongoose');

const DisciplinarSchema = new mongoose.Schema({
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String, required: true },
  departamento: { type: String },
  tipo: { type: String, enum: ['Advertencia', 'AdvertenciaVerbal', 'AdvertenciaEscrita', 'Suspensao', 'Multa', 'DespedimentoPorJustaCausa', 'Outro'], required: true },
  gravidade: { type: String, enum: ['Leve', 'Moderada', 'Grave', 'Gravissima'], default: 'Leve' },
  dataOcorrencia: { type: Date, required: true },
  descricao: { type: String, required: true },
  testemunhas: { type: String },
  provas: [{ nome: String, arquivo: String }],
  decisoesTomadas: { type: String },
  sancao: { type: String },
  dataSancao: { type: Date },
  dataInicioCumprimento: { type: Date },
  dataFimCumprimento: { type: Date },
  status: { type: String, enum: ['Registado', 'EmInvestigacao', 'Concluido', 'Arquivado', 'Recurso'], default: 'Registado' },
  aprovadoPor: { type: String },
  observacoes: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  criadoPor: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

DisciplinarSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
DisciplinarSchema.index({ funcionarioId: 1, dataOcorrencia: -1 });
DisciplinarSchema.index({ empresaId: 1, status: 1 });

module.exports = mongoose.models.Disciplinar || mongoose.model('Disciplinar', DisciplinarSchema);
