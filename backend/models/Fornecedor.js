const mongoose = require("mongoose");

const contratoSchema = new mongoose.Schema({
  valor: { type: Number, required: true },
  dataInicio: { type: Date, required: true },
  dataFim: { type: Date, required: true },
  modalidadePagamento: {
    type: String,
    enum: ['Diário', 'Semanal', 'Quinzenal', 'Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual', 'Único'],
    required: true
  },
  diaVencimento: { type: Number, min: 1, max: 31, default: 5 },
  diaPagamento: { type: Number, min: 1, max: 31, default: 15 },
  avisoAntecedencia: { type: Number, default: 5 },
  proximoPagamento: { type: Date },
  descricao: { type: String, default: "" },
  anexos: [{ type: String }]
});

const pagamentoRegistoSchema = new mongoose.Schema({
  valor: { type: Number, required: true },
  data: { type: Date, default: Date.now },
  referencia: { type: String },
  usuario: { type: String },
  valorBruto: { type: Number },
  valorRetencao: { type: Number },
  taxaRetencao: { type: Number }
});

const fornecedorSchema = new mongoose.Schema(
  {
    empresaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true
    },
    empresaNome: {
      type: String,
      required: false,
      default: ""
    },
    nome: { type: String, required: true, trim: true },
    nif: { type: String, required: true, trim: true },
    telefone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    endereco: { type: String, default: "", trim: true },
    contato: { type: String, default: "", trim: true },
    tipoServico: { type: String, default: "", trim: true },
    regimeTributacao: {
      type: String,
      enum: ["Regime Geral", "Regime Simplificado", "Regime de IVA com Exclusão", "Regime de IVA com Inclusão", ""],
      default: ""
    },
    fiscal: {
      suportaIVA: { type: Boolean, default: true },
      taxaIVA: { type: Number, default: 14 },
      retencaoFonte: { type: Boolean, default: false },
      tipoRetencao: { type: String, enum: ['Renda', 'Serviços', 'Outros', ''], default: '' },
      taxaRetencao: { type: Number, default: 0 }
    },
    contratos: [contratoSchema],
    pagamento: {
      banco: { type: String, default: "" },
      iban: { type: String, default: "" },
      swift: { type: String, default: "" },
      formaPagamento: {
        type: String,
        enum: ['Transferência', 'Dinheiro', 'Cheque', 'POS'],
        default: 'Transferência'
      }
    },
    pagamentos: [pagamentoRegistoSchema],
    observacoes: { type: String, default: "" },
    status: { type: String, enum: ['Ativo', 'Inativo', 'Bloqueado'], default: 'Ativo' },
    ultimoPagamento: { type: Date },
    proximoPagamento: { type: Date },
    criadoPor: { type: String },
    atualizadoPor: { type: String }
  },
  { timestamps: true }
);

// =============================================
// MIDDLEWARE: Calcular próximo pagamento automaticamente
// =============================================
fornecedorSchema.pre('save', function(next) {
  if (!this.contratos || this.contratos.length === 0) {
    this.proximoPagamento = null;
    return next();
  }
  
  const hoje = new Date();
  let atualizado = false;
  const pagamentosFuturos = [];
  
  for (const contrato of this.contratos) {
    const dataFim = new Date(contrato.dataFim);
    
    if (dataFim < hoje) {
      if (contrato.proximoPagamento) {
        contrato.proximoPagamento = null;
        atualizado = true;
      }
      continue;
    }
    
    if (contrato.modalidadePagamento === 'Único') {
      contrato.proximoPagamento = null;
      continue;
    }
    
    if (!contrato.proximoPagamento || new Date(contrato.proximoPagamento) <= hoje) {
      const diaPagamento = contrato.diaPagamento || 15;
      const dataRef = contrato.proximoPagamento && new Date(contrato.proximoPagamento) > hoje 
        ? new Date(contrato.proximoPagamento) 
        : hoje;
      
      let proximoPagamento = new Date(dataRef);
      
      switch (contrato.modalidadePagamento) {
        case 'Diário':
          proximoPagamento.setDate(dataRef.getDate() + 1);
          break;
        case 'Semanal':
          proximoPagamento.setDate(dataRef.getDate() + 7);
          break;
        case 'Quinzenal':
          proximoPagamento.setDate(dataRef.getDate() + 15);
          break;
        case 'Mensal':
          proximoPagamento.setDate(diaPagamento);
          if (proximoPagamento <= dataRef) {
            proximoPagamento.setMonth(proximoPagamento.getMonth() + 1);
          }
          break;
        case 'Bimestral':
          proximoPagamento.setDate(diaPagamento);
          if (proximoPagamento <= dataRef) {
            proximoPagamento.setMonth(proximoPagamento.getMonth() + 2);
          }
          break;
        case 'Trimestral':
          proximoPagamento.setDate(diaPagamento);
          if (proximoPagamento <= dataRef) {
            proximoPagamento.setMonth(proximoPagamento.getMonth() + 3);
          }
          break;
        case 'Semestral':
          proximoPagamento.setDate(diaPagamento);
          if (proximoPagamento <= dataRef) {
            proximoPagamento.setMonth(proximoPagamento.getMonth() + 6);
          }
          break;
        case 'Anual':
          proximoPagamento.setDate(diaPagamento);
          if (proximoPagamento <= dataRef) {
            proximoPagamento.setFullYear(proximoPagamento.getFullYear() + 1);
          }
          break;
        default:
          proximoPagamento = null;
      }
      
      if (proximoPagamento && proximoPagamento > dataFim) {
        proximoPagamento = null;
      }
      
      if (contrato.proximoPagamento !== proximoPagamento) {
        contrato.proximoPagamento = proximoPagamento;
        atualizado = true;
      }
    }
    
    if (contrato.proximoPagamento && new Date(contrato.proximoPagamento) > hoje) {
      pagamentosFuturos.push(new Date(contrato.proximoPagamento));
    }
  }
  
  if (pagamentosFuturos.length > 0) {
    pagamentosFuturos.sort((a, b) => a - b);
    this.proximoPagamento = pagamentosFuturos[0];
  } else {
    this.proximoPagamento = null;
  }
  
  if (atualizado) {
    this.markModified('contratos');
  }
  
  next();
});

// =============================================
// MÉTODOS DE INSTÂNCIA
// =============================================
fornecedorSchema.methods.calcularValorLiquido = function(valorBruto) {
  let valorLiquido = valorBruto;
  let taxaRetencao = 0;
  let valorRetencao = 0;
  
  if (this.fiscal && this.fiscal.retencaoFonte) {
    if (this.fiscal.taxaRetencao && this.fiscal.taxaRetencao > 0) {
      taxaRetencao = this.fiscal.taxaRetencao;
    } else if (this.fiscal.tipoRetencao === 'Renda') {
      taxaRetencao = 15;
    } else if (this.fiscal.tipoRetencao === 'Serviços') {
      taxaRetencao = 6.5;
    }
    
    valorRetencao = (valorBruto * taxaRetencao) / 100;
    valorLiquido = valorBruto - valorRetencao;
  }
  
  return { valorLiquido, taxaRetencao, valorRetencao };
};

// =============================================
// MÉTODOS ESTÁTICOS
// =============================================
fornecedorSchema.statics.buscarComPagamentosProximos = function(empresaId = null, dias = 15) {
  const hoje = new Date();
  const dataLimite = new Date();
  dataLimite.setDate(hoje.getDate() + dias);
  
  const query = { status: 'Ativo', proximoPagamento: { $lte: dataLimite, $gte: hoje } };
  if (empresaId) query.empresaId = empresaId;
  
  return this.find(query).sort({ proximoPagamento: 1 });
};

fornecedorSchema.statics.buscarContratosAtivos = function(empresaId = null) {
  const hoje = new Date();
  const query = { status: 'Ativo', 'contratos.dataFim': { $gte: hoje } };
  if (empresaId) query.empresaId = empresaId;
  
  return this.find(query);
};

// Índices
fornecedorSchema.index({ empresaId: 1, nif: 1 }, { unique: true });
fornecedorSchema.index({ empresaId: 1 });
fornecedorSchema.index({ nome: 1 });
fornecedorSchema.index({ status: 1 });
fornecedorSchema.index({ 'contratos.dataFim': 1 });
fornecedorSchema.index({ proximoPagamento: 1 });

// =============================================
// POST-SAVE MIDDLEWARE - GERAR PAGAMENTOS AUTOMATICAMENTE
// =============================================
fornecedorSchema.post('save', async function(doc) {
  try {
    console.log(`\n🔔 [AUTOMÁTICO] Fornecedor salvo: ${doc.nome}`);
    
    // Verificar se há contratos
    if (!doc.contratos || doc.contratos.length === 0) {
      console.log(`   ℹ️ Nenhum contrato para gerar pagamentos`);
      return;
    }
    
    const hoje = new Date();
    const integracaoPagamentos = require('../services/integracaoPagamentos');
    const Pagamento = require('../models/Pagamento');
    let pagamentosGerados = 0;
    
    for (let i = 0; i < doc.contratos.length; i++) {
      const contrato = doc.contratos[i];
      const dataFim = new Date(contrato.dataFim);
      
      // Verificar se contrato está ativo
      if (dataFim < hoje) {
        console.log(`   ⏭️ Contrato ${i + 1} expirado - ignorado`);
        continue;
      }
      
      // Verificar se é contrato único
      if (contrato.modalidadePagamento === 'Único') {
        console.log(`   ⏭️ Contrato ${i + 1} é único - verificando pagamento...`);
        // Para contrato único, verificar se já existe pagamento
        const pagamentoExistente = await Pagamento.findOne({
          tipo: 'Fornecedor',
          origemId: doc._id,
          'detalhesPagamento.contratoId': contrato._id
        });
        
        if (!pagamentoExistente && contrato.dataFim) {
          console.log(`   🚀 Gerando pagamento único para contrato ${i + 1}`);
          await integracaoPagamentos.integrarFornecedor(doc, contrato, 'Sistema - Automático');
          pagamentosGerados++;
        }
        continue;
      }
      
      // Para contratos recorrentes
      if (contrato.proximoPagamento) {
        const mesReferencia = `${contrato.proximoPagamento.getFullYear()}-${String(contrato.proximoPagamento.getMonth() + 1).padStart(2, '0')}`;
        
        // Verificar se já existe pagamento para este período
        const pagamentoExistente = await Pagamento.findOne({
          tipo: 'Fornecedor',
          origemId: doc._id,
          'detalhesPagamento.mesReferencia': mesReferencia
        });
        
        if (!pagamentoExistente) {
          console.log(`   🚀 Gerando pagamento para contrato ${i + 1} - ${contrato.modalidadePagamento}`);
          await integracaoPagamentos.integrarFornecedor(doc, contrato, 'Sistema - Automático');
          pagamentosGerados++;
        } else {
          console.log(`   ⏭️ Contrato ${i + 1} - pagamento já existe para ${mesReferencia}`);
        }
      } else if (contrato.modalidadePagamento !== 'Único') {
        console.log(`   ⚠️ Contrato ${i + 1} sem próximo pagamento calculado`);
      }
    }
    
    if (pagamentosGerados > 0) {
      console.log(`   ✅ ${pagamentosGerados} pagamentos gerados automaticamente para ${doc.nome}`);
    }
    
  } catch (error) {
    console.error(`   ❌ Erro no post-save do fornecedor ${doc.nome}:`, error.message);
  }
});

// =============================================
// POST-UPDATE MIDDLEWARE - PARA QUANDO CONTRATOS SÃO MODIFICADOS
// =============================================
fornecedorSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;
  
  try {
    console.log(`\n🔔 [AUTOMÁTICO] Fornecedor atualizado: ${doc.nome}`);
    
    // Verificar se houve alteração nos contratos
    const update = this.getUpdate();
    if (!update || (!update.contratos && !update.$push?.contratos && !update.$pull?.contratos)) {
      console.log(`   ℹ️ Nenhuma alteração nos contratos`);
      return;
    }
    
    const integracaoPagamentos = require('../services/integracaoPagamentos');
    const Pagamento = require('../models/Pagamento');
    const hoje = new Date();
    let pagamentosGerados = 0;
    
    for (const contrato of doc.contratos || []) {
      const dataFim = new Date(contrato.dataFim);
      
      if (dataFim >= hoje && contrato.proximoPagamento) {
        const mesReferencia = `${contrato.proximoPagamento.getFullYear()}-${String(contrato.proximoPagamento.getMonth() + 1).padStart(2, '0')}`;
        
        const pagamentoExistente = await Pagamento.findOne({
          tipo: 'Fornecedor',
          origemId: doc._id,
          'detalhesPagamento.mesReferencia': mesReferencia
        });
        
        if (!pagamentoExistente) {
          await integracaoPagamentos.integrarFornecedor(doc, contrato, 'Sistema - Atualização');
          pagamentosGerados++;
        }
      }
    }
    
    if (pagamentosGerados > 0) {
      console.log(`   ✅ ${pagamentosGerados} pagamentos gerados após atualização`);
    }
    
  } catch (error) {
    console.error(`   ❌ Erro no post-update:`, error.message);
  }
});

module.exports = mongoose.model("Fornecedor", fornecedorSchema);