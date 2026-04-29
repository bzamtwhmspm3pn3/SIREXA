const mongoose = require('mongoose');

const FaltaSchema = new mongoose.Schema({
  // Identificação
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String, required: true },
  funcionarioNif: { type: String },
  departamento: { type: String },
  cargo: { type: String },
  
  // Dados da falta
  dataInicio: { type: Date, required: true },
  dataFim: { type: Date, required: true },
  dataFalta: { type: Date, required: true }, // Para compatibilidade
  horaEntrada: { type: String },
  horaSaida: { type: String },
  horasFalta: { type: Number, default: 0 },
  diasFalta: { type: Number, default: 1 },
  
  // Classificação
  tipoFalta: { 
    type: String, 
    enum: ['Doença', 'Férias', 'Licença', 'Atraso', 'Falta Injustificada', 'Falta Justificada', 'Formação', 'Luto', 'Casamento', 'Outro'],
    default: 'Falta Injustificada'
  },
  motivo: { type: String, required: true },
  observacao: { type: String },
  
  // Status
  status: { 
    type: String, 
    enum: ['Pendente', 'Aprovado', 'Rejeitado', 'Em análise'],
    default: 'Pendente'
  },
  justificada: { type: Boolean, default: false },
  
  // Documentos comprovativos
  documentoUrl: { type: String },
  atestadoMedico: { type: Boolean, default: false },
  
  // Impacto financeiro
  descontoSalario: { type: Number, default: 0 },
  subsidioAlimentacao: { type: Number, default: 0 },
  impactoFolha: { type: Boolean, default: false },
  
  // Origem do registro
  origem: { 
    type: String, 
    enum: ['Manual', 'Biometrico', 'CSV', 'API'],
    default: 'Manual'
  },
  biometricoId: { type: String }, // ID do registro no sistema biométrico
  
  // Controlo
  registradoPor: { type: String },
  registradoPorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dataRegisto: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now },
  
  // Empresa
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índices para otimização
FaltaSchema.index({ funcionarioId: 1, dataInicio: 1 });
FaltaSchema.index({ empresaId: 1, dataFalta: 1 });
FaltaSchema.index({ status: 1, tipoFalta: 1 });
FaltaSchema.index({ origem: 1 });

module.exports = mongoose.models.Falta || mongoose.model('Falta', FaltaSchema);