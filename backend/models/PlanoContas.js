// backend/models/PlanoContas.js
const mongoose = require('mongoose');

const planocontasSchema = new mongoose.Schema({
    codigo: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    nome: {
        type: String,
        required: true,
        trim: true
    },
    classe: {
        type: Number,
        required: true,
        min: 1,
        max: 9
    },
    nivel: {
        type: Number,
        required: true,
        default: 1
    },
    natureza: {
        type: String,
        enum: ['Devedora', 'Credora', 'Mista'],
        required: true
    },
    pai: {
        type: String,
        default: null
    },
    paiCodigo: {
        type: String,
        default: null
    },
    empresaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa',
        required: true
    },
    ativo: {
        type: Boolean,
        default: true
    },
    criadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    alteradoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    dataDesativacao: {
        type: Date
    },
    saldoDevedor: {
        type: Number,
        default: 0
    },
    saldoCredor: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

planocontasSchema.index({ empresaId: 1, codigo: 1 }, { unique: true });
planocontasSchema.index({ empresaId: 1, classe: 1 });
planocontasSchema.index({ empresaId: 1, pai: 1 });

planocontasSchema.methods.desativarComSubcontas = async function(usuarioId) {
    const subcontas = await this.constructor.find({ 
        empresaId: this.empresaId, 
        pai: this.codigo,
        ativo: true 
    });
    for (const subconta of subcontas) {
        await subconta.desativarComSubcontas(usuarioId);
    }
    this.ativo = false;
    this.alteradoPor = usuarioId;
    this.dataDesativacao = new Date();
    await this.save();
};

module.exports = mongoose.model('PlanoContas', planocontasSchema);