// backend/routes/fornecedores.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Fornecedor = require('../models/Fornecedor');
const Empresa = require('../models/Empresa');
const Stock = require('../models/Stock');
const Pagamento = require('../models/Pagamento');
const { verifyToken } = require('../middlewares/auth');

// Aplicar autenticação em todas as rotas
router.use(verifyToken);

// ============================================
// FUNÇÃO PARA CRIAR PRODUTO NO STOCK
// ============================================
async function criarProdutoNoStock(fornecedor, produtoInfo, empresaId, usuario) {
  try {
    // Verificar se o produto já existe para este fornecedor
    const produtoExistente = await Stock.findOne({
      produto: produtoInfo.produto,
      empresaId: new mongoose.Types.ObjectId(empresaId),
      fornecedorId: fornecedor._id
    });

    if (produtoExistente) {
      // Atualizar produto existente
      produtoExistente.precoCompra = produtoInfo.precoCompra || produtoExistente.precoCompra;
      produtoExistente.precoVenda = produtoInfo.precoVenda || produtoExistente.precoVenda;
      produtoExistente.quantidade += produtoInfo.quantidade || 0;
      produtoExistente.dataValidade = produtoInfo.dataValidade || produtoExistente.dataValidade;
      produtoExistente.ultimoFornecedor = fornecedor._id;
      produtoExistente.updatedAt = new Date();
      await produtoExistente.save();
      console.log(`📦 Produto atualizado no stock: ${produtoExistente.produto}`);
      return produtoExistente;
    }

    // Criar novo produto
    const produto = new Stock({
      produto: produtoInfo.produto,
      empresaId: new mongoose.Types.ObjectId(empresaId),
      tipo: 'produto',
      codigoBarras: produtoInfo.codigoBarras || '',
      codigoInterno: produtoInfo.codigoInterno || '',
      categoria: produtoInfo.categoria || 'Geral',
      marca: produtoInfo.marca || '',
      unidadeMedida: produtoInfo.unidadeMedida || 'Unidade',
      precoCompra: produtoInfo.precoCompra || 0,
      precoVenda: produtoInfo.precoVenda || 0,
      quantidade: produtoInfo.quantidade || 0,
      quantidadeMinima: produtoInfo.quantidadeMinima || 5,
      dataValidade: produtoInfo.dataValidade || null,
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
    console.log(`📦 Produto criado no stock: ${produto.produto}`);
    return produto;
  } catch (error) {
    console.error(`❌ Erro ao criar produto no stock:`, error.message);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA GERAR PAGAMENTO DE CONTRATO
// ============================================
async function gerarPagamentoContrato(fornecedor, contrato, usuario) {
  try {
    const hoje = new Date();
    const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    
    let taxaRetencao = 0;
    if (fornecedor.fiscal?.retencaoFonte) {
      if (fornecedor.fiscal.taxaRetencao > 0) {
        taxaRetencao = fornecedor.fiscal.taxaRetencao;
      } else if (fornecedor.fiscal.tipoRetencao === 'Renda') {
        taxaRetencao = 15;
      } else if (fornecedor.fiscal.tipoRetencao === 'Serviços') {
        taxaRetencao = 6.5;
      }
    }
    
    const valorRetencao = (contrato.valor * taxaRetencao) / 100;
    const valorLiquido = contrato.valor - valorRetencao;
    
    const pagamento = new Pagamento({
      tipo: 'Fornecedor',
      origemId: fornecedor._id,
      beneficiario: fornecedor.nome,
      nifBeneficiario: fornecedor.nif,
      valor: contrato.valor,
      valorLiquido: valorLiquido,
      valorRetencao: valorRetencao,
      taxaRetencao: taxaRetencao,
      dataVencimento: contrato.proximoPagamento || new Date(),
      status: 'pendente',
      descricao: `Pagamento - ${contrato.descricao || fornecedor.tipoFornecedor || 'Serviço'}`,
      usuario: usuario,
      empresaId: fornecedor.empresaId,
      detalhesPagamento: {
        contaBancaria: fornecedor.pagamento?.iban || '',
        modalidade: fornecedor.pagamento?.formaPagamento || 'Transferência',
        mesReferencia: mesReferencia
      }
    });
    
    await pagamento.save();
    console.log(`💰 Pagamento gerado: ${pagamento._id}`);
    return pagamento;
  } catch (error) {
    console.error('❌ Erro ao gerar pagamento:', error.message);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA CALCULAR PRÓXIMO PAGAMENTO
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

  // Verificar se a data calculada é posterior à data de fim do contrato
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
    
    // Usar empresaId do query ou do usuário logado
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
        { email: { $regex: busca, $options: 'i' } },
        { contato: { $regex: busca, $options: 'i' } }
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
    
    // Verificar acesso do usuário
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

    // Validação de empresaId
    const empresaIdFinal = empresaId || req.user?.empresaId;
    if (!empresaIdFinal) {
      return res.status(400).json({ mensagem: 'empresaId é obrigatório' });
    }
    
    // Validação de campos obrigatórios
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
    
    // 🔥 INTEGRAÇÃO AUTOMÁTICA PARA MERCADORIA
    if ((tipoFornecedor === 'mercadoria' || tipoServico === 'mercadoria') && produtoInfo && produtoInfo.produto) {
      console.log(`📦 Processando produto para stock...`);
      produtoCriado = await criarProdutoNoStock(fornecedor, produtoInfo, empresaIdFinal, req.user?.nome || 'Sistema');
      
      if (produtoCriado && produtoCriado._id) {
        fornecedor.produtoInfo = fornecedor.produtoInfo || {};
        fornecedor.produtoInfo.stockId = produtoCriado._id;
        await fornecedor.save();
      }
    }
    
    // 🔥 INTEGRAÇÃO AUTOMÁTICA PARA CONTRATOS
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

// PUT - Atualizar fornecedor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nif, itens, ...atualizacoes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensagem: 'ID inválido' });
    }

    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    // Verificar acesso
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
    
    // Converter itens para itensFornecidos
    if (itens && !atualizacoes.itensFornecidos) {
      atualizacoes.itensFornecidos = itens;
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
    
    // Verificar acesso
    const empresaUsuario = req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado a este fornecedor' });
    }
    
    // Soft delete - apenas desativa
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

// ============================================
// CRUD DE ITENS FORNECIDOS
// ============================================

// GET - Listar itens de um fornecedor
router.get('/:id/itens', async (req, res) => {
  try {
    const { id } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    res.json({ sucesso: true, dados: fornecedor.itensFornecidos || [] });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

// POST - Adicionar item
router.post('/:id/itens', async (req, res) => {
  try {
    const { id } = req.params;
    const item = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    if (!fornecedor.itensFornecidos) fornecedor.itensFornecidos = [];
    fornecedor.itensFornecidos.push({ 
      ...item, 
      usuario: req.user?.nome || 'Sistema', 
      dataRegisto: new Date() 
    });
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Item adicionado com sucesso', item });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

// PUT - Atualizar item
router.put('/:id/itens/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const updates = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    const itemIndex = fornecedor.itensFornecidos.findIndex(i => i._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ mensagem: 'Item não encontrado' });
    }
    
    Object.assign(fornecedor.itensFornecidos[itemIndex], updates);
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Item atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

// DELETE - Remover item
router.delete('/:id/itens/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    fornecedor.itensFornecidos = fornecedor.itensFornecidos.filter(i => i._id.toString() !== itemId);
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Item removido com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

// ============================================
// CRUD DE CONTRATOS
// ============================================

// GET - Listar contratos de um fornecedor
router.get('/:id/contratos', async (req, res) => {
  try {
    const { id } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    res.json({ sucesso: true, dados: fornecedor.contratos || [] });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

// POST - Adicionar contrato
router.post('/:id/contratos', async (req, res) => {
  try {
    const { id } = req.params;
    const contrato = req.body;

    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }

    if (!contrato.descricao || !contrato.valor || !contrato.dataInicio || !contrato.dataFim) {
      return res.status(400).json({ mensagem: 'Campos obrigatórios do contrato não preenchidos' });
    }

    const proximoPagamento = calcularProximoPagamento(contrato);

    fornecedor.contratos = fornecedor.contratos || [];
    fornecedor.contratos.push({ ...contrato, proximoPagamento });
    
    // Atualizar próximo pagamento geral do fornecedor
    const hoje = new Date();
    const pagamentosFuturos = fornecedor.contratos
      .filter(c => c.proximoPagamento && new Date(c.proximoPagamento) > hoje)
      .map(c => new Date(c.proximoPagamento))
      .sort((a, b) => a - b);
    
    fornecedor.proximoPagamento = pagamentosFuturos[0] || null;
    
    await fornecedor.save();

    // Gerar pagamento para o novo contrato
    const pagamento = await gerarPagamentoContrato(fornecedor, contrato, req.user?.nome || 'Sistema');

    res.json({
      sucesso: true,
      mensagem: 'Contrato adicionado com sucesso',
      contrato: fornecedor.contratos[fornecedor.contratos.length - 1],
      pagamento
    });
  } catch (error) {
    console.error('Erro ao adicionar contrato:', error);
    res.status(500).json({ mensagem: 'Erro ao adicionar contrato', erro: error.message });
  }
});

// PUT - Atualizar contrato
router.put('/:id/contratos/:contratoId', async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    const updates = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    const contratoIndex = fornecedor.contratos.findIndex(c => c._id.toString() === contratoId);
    if (contratoIndex === -1) {
      return res.status(404).json({ mensagem: 'Contrato não encontrado' });
    }
    
    Object.assign(fornecedor.contratos[contratoIndex], updates);
    
    // Recalcular próximo pagamento do contrato atualizado
    if (updates.valor || updates.modalidadePagamento || updates.diaPagamento) {
      fornecedor.contratos[contratoIndex].proximoPagamento = calcularProximoPagamento(fornecedor.contratos[contratoIndex]);
    }
    
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Contrato atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

// DELETE - Remover contrato
router.delete('/:id/contratos/:contratoId', async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    const contratoIndex = fornecedor.contratos.findIndex(c => c._id.toString() === contratoId);
    if (contratoIndex === -1) {
      return res.status(404).json({ mensagem: 'Contrato não encontrado' });
    }
    
    fornecedor.contratos.splice(contratoIndex, 1);
    
    // Recalcular próximo pagamento geral
    const hoje = new Date();
    const pagamentosFuturos = fornecedor.contratos
      .filter(c => c.proximoPagamento && new Date(c.proximoPagamento) > hoje)
      .map(c => new Date(c.proximoPagamento))
      .sort((a, b) => a - b);
    
    fornecedor.proximoPagamento = pagamentosFuturos[0] || null;
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Contrato removido com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir contrato:', error);
    res.status(500).json({ mensagem: error.message });
  }
});

// ============================================
// ROTA DE PAGAMENTOS
// ============================================

// GET - Listar pagamentos de um fornecedor
router.get('/:id/pagamentos', async (req, res) => {
  try {
    const { id } = req.params;
    
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
      pagamentos
    });
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ mensagem: 'Erro ao listar pagamentos', erro: error.message });
  }
});

// POST - Gerar pagamento para um contrato específico
router.post('/:id/contratos/:contratoId/gerar-pagamento', async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    const contrato = fornecedor.contratos.find(c => c._id.toString() === contratoId);
    if (!contrato) {
      return res.status(404).json({ sucesso: false, mensagem: 'Contrato não encontrado' });
    }
    
    const pagamento = await gerarPagamentoContrato(fornecedor, contrato, req.user?.nome || 'Sistema - Manual');
    
    if (pagamento) {
      res.json({
        sucesso: true,
        mensagem: `Pagamento gerado com sucesso`,
        pagamento
      });
    } else {
      res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar pagamento' });
    }
  } catch (error) {
    console.error('Erro ao gerar pagamento:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// POST - Gerar pagamentos automáticos
router.post('/gerar-pagamentos', async (req, res) => {
  try {
    const { empresaId } = req.body;
    const query = { status: 'Ativo' };
    if (empresaId) query.empresaId = empresaId;
    
    const fornecedores = await Fornecedor.find(query);
    let pagamentosGerados = 0;
    
    for (const fornecedor of fornecedores) {
      for (const contrato of fornecedor.contratos || []) {
        const dataFim = new Date(contrato.dataFim);
        if (dataFim < new Date()) continue;
        if (contrato.modalidadePagamento === 'Único') continue;
        
        const hoje = new Date();
        const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        
        const pagamentoExistente = await Pagamento.findOne({
          tipo: 'Fornecedor',
          origemId: fornecedor._id,
          'detalhesPagamento.mesReferencia': mesReferencia
        });
        
        if (!pagamentoExistente && contrato.proximoPagamento) {
          const pagamento = await gerarPagamentoContrato(fornecedor, contrato, 'Sistema - Automático');
          if (pagamento) pagamentosGerados++;
        }
      }
    }
    
    res.json({ sucesso: true, mensagem: `${pagamentosGerados} pagamentos gerados`, pagamentosGerados });
  } catch (error) {
    console.error('Erro ao gerar pagamentos:', error);
    res.status(500).json({ mensagem: 'Erro ao gerar pagamentos', erro: error.message });
  }
});

// ============================================
// ROTAS DE ESTATÍSTICAS
// ============================================

// GET - Estatísticas do fornecedor
router.get('/:id/estatisticas', async (req, res) => {
  try {
    const { id } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    const pagamentos = await Pagamento.find({ tipo: 'Fornecedor', origemId: id });
    const totalPago = pagamentos.filter(p => p.status === 'Pago').reduce((sum, p) => sum + p.valor, 0);
    const totalPendente = pagamentos.filter(p => p.status === 'pendente').reduce((sum, p) => sum + p.valor, 0);
    
    res.json({
      fornecedor: {
        _id: fornecedor._id,
        nome: fornecedor.nome,
        nif: fornecedor.nif,
        tipoFornecedor: fornecedor.tipoFornecedor,
        status: fornecedor.status
      },
      estatisticas: {
        totalCompras: fornecedor.estatisticasCompras?.totalCompras || 0,
        totalGasto: fornecedor.estatisticasCompras?.totalGasto || 0,
        totalPago,
        totalPendente,
        itensFornecidos: fornecedor.itensFornecidos?.length || 0,
        contratosAtivos: fornecedor.contratos?.filter(c => new Date(c.dataFim) > new Date()).length || 0
      },
      ultimosPagamentos: pagamentos.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

module.exports = router;