const mongoose = require('mongoose');

const CargoHierarquiaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  nivel: { type: Number, required: true },
  departamento: { type: String },
  descricao: { type: String },
  salarioMin: { type: Number },
  salarioMax: { type: Number },
  competenciasNecessarias: [String],
  requisitos: { type: String },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true }
});

const PromocaoSchema = new mongoose.Schema({
  funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  funcionarioNome: { type: String },
  cargoAnterior: { type: String },
  cargoNovo: { type: String },
  departamentoAnterior: { type: String },
  departamentoNovo: { type: String },
  salarioAnterior: { type: Number },
  salarioNovo: { type: Number },
  dataPromocao: { type: Date, default: Date.now },
  tipo: { type: String, enum: ['Promocao', 'Transferencia', 'Reajuste', 'Reenquadramento'], default: 'Promocao' },
  motivo: { type: String },
  aprovadoPor: { type: String },
  status: { type: String, enum: ['Proposta', 'Aprovada', 'Efetivada', 'Rejeitada'], default: 'Proposta' },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PromocaoSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const SucessaoSchema = new mongoose.Schema({
  cargo: { type: String, required: true },
  funcionarioAtual: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
  funcionarioAtualNome: { type: String },
  sucessores: [{
    funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
    nome: { type: String },
    nivelPreparacao: { type: String, enum: ['Pronto', 'EmPreparacao', 'Potencial', 'CurtoPrazo', 'MedioPrazo', 'LongoPrazo'] },
    notas: { type: String }
  }],
  riscoSaida: { type: String, enum: ['Baixo', 'Medio', 'Alto'], default: 'Baixo' },
  criticidade: { type: String, enum: ['Baixa', 'Media', 'Alta', 'Critica'], default: 'Media' },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SucessaoSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = {
  CargoHierarquia: mongoose.models.CargoHierarquia || mongoose.model('CargoHierarquia', CargoHierarquiaSchema),
  Promocao: mongoose.models.Promocao || mongoose.model('Promocao', PromocaoSchema),
  Sucessao: mongoose.models.Sucessao || mongoose.model('Sucessao', SucessaoSchema)
};
