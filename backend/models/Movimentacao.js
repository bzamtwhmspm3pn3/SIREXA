const mongoose = require('mongoose');

const MovimentacaoSchema = new mongoose.Schema({
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  contaCorrenteId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContaCorrente' },
  pagamentoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pagamento' },
  tipo: { type: String, enum: ['Débito', 'Crédito'], required: true },
  valor: { type: Number, required: true },
  descricao: { type: String },
  data: { type: Date, default: Date.now },
  origem: { type: String }, // Folha Salarial, Manutenção, etc.
  origemId: { type: mongoose.Schema.Types.ObjectId },
  usuario: { type: String }
});

module.exports = mongoose.models.Movimentacao || mongoose.model('Movimentacao', MovimentacaoSchema);