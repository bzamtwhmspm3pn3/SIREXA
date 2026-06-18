const mongoose = require('mongoose');

const WorkflowSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  modulo: { type: String },
  tipo: { type: String, enum: ['Ferias', 'Licenca', 'Falta', 'Abono', 'Despesa', 'Formacao', 'Promocao', 'Recrutamento', 'Outro'], default: 'Outro' },
  descricao: { type: String },
  passos: [{
    ordem: { type: Number },
    nome: { type: String },
    tipoAprovador: { type: String, enum: ['Gestor', 'RH', 'Admin', 'Supervisor', 'Especifico'], default: 'Gestor' },
    aprovadorId: { type: mongoose.Schema.Types.ObjectId },
    aprovadorNome: { type: String },
    prazoHoras: { type: Number, default: 48 },
    podeRejeitar: { type: Boolean, default: true },
    podePular: { type: Boolean, default: false }
  }],
  ativo: { type: Boolean, default: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  criadoPor: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

WorkflowSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const AprovacaoSchema = new mongoose.Schema({
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
  modulo: { type: String },
  tipo: { type: String, enum: ['Ferias', 'Licenca', 'Falta', 'Abono', 'Formacao', 'Promocao', 'Recrutamento', 'Outro'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  solicitanteId: { type: mongoose.Schema.Types.ObjectId },
  solicitanteNome: { type: String },
  descricao: { type: String },
  passoAtual: { type: Number, default: 1 },
  historico: [{
    passo: { type: Number },
    aprovadorId: { type: mongoose.Schema.Types.ObjectId },
    aprovadorNome: { type: String },
    decisao: { type: String, enum: ['Pendente', 'Aprovado', 'Rejeitado', 'Pulado'], default: 'Pendente' },
    comentario: { type: String },
    data: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['Pendente', 'EmAprovacao', 'Aprovado', 'Rejeitado', 'Cancelado'], default: 'Pendente' },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  criadoPor: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

AprovacaoSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
AprovacaoSchema.index({ empresaId: 1, status: 1 });
AprovacaoSchema.index({ itemId: 1, modulo: 1 });

module.exports = {
  Workflow: mongoose.models.Workflow || mongoose.model('Workflow', WorkflowSchema),
  Aprovacao: mongoose.models.Aprovacao || mongoose.model('Aprovacao', AprovacaoSchema)
};
