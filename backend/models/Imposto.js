const mongoose = require('mongoose');

const ImpostoSchema = new mongoose.Schema({
  descricao: { type: String, required: true },
  valor: { type: Number, required: true },
  tipo: { type: String, default: 'IVA' },
  codigo: { type: String, default: '2.4' },
  data: { type: Date, default: Date.now },
  mes: { type: Number },
  ano: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

ImpostoSchema.pre('save', function(next) {
  if (this.data) {
    const data = new Date(this.data);
    this.mes = data.getMonth() + 1;
    this.ano = data.getFullYear();
  }
  next();
});

module.exports = mongoose.model('Imposto', ImpostoSchema);