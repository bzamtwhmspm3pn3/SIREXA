const mongoose = require('mongoose');

const FuncionarioSchema = new mongoose.Schema({
  // Dados Pessoais
  nome: { type: String, required: true },
  nif: { type: String, required: true, unique: true },
  dataNascimento: { type: Date },
  genero: { type: String, enum: ['Masculino', 'Feminino', 'Outro'] },
  estadoCivil: { type: String, enum: ['Solteiro', 'Casado', 'Divorciado', 'Viúvo'] },
  nacionalidade: { type: String, default: 'Angolana' },
  foto: { type: String, default: null },
  
  // Dados de Contacto
  email: { type: String },
  telefone: { type: String },
  endereco: { type: String },
  
  // Dados Profissionais
  funcao: { type: String, required: true },  // Alterado de 'cargo' para 'funcao'
  departamento: { type: String },
  dataAdmissao: { type: Date, default: Date.now },
  dataDemissao: { type: Date },
  status: { type: String, enum: ['Ativo', 'Inativo', 'Licença'], default: 'Ativo' },
  
  // Dados Salariais
  salarioBase: { type: Number, required: true },
  tipoContrato: { type: String, enum: ['Efetivo', 'Estágio', 'Temporário'], default: 'Efetivo' },
  
  // Dados Bancários
  banco: { type: String },
  numeroConta: { type: String },
  iban: { type: String },
  titularConta: { type: String },
  
  // Grupo para IRT
  grupoIRT: { type: String, enum: ['A', 'B'], default: 'A' },
  dependentes: { type: Number, default: 0 },
  
  // Horário de Trabalho
  horasSemanais: { type: Number, default: 40 },
  horasDiarias: { type: Number, default: 8 },
  
  // ============================================
  // NOVO CAMPO: Contribuição para Segurança Social (INSS)
  // ============================================
  // Se true: contribui para o INSS (terá desconto no salário)
  // Se false: não contribui para o INSS (não terá desconto)
  contribuiINSS: { type: Boolean, default: true },
  
  // Empresa Associada
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  empresaNome: { type: String, required: true },
  
  // Usuário do sistema
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tecnico' },
  isTecnico: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware para atualizar o updatedAt antes de salvar
FuncionarioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.Funcionario || mongoose.model('Funcionario', FuncionarioSchema);