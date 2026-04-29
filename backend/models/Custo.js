const mongoose = require('mongoose');

const CustoSchema = new mongoose.Schema({
  descricao: { type: String, required: true },
  valor: { type: Number, required: true },
  categoria: { type: String, default: 'Outros' },
  codigo: { type: String, default: '6.1' },
  data: { type: Date, default: Date.now },
  mes: { type: Number },
  ano: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

CustoSchema.pre('save', function(next) {
  if (this.data) {
    const data = new Date(this.data);
    this.mes = data.getMonth() + 1;
    this.ano = data.getFullYear();
  }
  next();
});

module.exports = mongoose.model('Custo', CustoSchema);