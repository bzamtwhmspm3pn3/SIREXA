const mongoose = require("mongoose");

// =============================================
// SCHEMA DE CONTRATO
// =============================================
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

// =============================================
// SCHEMA DE REGISTO DE PAGAMENTO
// =============================================
const pagamentoRegistoSchema = new mongoose.Schema({
  valor: { type: Number, required: true },
  data: { type: Date, default: Date.now },
  referencia: { type: String },
  usuario: { type: String },
  valorBruto: { type: Number },
  valorRetencao: { type: Number },
  taxaRetencao: { type: Number }
});

// =============================================
// SCHEMA DE PRODUTO FORNECIDO (ASSOCIAÇÃO AUTOMÁTICA)
// =============================================
const produtoFornecidoSchema = new mongoose.Schema({
  produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
  produtoNome: { type: String },
  codigoBarras: { type: String },
  ultimoPreco: { type: Number, default: 0 },
  quantidadeTotal: { type: Number, default: 0 },
  ultimaCompra: { type: Date },
  historicoPrecos: [{
    data: { type: Date, default: Date.now },
    precoUnitario: { type: Number },
    quantidade: { type: Number },
    numeroFactura: { type: String }
  }]
});

// =============================================
// SCHEMA PRINCIPAL DO FORNECEDOR
// =============================================
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
    
    // =============================================
    // DADOS FISCAIS
    // =============================================
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
    
    // =============================================
    // CONTRATOS
    // =============================================
    contratos: [contratoSchema],
    
    // =============================================
    // DADOS BANCÁRIOS PARA PAGAMENTO
    // =============================================
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
    
    // =============================================
    // HISTÓRICO DE PAGAMENTOS
    // =============================================
    pagamentos: [pagamentoRegistoSchema],
    
    // =============================================
    // 🆕 PRODUTOS FORNECIDOS (ASSOCIAÇÃO AUTOMÁTICA)
    // =============================================
    produtosFornecidos: [produtoFornecidoSchema],
    
    // =============================================
    // ESTATÍSTICAS DE COMPRAS
    // =============================================
    estatisticasCompras: {
      totalCompras: { type: Number, default: 0 },
      totalGasto: { type: Number, default: 0 },
      ultimaCompra: { type: Date },
      quantidadeTotalProdutos: { type: Number, default: 0 }
    },
    
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
// 🔥 MÉTODO: ASSOCIAR PRODUTO AO FORNECEDOR AUTOMATICAMENTE
// =============================================
fornecedorSchema.methods.associarProduto = async function(produtoId, quantidade, precoUnitario, numeroFactura = null) {
  try {
    const Stock = mongoose.model('Stock');
    const produto = await Stock.findById(produtoId);
    
    if (!produto) {
      throw new Error(`Produto ${produtoId} não encontrado`);
    }
    
    // Buscar se produto já está associado
    let produtoExistente = this.produtosFornecidos.find(p => 
      p.produtoId && p.produtoId.toString() === produtoId.toString()
    );
    
    if (produtoExistente) {
      // Atualizar existente
      produtoExistente.quantidadeTotal += quantidade;
      produtoExistente.ultimoPreco = precoUnitario;
      produtoExistente.ultimaCompra = new Date();
      produtoExistente.historicoPrecos.push({
        data: new Date(),
        precoUnitario,
        quantidade,
        numeroFactura
      });
    } else {
      // Criar nova associação
      this.produtosFornecidos.push({
        produtoId: produto._id,
        produtoNome: produto.produto,
        codigoBarras: produto.codigoBarras,
        ultimoPreco: precoUnitario,
        quantidadeTotal: quantidade,
        ultimaCompra: new Date(),
        historicoPrecos: [{
          data: new Date(),
          precoUnitario,
          quantidade,
          numeroFactura
        }]
      });
    }
    
    // Atualizar estatísticas do fornecedor
    this.estatisticasCompras.totalCompras += 1;
    this.estatisticasCompras.totalGasto += (quantidade * precoUnitario);
    this.estatisticasCompras.quantidadeTotalProdutos += quantidade;
    this.estatisticasCompras.ultimaCompra = new Date();
    
    await this.save();
    
    console.log(`✅ Produto "${produto.produto}" associado ao fornecedor ${this.nome}`);
    return { sucesso: true, produto: produtoExistente || this.produtosFornecidos[this.produtosFornecidos.length - 1] };
    
  } catch (error) {
    console.error(`❌ Erro ao associar produto:`, error.message);
    return { sucesso: false, erro: error.message };
  }
};

// =============================================
// 🔥 MÉTODO: REGISTAR COMPRA DE PRODUTO (ASSOCIA AUTOMATICAMENTE)
// =============================================
fornecedorSchema.methods.registrarCompra = async function(produtoId, quantidade, precoUnitario, numeroFactura = null, usuario = "Sistema") {
  try {
    const Stock = mongoose.model('Stock');
    const produto = await Stock.findById(produtoId);
    
    if (!produto) {
      throw new Error(`Produto ${produtoId} não encontrado`);
    }
    
    // 1. Associar produto ao fornecedor
    await this.associarProduto(produtoId, quantidade, precoUnitario, numeroFactura);
    
    // 2. Atualizar estoque do produto
    const quantidadeAntiga = produto.quantidade;
    produto.quantidade += quantidade;
    produto.precoCompra = precoUnitario; // Atualiza último preço de compra
    produto.dataUltimaEntrada = new Date();
    produto.ultimoFornecedor = this._id;
    
    // Registrar movimentação
    produto.historicoMovimentacoes = produto.historicoMovimentacoes || [];
    produto.historicoMovimentacoes.push({
      data: new Date(),
      tipo: 'entrada',
      quantidade: quantidade,
      quantidadeAnterior: quantidadeAntiga,
      quantidadeNova: produto.quantidade,
      motivo: `Compra do fornecedor ${this.nome} - Factura ${numeroFactura || 'N/A'}`,
      usuario: usuario,
      fornecedorId: this._id,
      precoUnitario: precoUnitario
    });
    
    await produto.save();
    
    // 3. Criar registo de pagamento pendente (se for compra a prazo)
    const Pagamento = mongoose.model('Pagamento');
    const valorTotal = quantidade * precoUnitario;
    
    const pagamentoExistente = await Pagamento.findOne({
      tipo: 'Fornecedor',
      origemId: this._id,
      'detalhesPagamento.numeroFactura': numeroFactura
    });
    
    if (!pagamentoExistente) {
      const novoPagamento = new Pagamento({
        tipo: 'Fornecedor',
        origemId: this._id,
        beneficiario: this.nome,
        nifBeneficiario: this.nif,
        valor: valorTotal,
        dataVencimento: new Date(Date.now() + 30 * 86400000), // 30 dias
        status: 'pendente',
        descricao: `Compra de ${quantidade} unidade(s) de ${produto.produto}`,
        usuario: usuario,
        empresaId: this.empresaId,
        detalhesPagamento: {
          numeroFactura: numeroFactura,
          produtoId: produtoId,
          produtoNome: produto.produto,
          quantidade: quantidade,
          precoUnitario: precoUnitario
        }
      });
      
      await novoPagamento.save();
      console.log(`💰 Pagamento registado: ${valorTotal.toLocaleString()} Kz`);
    }
    
    console.log(`✅ Compra registada: ${quantidade} x ${produto.produto} = ${valorTotal.toLocaleString()} Kz`);
    
    return {
      sucesso: true,
      produto: produto.produto,
      quantidade,
      valorTotal,
      fornecedor: this.nome
    };
    
  } catch (error) {
    console.error(`❌ Erro ao registrar compra:`, error.message);
    return { sucesso: false, erro: error.message };
  }
};

// =============================================
// 🔥 MÉTODO: OBTER PRODUTOS FORNECIDOS COM DETALHES
// =============================================
fornecedorSchema.methods.getProdutosFornecidos = function() {
  return this.produtosFornecidos.map(p => ({
    produtoId: p.produtoId,
    produtoNome: p.produtoNome,
    codigoBarras: p.codigoBarras,
    quantidadeTotal: p.quantidadeTotal,
    ultimoPreco: p.ultimoPreco,
    ultimaCompra: p.ultimaCompra,
    ultimosPrecos: p.historicoPrecos.slice(-5).reverse()
  }));
};

// =============================================
// 🔥 MÉTODO: CALCULAR VALOR LÍQUIDO COM RETENÇÃO
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
// 🆕 MÉTODO ESTÁTICO: BUSCAR POR PRODUTO
// =============================================
fornecedorSchema.statics.buscarPorProduto = function(produtoId, empresaId = null) {
  const query = { 'produtosFornecidos.produtoId': produtoId };
  if (empresaId) query.empresaId = empresaId;
  
  return this.find(query).select('nome nif telefone produtosFornecidos.$');
};

// =============================================
// 🆕 MÉTODO ESTÁTICO: BUSCAR FORNECEDORES COM MAIORES COMPRAS
// =============================================
fornecedorSchema.statics.getTopFornecedores = function(empresaId, limit = 10) {
  const query = { status: 'Ativo' };
  if (empresaId) query.empresaId = empresaId;
  
  return this.find(query)
    .sort({ 'estatisticasCompras.totalGasto': -1 })
    .limit(limit)
    .select('nome nif estatisticasCompras produtosFornecidos');
};

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
// ÍNDICES
// =============================================
fornecedorSchema.index({ empresaId: 1, nif: 1 }, { unique: true });
fornecedorSchema.index({ empresaId: 1 });
fornecedorSchema.index({ nome: 1 });
fornecedorSchema.index({ status: 1 });
fornecedorSchema.index({ 'contratos.dataFim': 1 });
fornecedorSchema.index({ proximoPagamento: 1 });
fornecedorSchema.index({ 'produtosFornecidos.produtoId': 1 });
fornecedorSchema.index({ 'estatisticasCompras.totalGasto': -1 });

// =============================================
// POST-SAVE MIDDLEWARE - GERAR PAGAMENTOS AUTOMATICAMENTE
// =============================================
fornecedorSchema.post('save', async function(doc) {
  try {
    console.log(`\n🔔 [AUTOMÁTICO] Fornecedor salvo: ${doc.nome}`);
    
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
      
      if (dataFim < hoje) {
        console.log(`   ⏭️ Contrato ${i + 1} expirado - ignorado`);
        continue;
      }
      
      if (contrato.modalidadePagamento === 'Único') {
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
      
      if (contrato.proximoPagamento) {
        const mesReferencia = `${contrato.proximoPagamento.getFullYear()}-${String(contrato.proximoPagamento.getMonth() + 1).padStart(2, '0')}`;
        
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
// POST-UPDATE MIDDLEWARE
// =============================================
fornecedorSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;
  
  try {
    console.log(`\n🔔 [AUTOMÁTICO] Fornecedor atualizado: ${doc.nome}`);
    
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