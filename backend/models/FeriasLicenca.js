const mongoose = require('mongoose');

const FeriasLicencaSchema = new mongoose.Schema({
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String, required: true },
  funcionarioNif: { type: String },
  departamento: { type: String },
  cargo: { type: String },
  tipo: { type: String, enum: [
    'Ferias', 'LicencaMedica', 'LicencaMaternidade', 'LicencaPaternidade',
    'LicencaCasamento', 'LicencaLuto', 'LicencaFormacao', 'AusenciaJustificada',
    'LicencaSemVencimento', 'LicencaPessoal', 'Outro'
  ], required: true },
  dataInicio: { type: Date, required: true },
  dataFim: { type: Date, required: true },
  dataRetorno: { type: Date },
  diasSolicitados: { type: Number, required: true },
  diasUteis: { type: Number },
  diasCorridos: { type: Number },
  periodoAquisitivo: { type: String },
  saldoFerias: { type: Number },
  motivo: { type: String },
  observacao: { type: String },
  documentoMedico: { type: String },
  status: { type: String, enum: ['Pendente', 'Aprovado', 'Rejeitado', 'Cancelado', 'Gozando', 'Concluido'], default: 'Pendente' },
  aprovadoPor: { type: String },
  dataAprovacao: { type: Date },
  paga: { type: Boolean, default: true },
  valorPago: { type: Number },
  integradoFolha: { type: Boolean, default: false },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

FeriasLicencaSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
FeriasLicencaSchema.index({ funcionarioId: 1, dataInicio: -1 });
FeriasLicencaSchema.index({ empresaId: 1, status: 1 });

module.exports = mongoose.models.FeriasLicenca || mongoose.model('FeriasLicenca', FeriasLicencaSchema);
