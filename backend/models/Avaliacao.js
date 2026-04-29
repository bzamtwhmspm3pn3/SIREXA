// backend/models/Avaliacao.js
const mongoose = require('mongoose');

// Schema para critérios personalizados
const CriterioSchema = new mongoose.Schema({
  id: { type: String },
  nome: { type: String, default: '' },
  descricao: { type: String, default: '' },
  peso: { type: Number, default: 1, min: 0, max: 10 },
  nota: { type: Number, default: 0, min: 0, max: 100 }
});

// Schema para categoria do método de avaliação
const CategoriaSchema = new mongoose.Schema({
  id: { type: String },
  nome: { type: String, default: '' },
  descricao: { type: String, default: '' },
  peso: { type: Number, default: 1, min: 0, max: 10 },
  criterios: [CriterioSchema],
  origemMetodo: { type: String, default: '' }
});

// Schema para configuração do método de avaliação por empresa
const ConfiguracaoAvaliacaoSchema = new mongoose.Schema({
  empresaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Empresa', 
    required: true,
    unique: true
  },
  // NOVOS CAMPOS (prioritários)
  metodosSelecionados: {
    type: [{
      key: { type: String },
      nome: { type: String },
      descricao: { type: String }
    }],
    default: []
  },
  metodoPadrao: { type: String, default: '' },
  categorias: {
    type: [CategoriaSchema],
    default: []
  },
  // CAMPOS ANTIGOS (opcionais, para compatibilidade)
  metodo: { 
    type: String, 
    default: '',
    enum: [
      'escalas_graficas', 'escolha_forcada', 'incidentes_criticos', 
      'pesquisa_campo', 'listas_verificacao', 'comparacao_pares',
      'avaliacao_objetivos', 'bars', 'bos', 'nine_box', 'autoavaliacao',
      'avaliacao_180', 'avaliacao_360', 'avaliacao_540', 'competencias_cha',
      'balanced_scorecard', 'okrs', 'feedback_continuo', 'gamificacao',
      ''
    ]
  },
  nomeMetodo: { type: String, default: '' },
  descricaoMetodo: { type: String, default: '' },
  configuracao: {
    escalas: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 5 },
      labels: { type: Map, of: String }
    },
    pesos: {
      avaliador: { type: Number, default: 1 },
      autoavaliacao: { type: Number, default: 0 },
      pares: { type: Number, default: 0 },
      subordinados: { type: Number, default: 0 },
      clientes: { type: Number, default: 0 }
    },
    nineBox: {
      desempenho: { type: [String], default: ['Baixo', 'Médio', 'Alto'] },
      potencial: { type: [String], default: ['Baixo', 'Médio', 'Alto'] }
    },
    okrs: {
      objetivos: [{
        titulo: String,
        keyResults: [{
          descricao: String,
          meta: Number,
          alcancado: Number,
          peso: { type: Number, default: 1 }
        }]
      }]
    }
  },
  ativo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Schema para avaliação realizada
const AvaliacaoRealizadaSchema = new mongoose.Schema({
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  configuracaoId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConfiguracaoAvaliacao' },
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String, required: true },
  funcionarioCargo: { type: String },
  funcionarioDepartamento: { type: String },
  periodo: { type: String, required: true },
  mes: { type: Number },
  ano: { type: Number, required: true },
  tipo: { type: String, default: 'avaliacao' },
  avaliadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
  avaliadorNome: { type: String },
  avaliadorTipo: { type: String, enum: ['gestor', 'par', 'subordinado', 'cliente', 'auto'], default: 'gestor' },
  notas: {
    produtividade: { type: Number, default: 0, min: 0, max: 5 },
    qualidade: { type: Number, default: 0, min: 0, max: 5 },
    pontualidade: { type: Number, default: 0, min: 0, max: 5 },
    trabalhoEquipe: { type: Number, default: 0, min: 0, max: 5 },
    iniciativa: { type: Number, default: 0, min: 0, max: 5 }
  },
  notasPorCategoria: [{
    categoriaId: { type: String },
    categoriaNome: { type: String },
    peso: { type: Number, default: 1 },
    notaCategoria: { type: Number, default: 0 },
    criterios: [{
      criterioId: { type: String },
      criterioNome: { type: String },
      peso: { type: Number, default: 1 },
      nota: { type: Number, default: 0 },
      comentario: { type: String }
    }]
  }],
  notaTotal: { type: Number, default: 0 },
  notaGeral: { type: Number, default: 0 },
  classificacao: { 
    type: String, 
    enum: ['Excelente', 'Muito Bom', 'Bom', 'Regular', 'Insuficiente'],
    default: 'Regular'
  },
  comentarios: { type: String },
  comentarioGeral: { type: String },
  recomendacoes: { type: String },
  avaliador: { type: String },
  status: { 
    type: String, 
    enum: ['Pendente', 'Em Andamento', 'Concluído', 'Aprovado', 'Rejeitado'],
    default: 'Pendente'
  },
  data: { type: Date, default: Date.now },
  dataAvaliacao: { type: Date, default: Date.now },
  avaliacoesMultiplas: [{
    avaliadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
    avaliadorNome: { type: String },
    avaliadorTipo: { type: String },
    notasPorCategoria: [mongoose.Schema.Types.Mixed],
    notaGeral: { type: Number },
    comentario: { type: String },
    data: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = {
  ConfiguracaoAvaliacao: mongoose.models.ConfiguracaoAvaliacao || mongoose.model('ConfiguracaoAvaliacao', ConfiguracaoAvaliacaoSchema),
  AvaliacaoRealizada: mongoose.models.AvaliacaoRealizada || mongoose.model('AvaliacaoRealizada', AvaliacaoRealizadaSchema)
};