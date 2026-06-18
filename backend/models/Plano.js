// backend/models/Plano.js
const mongoose = require('mongoose');

const planoSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  descricao: { type: String, default: '' },
  preco: { type: Number, default: 0 },
  duracaoDias: { type: Number, default: 365 },
  ordem: { type: Number, default: 0 },
  
  limites: {
    maxEmpresas: { type: Number, default: 1 },
    maxUsuarios: { type: Number, default: 1 },
    maxFuncionarios: { type: Number, default: 5 },
    maxProdutos: { type: Number, default: 100 },
    maxFornecedores: { type: Number, default: 20 },
    maxClientes: { type: Number, default: 50 },
    espacoArmazenamento: { type: Number, default: 100 }
  },
  
  // 🔥 MÓDULOS COMPLETOS DO SISTEMA
  modulos: {
    // Operacional
    vendas: { type: Boolean, default: false },
    stock: { type: Boolean, default: false },
    facturacao: { type: Boolean, default: false },
    // Recursos Humanos
    funcionarios: { type: Boolean, default: false },
    folhaSalarial: { type: Boolean, default: false },
    gestaoFaltas: { type: Boolean, default: false },
    gestaoAbonos: { type: Boolean, default: false },
    avaliacao: { type: Boolean, default: false },
    recrutamento: { type: Boolean, default: false },
    formacao: { type: Boolean, default: false },
    feriasLicencas: { type: Boolean, default: false },
    carreira: { type: Boolean, default: false },
    disciplinar: { type: Boolean, default: false },
    competencias: { type: Boolean, default: false },
    saudeSeguranca: { type: Boolean, default: false },
    workflow: { type: Boolean, default: false },
    // Gestão Patrimonial
    viaturas: { type: Boolean, default: false },
    abastecimentos: { type: Boolean, default: false },
    manutencoes: { type: Boolean, default: false },
    inventario: { type: Boolean, default: false },
    // Financeiro
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
    // Relatórios
    relatorios: { type: Boolean, default: false },
    graficos: { type: Boolean, default: false },
    analise: { type: Boolean, default: false },
    // Contabilidade
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
  
  ativo: { type: Boolean, default: true }
}, { 
  timestamps: true,
  collection: 'planos'
});

module.exports = mongoose.models.Plano || mongoose.model('Plano', planoSchema);