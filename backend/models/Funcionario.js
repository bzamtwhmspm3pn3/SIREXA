// backend/models/Funcionario.js
const mongoose = require('mongoose');

const DocumentoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['BI', 'NIF', 'CartaConducao', 'Passaporte', 'Curriculo', 'Certificado', 'Diploma', 'Contrato', 'Outro'] },
  numero: { type: String },
  emissao: { type: Date },
  validade: { type: Date },
  ficheiro: { type: String },
  observacoes: { type: String }
}, { _id: true });

const ContratoFuncionarioSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['Efetivo', 'Estágio', 'Temporário', 'Termo Certo', 'Termo Incerto', 'Prestacao Servicos'], default: 'Efetivo' },
  dataInicio: { type: Date },
  dataFim: { type: Date },
  dataAssinatura: { type: Date },
  periodoExperimental: { type: String },
  renovaAutomaticamente: { type: Boolean, default: false },
  prazoRenovacao: { type: String },
  ficheiro: { type: String },
  clausulas: { type: String },
  status: { type: String, enum: ['Ativo', 'Expirado', 'Rescindido', 'Renovado'], default: 'Ativo' },
  motivoRescisao: { type: String },
  dataRescisao: { type: Date }
}, { _id: true });

const HistoricoProfissionalSchema = new mongoose.Schema({
  empresa: { type: String },
  cargo: { type: String },
  dataInicio: { type: Date },
  dataFim: { type: Date },
  descricao: { type: String }
}, { _id: true });

const DocumentoIdentificacaoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['BI', 'Passaporte', 'CartaConducao', 'Outro'] },
  numero: { type: String },
  dataEmissao: { type: Date },
  dataValidade: { type: Date },
  arquivo: { type: String }
}, { _id: true });

const FuncionarioSchema = new mongoose.Schema({
  // ==================== DADOS PESSOAIS ====================
  nome: { type: String, required: true },
  nif: { type: String, required: true },
  dataNascimento: { type: Date },
  genero: { type: String, enum: ['Masculino', 'Feminino', 'Outro'] },
  estadoCivil: { type: String, enum: ['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'UniaoFacto'] },
  nacionalidade: { type: String, default: 'Angolana' },
  naturalidade: { type: String },
  foto: { type: String, default: null },
  assinaturaDigital: { type: String },

  // ==================== CONTACTOS ====================
  email: { type: String },
  emailPessoal: { type: String },
  telefone: { type: String },
  telefoneAlternativo: { type: String },
  endereco: { type: String },
  localidade: { type: String },
  provincia: { type: String },

  // ==================== DOCUMENTOS DE IDENTIFICAÇÃO ====================
  documentosIdentificacao: [DocumentoIdentificacaoSchema],
  documentos: [DocumentoSchema],

  // ==================== DADOS PROFISSIONAIS ====================
  funcao: { type: String, required: true },
  departamento: { type: String },
  centroCusto: { type: String },
  dataAdmissao: { type: Date, default: Date.now },
  dataDemissao: { type: Date },
  status: { type: String, enum: ['Ativo', 'Inativo', 'Licenca', 'Ferias', 'Suspenso', 'Demitido'], default: 'Ativo' },
  tipoContrato: { type: String, enum: ['Efetivo', 'Estagio', 'Temporario', 'TermoCerto', 'TermoIncerto', 'PrestacaoServicos'], default: 'Efetivo' },

  // ==================== CONTRATOS ====================
  contratos: [ContratoFuncionarioSchema],
  contratoAtual: { type: mongoose.Schema.Types.ObjectId },

  // ==================== REMUNERAÇÃO ====================
  salarioBase: { type: Number, required: true },
  salarioBruto: { type: Number },
  salarioHora: { type: Number },
  banco: { type: String },
  numeroConta: { type: String },
  iban: { type: String },
  titularConta: { type: String },

  // ==================== IMPOSTOS E SEGURANÇA SOCIAL ====================
  grupoIRT: { type: String, enum: ['A', 'B'], default: 'A' },
  dependentes: { type: Number, default: 0 },
  contribuiINSS: { type: Boolean, default: true },
  regimeINSS: { type: String, enum: ['Normal', 'Reduzido'], default: 'Normal' },
  numeroINSS: { type: String },
  numeroSegurancaSocial: { type: String },

  // ==================== HORÁRIO ====================
  horasSemanais: { type: Number, default: 40 },
  horasDiarias: { type: Number, default: 8 },
  horarioEntrada: { type: String },
  horarioSaida: { type: String },
  horarioIntervalo: { type: String },

  // ==================== DADOS BANCÁRIOS ADICIONAIS ====================
  salarioBanco: { type: String },
  salarioNumeroConta: { type: String },
  salarioIban: { type: String },
  salarioTitular: { type: String },

  // ==================== HISTÓRICO PROFISSIONAL ====================
  historicoProfissional: [HistoricoProfissionalSchema],

  // ==================== FORMAÇÃO ====================
  nivelEscolaridade: { type: String, enum: ['Nenhum', 'Primario', 'Secundario', 'Tecnico', 'Licenciatura', 'Mestrado', 'Doutorado', 'PosDoutorado'] },
  areaFormacao: { type: String },
  instituicaoEnsino: { type: String },

  // ==================== FAMÍLIA ====================
  estadoCivil: { type: String, enum: ['Solteiro', 'Casado', 'Divorciado', 'Viuvo', 'UniaoFacto'] },
  conjugue: { type: String },
  numeroFilhos: { type: Number, default: 0 },
  dependentesDetalhes: [{ nome: String, parentesco: String, dataNascimento: Date }],

  // ==================== SITUAÇÃO MILITAR ====================
  situacaoMilitar: { type: String, enum: ['NaoAplicavel', 'Cumprido', 'Dispensado', 'Isento', 'EmCumprimento'] },
  numeroMilitar: { type: String },

  // ==================== EMERGÊNCIA ====================
  contactoEmergencia: { type: String },
  parentescoEmergencia: { type: String },
  telefoneEmergencia: { type: String },

  // ==================== LINKS DO SISTEMA ====================
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  empresaNome: { type: String, required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tecnico' },
  isTecnico: { type: Boolean, default: false },

  // ==================== MÓDULOS DO TÉCNICO ====================
  modulos: {
    vendas: { type: Boolean, default: false },
    stock: { type: Boolean, default: false },
    facturacao: { type: Boolean, default: false },
    funcionarios: { type: Boolean, default: false },
    folhaSalarial: { type: Boolean, default: false },
    gestaoFaltas: { type: Boolean, default: false },
    gestaoAbonos: { type: Boolean, default: false },
    avaliacao: { type: Boolean, default: false },
    viaturas: { type: Boolean, default: false },
    abastecimentos: { type: Boolean, default: false },
    manutencoes: { type: Boolean, default: false },
    inventario: { type: Boolean, default: false },
    fornecedores: { type: Boolean, default: false },
    fluxoCaixa: { type: Boolean, default: false },
    contaCorrente: { type: Boolean, default: false },
    controloPagamento: { type: Boolean, default: false },
    custosReceitas: { type: Boolean, default: false },
    orcamentos: { type: Boolean, default: false },
    dre: { type: Boolean, default: false },
    indicadores: { type: Boolean, default: false },
    transferencias: { type: Boolean, default: false },
    reconciliacao: { type: Boolean, default: false },
    relatorios: { type: Boolean, default: false },
    graficos: { type: Boolean, default: false },
    analise: { type: Boolean, default: false },
    contabilidade: { type: Boolean, default: false },
    planoContas: { type: Boolean, default: false },
    lancamentos: { type: Boolean, default: false },
    diarioGeral: { type: Boolean, default: false },
    razaoGeral: { type: Boolean, default: false },
    balancete: { type: Boolean, default: false },
    saldosContas: { type: Boolean, default: false },
    balancoPatrimonial: { type: Boolean, default: false },
    periodosFiscais: { type: Boolean, default: false },
    encerramento: { type: Boolean, default: false }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índice composto: NIF deve ser único dentro da mesma empresa
FuncionarioSchema.index({ empresaId: 1, nif: 1 }, { unique: true });

FuncionarioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Método para verificar se o funcionário tem um módulo específico
FuncionarioSchema.methods.temModulo = function(modulo) {
  if (!this.isTecnico) return false;
  if (this.modulos && this.modulos[modulo] === true) return true;
  // Se tiver acesso geral à contabilidade, tem acesso a todos os submódulos
  if (modulo.startsWith('contabilidade/') && this.modulos?.contabilidade === true) return true;
  return false;
};

// Método para listar módulos ativos
FuncionarioSchema.methods.modulosAtivos = function() {
  if (!this.isTecnico) return [];
  const ativos = [];
  for (const [modulo, ativo] of Object.entries(this.modulos || {})) {
    if (ativo) ativos.push(modulo);
  }
  return ativos;
};

module.exports = mongoose.models.Funcionario || mongoose.model('Funcionario', FuncionarioSchema);