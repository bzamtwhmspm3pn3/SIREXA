const mongoose = require('mongoose');

const ResultadoFinanceiroSchema = new mongoose.Schema({
  descricao: { type: String, required: true },
  valor: { type: Number, required: true },
  tipo: { type: String, enum: ['receita', 'despesa'], default: 'receita' },
  codigo: { type: String, default: '7.2' },
  data: { type: Date, default: Date.now },
  mes: { type: Number },
  ano: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

ResultadoFinanceiroSchema.pre('save', function(next) {
  if (this.data) {
    const data = new Date(this.data);
    this.mes = data.getMonth() + 1;
    this.ano = data.getFullYear();
  }
  next();
});

module.exports = mongoose.model('ResultadoFinanceiro', ResultadoFinanceiroSchema);