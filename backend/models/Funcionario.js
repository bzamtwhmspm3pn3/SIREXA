// backend/models/Funcionario.js
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
  
  // ============================================
  // MÓDULOS PARA QUANDO FOR PROMOVIDO A TÉCNICO
  // ============================================
  modulos: {
    // ==================== OPERACIONAL ====================
    vendas: { type: Boolean, default: false },
    stock: { type: Boolean, default: false },
    facturacao: { type: Boolean, default: false },
    
    // ==================== RECURSOS HUMANOS ====================
    funcionarios: { type: Boolean, default: false },
    folhaSalarial: { type: Boolean, default: false },
    gestaoFaltas: { type: Boolean, default: false },
    gestaoAbonos: { type: Boolean, default: false },
    avaliacao: { type: Boolean, default: false },
    
    // ==================== GESTÃO PATRIMONIAL ====================
    viaturas: { type: Boolean, default: false },
    abastecimentos: { type: Boolean, default: false },
    manutencoes: { type: Boolean, default: false },
    inventario: { type: Boolean, default: false },
    
    // ==================== FINANCEIRO ====================
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
    
    // ==================== RELATÓRIOS E ANÁLISES ====================
    relatorios: { type: Boolean, default: false },
    graficos: { type: Boolean, default: false },
    analise: { type: Boolean, default: false },
    
    // ============================================
    // CONTABILIDADE
    // ============================================
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