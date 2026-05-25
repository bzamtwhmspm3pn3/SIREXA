// backend/routes/fornecedores.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Fornecedor = require('../models/Fornecedor');
const Empresa = require('../models/Empresa');
const Stock = require('../models/Stock');
const Pagamento = require('../models/Pagamento');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// ============================================
// FUNÇÃO PARA GERAR PAGAMENTO DE COMPRA DE MERCADORIA (CORRIGIDA)
// ============================================
async function gerarPagamentoCompra(fornecedor, quantidade, precoCompra, produtoNome, unidadeMedida, usuario, dataCompra = null) {
  try {
    const subtotal = quantidade * precoCompra;
    const suportaIVA = fornecedor.fiscal?.suportaIVA !== false;
    const taxaIVA = suportaIVA ? (fornecedor.fiscal?.taxaIVA || 14) : 0;
    const valorIVA = (subtotal * taxaIVA) / 100;
    const valorTotal = subtotal + valorIVA;

    let taxaRetencao = 0;
    let valorRetencao = 0;
    
    if (fornecedor.fiscal?.retencaoFonte) {
      taxaRetencao = fornecedor.fiscal?.taxaRetencao || 0;
      if (taxaRetencao === 0 && fornecedor.fiscal?.tipoRetencao === 'Renda') {
        taxaRetencao = 15;
      } else if (taxaRetencao === 0 && fornecedor.fiscal?.tipoRetencao === 'Serviços') {
        taxaRetencao = 6.5;
      }
      valorRetencao = (valorTotal * taxaRetencao) / 100;
    }

    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await Pagamento.countDocuments({ empresaId: fornecedor.empresaId }) + 1;
    const referencia = `PAG-${ano}${mes}-${String(count).padStart(4, '0')}`;

    const pagamento = new Pagamento({
      referencia: referencia,
      tipo: 'Fornecedor',
      categoria: 'Operacional',
      subtipo: 'Compra de Mercadoria',
      origemId: fornecedor._id,
      origemModel: 'Fornecedor',
      origemDescricao: `Compra de ${quantidade} ${unidadeMedida}(s) de ${produtoNome}`,
      empresaId: fornecedor.empresaId,
      empresaNome: fornecedor.empresaNome,
      beneficiario: fornecedor.nome,
      beneficiarioDocumento: fornecedor.nif,
      valor: valorTotal,
      valorBruto: valorTotal,
      valorRetencao: valorRetencao,
      taxaRetencao: taxaRetencao,
      valorPago: 0,
      saldo: valorTotal - valorRetencao,
      dataVencimento: dataCompra ? new Date(dataCompra) : new Date(),
      status: 'Pendente',
      descricao: `Compra de ${quantidade} ${unidadeMedida}(s) de ${produtoNome}`,
      observacao: `Preço unitário: ${precoCompra} Kz | IVA: ${taxaIVA}% | Subtotal: ${subtotal} Kz | Total: ${valorTotal} Kz`,
      formaPagamento: fornecedor.pagamento?.formaPagamento || 'Transferência Bancária',
      contaDebito: fornecedor.pagamento?.iban || 'Conta Principal',
      criadoPor: usuario,
      notaInformativa: `Compra registrada. Produto: ${produtoNome}`
    });
    
    await pagamento.save();
    console.log(`💰 Pagamento de compra gerado: ${pagamento.referencia} - Valor: ${valorTotal} Kz`);
    
    return pagamento;
  } catch (error) {
    console.error('❌ Erro ao gerar pagamento de compra:', error.message);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA GERAR PAGAMENTO DE CONTRATO (CORRIGIDA)
// ============================================
async function gerarPagamentoContrato(fornecedor, contrato, usuario) {
  try {
    let taxaRetencao = 0;
    let valorRetencao = 0;
    
    if (fornecedor.fiscal?.retencaoFonte) {
      taxaRetencao = fornecedor.fiscal?.taxaRetencao || 
        (fornecedor.fiscal?.tipoRetencao === 'Renda' ? 15 : 
         fornecedor.fiscal?.tipoRetencao === 'Serviços' ? 6.5 : 0);
      valorRetencao = (contrato.valor * taxaRetencao) / 100;
    }
    
    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await Pagamento.countDocuments({ empresaId: fornecedor.empresaId }) + 1;
    const referencia = `PAG-${ano}${mes}-${String(count).padStart(4, '0')}`;
    
    const dataVencimento = contrato.proximoPagamento || new Date();
    const mesReferencia = `${dataVencimento.getFullYear()}-${String(dataVencimento.getMonth() + 1).padStart(2, '0')}`;

    const pagamento = new Pagamento({
      referencia: referencia,
      tipo: 'Fornecedor',
      categoria: 'Operacional',
      subtipo: contrato.descricao || 'Contrato',
      origemId: fornecedor._id,
      origemModel: 'Fornecedor',
      origemDescricao: `Contrato: ${contrato.descricao}`,
      empresaId: fornecedor.empresaId,
      empresaNome: fornecedor.empresaNome,
      beneficiario: fornecedor.nome,
      beneficiarioDocumento: fornecedor.nif,
      valor: contrato.valor,
      valorBruto: contrato.valor,
      valorRetencao: valorRetencao,
      taxaRetencao: taxaRetencao,
      valorPago: 0,
      saldo: contrato.valor - valorRetencao,
      dataVencimento: dataVencimento,
      status: 'Pendente',
      descricao: `Pagamento - ${contrato.descricao || fornecedor.tipoFornecedor || 'Serviço'}`,
      observacao: `Modalidade: ${contrato.modalidadePagamento} | Período: ${mesReferencia}`,
      formaPagamento: fornecedor.pagamento?.formaPagamento || 'Transferência Bancária',
      contaDebito: fornecedor.pagamento?.iban || 'Conta Principal',
      criadoPor: usuario,
      notaInformativa: `Pagamento recorrente - ${contrato.modalidadePagamento}`
    });
    
    await pagamento.save();
    console.log(`💰 Pagamento de contrato gerado: ${pagamento.referencia} - Valor: ${contrato.valor} Kz`);
    
    return pagamento;
  } catch (error) {
    console.error('❌ Erro ao gerar pagamento de contrato:', error.message);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA CRIAR/ATUALIZAR PRODUTO NO STOCK
// ============================================
async function criarProdutoNoStock(fornecedor, produtoInfo, empresaId, usuario) {
  try {
    const quantidade = produtoInfo.quantidade || 0;
    const precoCompra = produtoInfo.precoCompra || 0;
    
    if (!produtoInfo.produto) {
      console.log('⚠️ Produto sem nome, ignorando...');
      return null;
    }
    
    let produtoExistente = await Stock.findOne({
      produto: produtoInfo.produto,
      empresaId: new mongoose.Types.ObjectId(empresaId),
      fornecedorId: fornecedor._id
    });

    let produtoCriado;
    
    if (produtoExistente) {
      const novaQuantidade = (produtoExistente.quantidade || 0) + quantidade;
      const valorTotalAntigo = (produtoExistente.precoCompra || 0) * (produtoExistente.quantidade || 0);
      const valorTotalNovo = precoCompra * quantidade;
      const novoPrecoMedio = novaQuantidade > 0 ? (valorTotalAntigo + valorTotalNovo) / novaQuantidade : precoCompra;
      
      produtoExistente.precoCompra = novoPrecoMedio;
      produtoExistente.precoVenda = produtoInfo.precoVenda || produtoExistente.precoVenda;
      produtoExistente.quantidade = novaQuantidade;
      if (produtoInfo.dataValidade) produtoExistente.dataValidade = new Date(produtoInfo.dataValidade);
      if (produtoInfo.numeroLote) produtoExistente.numeroLote = produtoInfo.numeroLote;
      if (produtoInfo.armazem) produtoExistente.armazem = produtoInfo.armazem;
      produtoExistente.ultimoFornecedor = fornecedor._id;
      produtoExistente.updatedAt = new Date();
      await produtoExistente.save();
      
      console.log(`📦 Produto atualizado: ${produtoExistente.produto} - Nova quantidade: ${novaQuantidade}`);
      produtoCriado = produtoExistente;
    } else {
      const produto = new Stock({
        produto: produtoInfo.produto,
        empresaId: new mongoose.Types.ObjectId(empresaId),
        tipo: 'produto',
        codigoBarras: produtoInfo.codigoBarras || '',
        codigoInterno: produtoInfo.codigoInterno || '',
        categoria: produtoInfo.categoria || 'Geral',
        marca: produtoInfo.marca || '',
        unidadeMedida: produtoInfo.unidadeMedida || 'Unidade',
        precoCompra: precoCompra,
        precoVenda: produtoInfo.precoVenda || 0,
        quantidade: quantidade,
        quantidadeMinima: produtoInfo.quantidadeMinima || 5,
        dataValidade: produtoInfo.dataValidade ? new Date(produtoInfo.dataValidade) : null,
        armazem: produtoInfo.armazem || 'Principal',
        numeroLote: produtoInfo.numeroLote || '',
        taxaIVA: produtoInfo.taxaIVA || 14,
        fornecedorId: fornecedor._id,
        fornecedor: fornecedor.nome,
        ultimoFornecedor: fornecedor._id,
        ativo: true,
        criadoPor: usuario,
        observacoes: produtoInfo.observacoes || ''
      });
      
      await produto.save();
      console.log(`📦 Produto criado: ${produto.produto}`);
      produtoCriado = produto;
    }
    
    return produtoCriado;
  } catch (error) {
    console.error(`❌ Erro ao processar produto:`, error.message);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA CALCULAR PRÓXIMO PAGAMENTO DE CONTRATO
// ============================================
function calcularProximoPagamento(contrato, dataReferencia = new Date()) {
  if (!contrato.modalidadePagamento || contrato.modalidadePagamento === 'Único') {
    return null;
  }
  
  const dataRef = new Date(dataReferencia);
  const modalidade = contrato.modalidadePagamento;
  const diaPagamento = contrato.diaPagamento || 15;

  let proximoPagamento = new Date(dataRef);

  switch (modalidade) {
    case 'Diário': proximoPagamento.setDate(dataRef.getDate() + 1); break;
    case 'Semanal': proximoPagamento.setDate(dataRef.getDate() + 7); break;
    case 'Quinzenal': proximoPagamento.setDate(dataRef.getDate() + 15); break;
    case 'Mensal':
      proximoPagamento.setDate(diaPagamento);
      if (proximoPagamento <= dataRef) proximoPagamento.setMonth(proximoPagamento.getMonth() + 1);
      break;
    case 'Bimestral':
      proximoPagamento.setDate(diaPagamento);
      if (proximoPagamento <= dataRef) proximoPagamento.setMonth(proximoPagamento.getMonth() + 2);
      break;
    case 'Trimestral':
      proximoPagamento.setDate(diaPagamento);
      if (proximoPagamento <= dataRef) proximoPagamento.setMonth(proximoPagamento.getMonth() + 3);
      break;
    case 'Semestral':
      proximoPagamento.setDate(diaPagamento);
      if (proximoPagamento <= dataRef) proximoPagamento.setMonth(proximoPagamento.getMonth() + 6);
      break;
    case 'Anual':
      proximoPagamento.setDate(diaPagamento);
      if (proximoPagamento <= dataRef) proximoPagamento.setFullYear(proximoPagamento.getFullYear() + 1);
      break;
    default: proximoPagamento = null;
  }

  if (proximoPagamento && contrato.dataFim && new Date(proximoPagamento) > new Date(contrato.dataFim)) {
    return null;
  }

  return proximoPagamento;
}

// ============================================
// ROTAS PRINCIPAIS - CRUD
// ============================================

// GET - Listar fornecedores
router.get('/', async (req, res) => {
  try {
    const { status, tipoFornecedor, busca, empresaId } = req.query;
    const query = {};
    
    const empresaIdFinal = empresaId || req.user?.empresaId;
    if (!empresaIdFinal) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    query.empresaId = empresaIdFinal;
    
    if (status && status !== 'todos') {
      query.status = status === 'ativo' ? 'Ativo' : { $ne: 'Ativo' };
    }
    if (tipoFornecedor) query.tipoFornecedor = tipoFornecedor;
    if (busca) {
      query.$or = [
        { nome: { $regex: busca, $options: 'i' } },
        { nif: { $regex: busca, $options: 'i' } },
        { email: { $regex: busca, $options: 'i' } }
      ];
    }

    const fornecedores = await Fornecedor.find(query).sort({ nome: 1 });
    res.json(fornecedores);
  } catch (error) {
    console.error('Erro ao listar fornecedores:', error);
    res.status(500).json({ mensagem: 'Erro ao listar fornecedores', erro: error.message });
  }
});

// GET - Buscar fornecedor por ID
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ mensagem: 'ID inválido' });
    }
    
    const fornecedor = await Fornecedor.findById(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    const empresaUsuario = req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado a este fornecedor' });
    }
    
    res.json(fornecedor);
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar fornecedor', erro: error.message });
  }
});

// POST - Criar novo fornecedor
router.post('/', async (req, res) => {
  try {
    const { 
      nome, nif, empresaId, tipoFornecedor, tipoServico,
      contratos, produtoInfo, regimeTributacao, fiscal, 
      pagamento, status, observacoes, contato, telefone, email, endereco 
    } = req.body;

    const empresaIdFinal = empresaId || req.user?.empresaId;
    if (!empresaIdFinal) {
      return res.status(400).json({ mensagem: 'empresaId é obrigatório' });
    }
    
    if (!nome || !nome.trim()) {
      return res.status(400).json({ mensagem: 'Nome do fornecedor é obrigatório' });
    }
    if (!nif || !nif.trim()) {
      return res.status(400).json({ mensagem: 'NIF é obrigatório' });
    }
    
    const empresa = await Empresa.findById(empresaIdFinal);
    if (!empresa) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    }

    const nifExistente = await Fornecedor.findOne({ nif, empresaId: empresaIdFinal });
    if (nifExistente) {
      return res.status(400).json({ mensagem: 'Já existe um fornecedor com este NIF nesta empresa' });
    }

    const fornecedor = new Fornecedor({
      nome: nome.trim(),
      nif: nif.trim(),
      empresaId: empresaIdFinal,
      empresaNome: empresa.nome,
      telefone: telefone || '',
      email: email || '',
      endereco: endereco || '',
      contato: contato || '',
      tipoFornecedor: tipoFornecedor || tipoServico || 'servicoGeral',
      regimeTributacao: regimeTributacao || '',
      fiscal: {
        suportaIVA: fiscal?.suportaIVA !== false,
        taxaIVA: fiscal?.taxaIVA || 14,
        retencaoFonte: fiscal?.retencaoFonte || false,
        tipoRetencao: fiscal?.tipoRetencao || '',
        taxaRetencao: fiscal?.taxaRetencao || 0
      },
      pagamento: {
        banco: pagamento?.banco || '',
        iban: pagamento?.iban || '',
        swift: pagamento?.swift || '',
        formaPagamento: pagamento?.formaPagamento || 'Transferência'
      },
      contratos: contratos || [],
      produtoInfo: produtoInfo || null,
      status: status || 'Ativo',
      observacoes: observacoes || '',
      criadoPor: req.user?.nome || req.user?.email || 'Sistema'
    });

    await fornecedor.save();
    console.log(`✅ Fornecedor criado: ${fornecedor.nome}`);
    
    let produtoCriado = null;
    let pagamentosGerados = [];
    
    // INTEGRAÇÃO PARA MERCADORIA
    if ((tipoFornecedor === 'mercadoria' || tipoServico === 'mercadoria') && produtoInfo && produtoInfo.produto) {
      console.log(`📦 Processando produto para stock...`);
      produtoCriado = await criarProdutoNoStock(fornecedor, produtoInfo, empresaIdFinal, req.user?.nome || 'Sistema');
      
      if (produtoCriado && produtoCriado._id) {
        fornecedor.produtoInfo = fornecedor.produtoInfo || {};
        fornecedor.produtoInfo.stockId = produtoCriado._id;
        await fornecedor.save();
      }
      
      if (produtoInfo.quantidade > 0 && produtoInfo.precoCompra > 0) {
        const pagamento = await gerarPagamentoCompra(
          fornecedor, 
          produtoInfo.quantidade, 
          produtoInfo.precoCompra, 
          produtoInfo.produto, 
          produtoInfo.unidadeMedida || 'Unidade',
          req.user?.nome || 'Sistema',
          null
        );
        if (pagamento) pagamentosGerados.push(pagamento);
      }
    }
    
    // INTEGRAÇÃO PARA CONTRATOS
    if (contratos && contratos.length > 0) {
      console.log(`📄 Processando ${contratos.length} contratos...`);
      for (const contrato of contratos) {
        contrato.proximoPagamento = calcularProximoPagamento(contrato);
        const pagamento = await gerarPagamentoContrato(fornecedor, contrato, req.user?.nome || 'Sistema');
        if (pagamento) pagamentosGerados.push(pagamento);
      }
    }
    
    res.status(201).json({
      sucesso: true,
      mensagem: `Fornecedor ${fornecedor.nome} cadastrado com sucesso!`,
      _id: fornecedor._id,
      fornecedor: {
        _id: fornecedor._id,
        nome: fornecedor.nome,
        nif: fornecedor.nif,
        tipoFornecedor: fornecedor.tipoFornecedor
      },
      integracao: {
        produtoCriado: produtoCriado ? { _id: produtoCriado._id, produto: produtoCriado.produto } : null,
        pagamentosGerados: pagamentosGerados.length
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar fornecedor:', error);
    res.status(500).json({ mensagem: 'Erro ao criar fornecedor', erro: error.message });
  }
});

// ============================================
// ROTA PARA REGISTRAR NOVA ENTRADA (ADICIONAR QUANTIDADE)
// ============================================

router.post('/:id/adicionar-quantidade', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      quantidade,
      precoCompra,
      precoVenda,
      dataCompra,
      numeroLote,
      dataValidade,
      armazem,
      observacoes
    } = req.body;

    console.log('📦 Recebida requisição:', { id, quantidade, precoCompra });

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID inválido' });
    }

    // Buscar fornecedor
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }

    // Verificar se é mercadoria
    if (fornecedor.tipoFornecedor !== 'mercadoria') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Este fornecedor não é do tipo mercadoria.' 
      });
    }

    // Validar dados
    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Quantidade é obrigatória' });
    }
    if (!precoCompra || precoCompra <= 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Preço de compra é obrigatório' });
    }

    const produtoNome = fornecedor.produtoInfo?.produto;
    if (!produtoNome) {
      return res.status(400).json({ sucesso: false, mensagem: 'Produto não configurado' });
    }

    // Buscar produto no stock
    let produtoStock = await Stock.findOne({
      produto: produtoNome,
      empresaId: fornecedor.empresaId,
      fornecedorId: fornecedor._id
    });

    if (!produtoStock) {
      return res.status(404).json({ sucesso: false, mensagem: 'Produto não encontrado no stock' });
    }

    // ATUALIZAR ESTOQUE
    const quantidadeAntiga = produtoStock.quantidade || 0;
    const novaQuantidade = quantidadeAntiga + quantidade;
    const valorTotalAntigo = (produtoStock.precoCompra || 0) * quantidadeAntiga;
    const valorTotalNovo = precoCompra * quantidade;
    const novoPrecoMedio = novaQuantidade > 0 ? (valorTotalAntigo + valorTotalNovo) / novaQuantidade : precoCompra;
    
    produtoStock.quantidade = novaQuantidade;
    produtoStock.precoCompra = novoPrecoMedio;
    if (precoVenda) produtoStock.precoVenda = precoVenda;
    if (numeroLote) produtoStock.numeroLote = numeroLote;
    if (dataValidade) produtoStock.dataValidade = new Date(dataValidade);
    if (armazem) produtoStock.armazem = armazem;
    produtoStock.updatedAt = new Date();
    await produtoStock.save();

    console.log(`✅ Estoque atualizado: ${produtoStock.produto} - Antes: ${quantidadeAntiga} - Agora: ${novaQuantidade}`);

    // ============================================
    // GERAR PAGAMENTO
    // ============================================
    
    // Calcular valores
    const subtotal = quantidade * precoCompra;
    const suportaIVA = fornecedor.fiscal?.suportaIVA !== false;
    const taxaIVA = suportaIVA ? (fornecedor.fiscal?.taxaIVA || 14) : 0;
    const valorIVA = (subtotal * taxaIVA) / 100;
    const valorTotal = subtotal + valorIVA;

    // Calcular retenção
    let taxaRetencao = 0;
    let valorRetencao = 0;
    
    if (fornecedor.fiscal?.retencaoFonte) {
      taxaRetencao = fornecedor.fiscal?.taxaRetencao || 0;
      if (taxaRetencao === 0 && fornecedor.fiscal?.tipoRetencao === 'Renda') {
        taxaRetencao = 15;
      } else if (taxaRetencao === 0 && fornecedor.fiscal?.tipoRetencao === 'Serviços') {
        taxaRetencao = 6.5;
      }
      valorRetencao = (valorTotal * taxaRetencao) / 100;
    }

    // Gerar referência única para o pagamento
    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await Pagamento.countDocuments({ empresaId: fornecedor.empresaId }) + 1;
    const referencia = `COMP-${ano}${mes}-${String(count).padStart(4, '0')}`;

    // Criar pagamento
    const pagamento = new Pagamento({
      referencia: referencia,
      tipo: 'Fornecedor',
      categoria: 'Operacional',
      subtipo: 'Compra de Mercadoria',
      origemId: fornecedor._id,
      origemModel: 'Fornecedor',
      origemDescricao: `Compra de ${quantidade} ${produtoStock.unidadeMedida}(s) de ${produtoNome}`,
      empresaId: fornecedor.empresaId,
      empresaNome: fornecedor.empresaNome,
      beneficiario: fornecedor.nome,
      beneficiarioDocumento: fornecedor.nif,
      valor: valorTotal,
      valorBruto: valorTotal,
      valorRetencao: valorRetencao,
      taxaRetencao: taxaRetencao,
      valorPago: 0,
      saldo: valorTotal - valorRetencao,
      dataVencimento: dataCompra ? new Date(dataCompra) : new Date(),
      status: 'Pendente',
      descricao: `Compra de ${quantidade} ${produtoStock.unidadeMedida}(s) de ${produtoNome}`,
      observacao: `Preço unitário: ${precoCompra} Kz | IVA: ${taxaIVA}% | Total: ${valorTotal} Kz`,
      formaPagamento: fornecedor.pagamento?.formaPagamento || 'Transferência Bancária',
      contaDebito: fornecedor.pagamento?.iban || 'Conta Principal',
      criadoPor: req.user?.nome || 'Sistema',
      notaInformativa: `Nova entrada de estoque. Quantidade: ${quantidade}`
    });
    
    await pagamento.save();
    console.log(`💰 Pagamento gerado: ${pagamento.referencia} - Valor: ${valorTotal} Kz`);

    // ============================================
    // REGISTRAR NO FORNECEDOR (itensFornecidos)
    // ============================================
    
    if (!fornecedor.itensFornecidos) fornecedor.itensFornecidos = [];
    fornecedor.itensFornecidos.push({
      tipo: 'mercadoria',
      descricao: `Compra de ${quantidade} ${produtoStock.unidadeMedida}(s) de ${produtoNome}`,
      valor: precoCompra,
      valorTotal: valorTotal,
      produto: produtoNome,
      quantidade: quantidade,
      unidadeMedida: produtoStock.unidadeMedida,
      precoCompra: precoCompra,
      precoVenda: precoVenda || produtoStock.precoVenda,
      dataRegisto: dataCompra ? new Date(dataCompra) : new Date(),
      usuario: req.user?.nome || 'Sistema',
      observacoes: observacoes || '',
      pagamentoId: pagamento._id,
      pagamentoReferencia: pagamento.referencia
    });

    // Atualizar estatísticas do fornecedor
    fornecedor.estatisticasCompras = {
      totalCompras: (fornecedor.estatisticasCompras?.totalCompras || 0) + 1,
      totalGasto: (fornecedor.estatisticasCompras?.totalGasto || 0) + valorTotal,
      ultimaCompra: new Date(),
      quantidadeTotalProdutos: (fornecedor.estatisticasCompras?.quantidadeTotalProdutos || 0) + quantidade
    };

    // ATUALIZAR produtoInfo do fornecedor com os novos valores
    if (fornecedor.produtoInfo) {
      fornecedor.produtoInfo.quantidade = novaQuantidade;
      fornecedor.produtoInfo.precoCompra = novoPrecoMedio;
      if (precoVenda) fornecedor.produtoInfo.precoVenda = precoVenda;
      if (numeroLote) fornecedor.produtoInfo.numeroLote = numeroLote;
      if (dataValidade) fornecedor.produtoInfo.dataValidade = new Date(dataValidade);
      if (armazem) fornecedor.produtoInfo.armazem = armazem;
    }

    await fornecedor.save();

    // RESPONDER COM SUCESSO
    res.json({
      sucesso: true,
      mensagem: `✅ Compra registrada! Estoque: ${quantidadeAntiga} → ${novaQuantidade} ${produtoStock.unidadeMedida}`,
      dados: {
        produto: {
          nome: produtoStock.produto,
          quantidadeAnterior: quantidadeAntiga,
          quantidadeAtual: novaQuantidade,
          precoMedio: novoPrecoMedio
        },
        compra: {
          quantidade: quantidade,
          precoUnitario: precoCompra,
          subtotal: subtotal,
          iva: valorIVA,
          total: valorTotal,
          retencao: valorRetencao
        },
        pagamento: {
          referencia: pagamento.referencia,
          valor: valorTotal,
          status: pagamento.status,
          dataVencimento: pagamento.dataVencimento
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao registrar compra:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao registrar compra', 
      erro: error.message,
      stack: error.stack
    });
  }
});

// ============================================
// ROTA PARA LISTAR PAGAMENTOS DO FORNECEDOR
// ============================================

router.get('/:id/pagamentos', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensagem: 'ID inválido' });
    }
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    const pagamentos = await Pagamento.find({
      tipo: 'Fornecedor',
      origemId: id,
      empresaId: fornecedor.empresaId
    }).sort({ dataVencimento: -1 });
    
    res.json({
      fornecedor: {
        _id: fornecedor._id,
        nome: fornecedor.nome,
        nif: fornecedor.nif
      },
      pagamentos,
      resumo: {
        totalPendente: pagamentos.filter(p => p.status === 'Pendente').reduce((sum, p) => sum + (p.saldo || p.valor), 0),
        totalPago: pagamentos.filter(p => p.status === 'Pago').reduce((sum, p) => sum + p.valor, 0),
        totalGeral: pagamentos.reduce((sum, p) => sum + p.valor, 0)
      }
    });
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ mensagem: 'Erro ao listar pagamentos', erro: error.message });
  }
});

// PUT - Atualizar fornecedor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nif, ...atualizacoes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensagem: 'ID inválido' });
    }

    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    const empresaUsuario = req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado a este fornecedor' });
    }

    if (nif && nif !== fornecedor.nif) {
      const nifExistente = await Fornecedor.findOne({
        nif,
        empresaId: fornecedor.empresaId,
        _id: { $ne: id }
      });
      if (nifExistente) {
        return res.status(400).json({ mensagem: 'Já existe um fornecedor com este NIF nesta empresa' });
      }
      atualizacoes.nif = nif;
    }

    Object.assign(fornecedor, atualizacoes);
    fornecedor.atualizadoPor = req.user?.nome || 'Sistema';
    fornecedor.updatedAt = new Date();
    await fornecedor.save();

    res.json({
      sucesso: true,
      mensagem: `Fornecedor ${fornecedor.nome} atualizado com sucesso!`,
      _id: fornecedor._id,
      fornecedor
    });
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar fornecedor', erro: error.message });
  }
});

// DELETE - Excluir fornecedor (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensagem: 'ID inválido' });
    }
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    const empresaUsuario = req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado a este fornecedor' });
    }
    
    fornecedor.status = 'Inativo';
    fornecedor.atualizadoPor = req.user?.nome || 'Sistema';
    await fornecedor.save();
    
    res.json({ 
      sucesso: true, 
      mensagem: `Fornecedor ${fornecedor.nome} desativado com sucesso`,
      _id: fornecedor._id
    });
  } catch (error) {
    console.error('Erro ao excluir fornecedor:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir fornecedor', erro: error.message });
  }
});

module.exports = router;