// backend/models/PeriodoFiscal.js
const mongoose = require('mongoose');

const periodoFiscalSchema = new mongoose.Schema({
    ano: { type: Number, required: true },
    nome: { type: String, trim: true },
    dataInicio: { type: Date, required: true },
    dataFim: { type: Date, required: true },
    tipo: { type: String, enum: ['Exercício', 'Trimestre', 'Semestre', 'Mês'], default: 'Exercício' },
    status: { type: String, enum: ['Aberto', 'Fechado', 'Bloqueado'], default: 'Aberto' },
    empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fechadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dataFechamento: Date,
    resultado: {
        receitas: { type: Number, default: 0 },
        despesas: { type: Number, default: 0 },
        lucroPrejuizo: { type: Number, default: 0 }
    }
}, { timestamps: true });

periodoFiscalSchema.index({ empresaId: 1, ano: 1 });
periodoFiscalSchema.index({ empresaId: 1, status: 1 });

module.exports = mongoose.model('PeriodoFiscal', periodoFiscalSchema);