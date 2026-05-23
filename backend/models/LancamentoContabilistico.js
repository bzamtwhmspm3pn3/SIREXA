// backend/models/LancamentoContabilistico.js
const mongoose = require('mongoose');

const lancamentoContabilisticoSchema = new mongoose.Schema({
    numeroLancamento: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    descricao: {
        type: String,
        required: true,
        trim: true
    },
    dataLancamento: {
        type: Date,
        default: Date.now,
        required: true
    },
    dataContabilizacao: {
        type: Date,
        default: Date.now
    },
    empresaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa',
        required: true
    },
    partidas: [{
        contaCodigo: { type: String, required: true },
        contaDescricao: { type: String, required: true },
        classe: { type: Number, required: true, min: 1, max: 9 },
        debito: { type: Number, default: 0, min: 0 },
        credito: { type: Number, default: 0, min: 0 },
        documentoOrigem: {
            tipo: { type: String, enum: ['Venda', 'Pagamento', 'Factura', 'Transferencia', 'Ajuste', 'Importado'] },
            id: mongoose.Schema.Types.ObjectId,
            referencia: String
        }
    }],
    totalDebito: { type: Number, required: true, default: 0 },
    totalCredito: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['Rascunho', 'Contabilizado', 'Cancelado', 'Estornado'], default: 'Rascunho' },
    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    aprovadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    periodo: { ano: Number, mes: Number, trimestre: Number },
    observacoes: { type: String, trim: true },
    motivoCancelamento: { type: String, trim: true }
}, { timestamps: true });

lancamentoContabilisticoSchema.index({ empresaId: 1, dataLancamento: -1 });
lancamentoContabilisticoSchema.index({ empresaId: 1, 'partidas.contaCodigo': 1 });
lancamentoContabilisticoSchema.index({ numeroLancamento: 1 }, { unique: true });

lancamentoContabilisticoSchema.pre('save', function(next) {
    if (this.status === 'Contabilizado') {
        if (this.totalDebito !== this.totalCredito) {
            next(new Error('❌ Os totais de Débito e Crédito devem ser iguais!'));
        }
        if (!this.partidas || this.partidas.length < 2) {
            next(new Error('❌ Um lançamento deve ter pelo menos 2 partidas!'));
        }
    }
    next();
});

lancamentoContabilisticoSchema.methods.estornar = async function(usuarioId, motivo) {
    const estorno = new this.constructor({
        numeroLancamento: `EST-${this.numeroLancamento}`,
        descricao: `Estorno: ${this.descricao}`,
        empresaId: this.empresaId,
        partidas: this.partidas.map(p => ({ ...p.toObject(), debito: p.credito, credito: p.debito })),
        totalDebito: this.totalCredito,
        totalCredito: this.totalDebito,
        status: 'Contabilizado',
        criadoPor: usuarioId,
        periodo: this.periodo,
        observacoes: `Estornado por: ${motivo}`
    });
    this.status = 'Estornado';
    this.motivoCancelamento = motivo;
    await this.save();
    return await estorno.save();
};

module.exports = mongoose.model('LancamentoContabilistico', lancamentoContabilisticoSchema);