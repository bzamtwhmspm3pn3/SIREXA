const mongoose = require('mongoose');

const FuncionarioSchema = new mongoose.Schema({
  // Dados Pessoais
  nome: { type: String, required: true },
  nif: { type: String, required: true },              
  dataNascimento: { type: Date },
  genero: { type: String, enum: ['Masculino', 'Feminino', 'Outro'] },
  estadoCivil: { type: String, enum: ['Solteiro', 'Casado', 'Divorciado', 'Viúvo'] },
  nacionalidade: { type: String, default: 'Angolana' },
  foto: { type: String, default: null },
  
  email: { type: String },
  telefone: { type: String },
  endereco: { type: String },
  
  funcao: { type: String, required: true },
  departamento: { type: String },
  dataAdmissao: { type: Date, default: Date.now },
  dataDemissao: { type: Date },
  status: { type: String, enum: ['Ativo', 'Inativo', 'Licença'], default: 'Ativo' },
  
  salarioBase: { type: Number, required: true },
  tipoContrato: { type: String, enum: ['Efetivo', 'Estágio', 'Temporário'], default: 'Efetivo' },
  
  banco: { type: String },
  numeroConta: { type: String },
  iban: { type: String },
  titularConta: { type: String },
  
  grupoIRT: { type: String, enum: ['A', 'B'], default: 'A' },
  dependentes: { type: Number, default: 0 },
  
  horasSemanais: { type: Number, default: 40 },
  horasDiarias: { type: Number, default: 8 },
  
  contribuiINSS: { type: Boolean, default: true },
  
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  empresaNome: { type: String, required: true },
  
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tecnico' },
  isTecnico: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índice composto: NIF deve ser único dentro da mesma empresa
FuncionarioSchema.index({ empresaId: 1, nif: 1 }, { unique: true });

FuncionarioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.Funcionario || mongoose.model('Funcionario', FuncionarioSchema);