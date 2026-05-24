// backend/controllers/stockController.js
const Stock = require('../models/Stock');
const mongoose = require('mongoose');

// ============================================
// FUNÇÕES AUXILIARES BLINDADAS
// ============================================

const validarObjectId = (id, nome = 'ID') => {
  if (!id) throw new Error(`${nome} não informado`);
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error(`${nome} inválido`);
  return new mongoose.Types.ObjectId(id);
};

const sanitizarString = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
};

const validarNumero = (valor, min = 0, max = Infinity, padrao = 0) => {
  const num = parseFloat(valor);
  if (isNaN(num)) return padrao;
  if (num < min) return min;
  if (num > max) return max;
  return num;
};

const validarData = (data, obrigatorio = false) => {
  if (!data) return obrigatorio ? null : undefined;
  const dataObj = new Date(data);
  if (isNaN(dataObj.getTime())) return null;
  return dataObj;
};

// ============================================
// FUNÇÕES AUXILIARES PARA SERVIÇOS
// ============================================

const validarServico = (dados) => {
  const erros = [];
  
  if (dados.tipo === 'servico') {
    // Validações específicas para serviços
    if (dados.duracaoEstimada && dados.duracaoEstimada < 0) {
      erros.push('Duração estimada não pode ser negativa');
    }
    // Serviços não precisam de quantidade, validade, etc.
  }
  
  return erros;
};

const calcularValorTotalStock = async (empresaId, tipo = null) => {
  try {
    const empresaIdObj = validarObjectId(empresaId, 'Empresa');
    const filtro = { empresaId: empresaIdObj, ativo: true };
    if (tipo) filtro.tipo = tipo;
    
    const resultado = await Stock.aggregate([
      { $match: filtro },
      { $group: {
        _id: null,
        totalQuantidade: { $sum: { $cond: [{ $eq: ["$tipo", "produto"] }, "$quantidade", 0] } },
        totalValorCompra: { $sum: { $multiply: [{ $ifNull: ["$quantidade", 1] }, "$precoCompra"] } },
        totalValorVenda: { $sum: { $multiply: [{ $ifNull: ["$quantidade", 1] }, "$precoVenda"] } },
        totalLucroEstimado: { $sum: { $multiply: [{ $ifNull: ["$quantidade", 1] }, { $subtract: ["$precoVenda", "$precoCompra"] }] } }
      }}
    ]);
    
    return resultado[0] || { 
      totalQuantidade: 0, 
      totalValorCompra: 0, 
      totalValorVenda: 0, 
      totalLucroEstimado: 0 
    };
  } catch (error) {
    console.error('Erro ao calcular valor total:', error);
    return { totalQuantidade: 0, totalValorCompra: 0, totalValorVenda: 0, totalLucroEstimado: 0 };
  }
};

const calcularProdutosVencidos = async (empresaId) => {
  try {
    const empresaIdObj = validarObjectId(empresaId, 'Empresa');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return await Stock.countDocuments({
      empresaId: empresaIdObj,
      tipo: 'produto',
      dataValidade: { $lt: hoje },
      ativo: true
    });
  } catch (error) {
    console.error('Erro ao calcular produtos vencidos:', error);
    return 0;
  }
};

const calcularProdutosProximosVencer = async (empresaId, dias = 30) => {
  try {
    const empresaIdObj = validarObjectId(empresaId, 'Empresa');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const limite = new Date();
    limite.setDate(limite.getDate() + parseInt(dias));
    limite.setHours(23, 59, 59, 999);
    
    return await Stock.countDocuments({
      empresaId: empresaIdObj,
      tipo: 'produto',
      dataValidade: { $gte: hoje, $lte: limite },
      ativo: true
    });
  } catch (error) {
    console.error('Erro ao calcular produtos próximos a vencer:', error);
    return 0;
  }
};

const calcularProdutosEstoqueBaixo = async (empresaId) => {
  try {
    const empresaIdObj = validarObjectId(empresaId, 'Empresa');
    
    return await Stock.countDocuments({
      empresaId: empresaIdObj,
      tipo: 'produto',
      $expr: { $lte: ["$quantidade", "$quantidadeMinima"] },
      ativo: true,
      quantidade: { $gt: 0 }
    });
  } catch (error) {
    console.error('Erro ao calcular produtos com estoque baixo:', error);
    return 0;
  }
};

// ============================================
// CRUD PRINCIPAL BLINDADO
// ============================================

// GET - Listar todos os itens (produtos e serviços)
exports.getAllStock = async (req, res) => {
  try {
    const { 
      empresaId, 
      search, 
      categoria, 
      tipo,
      statusEstoque, 
      statusValidade, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Validação inicial
    if (!empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa não informada" 
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "ID da empresa inválido" 
      });
    }
    
    const empresaIdObj = new mongoose.Types.ObjectId(empresaId);
    const filtro = { empresaId: empresaIdObj, ativo: true };
    
    // Filtrar por tipo (produto ou serviço)
    if (tipo && ['produto', 'servico'].includes(tipo)) {
      filtro.tipo = tipo;
    }
    
    // Busca por texto
    if (search && typeof search === 'string') {
      const searchSanitized = sanitizarString(search);
      filtro.$or = [
        { produto: { $regex: searchSanitized, $options: 'i' } },
        { codigoBarras: { $regex: searchSanitized, $options: 'i' } },
        { codigoInterno: { $regex: searchSanitized, $options: 'i' } }
      ];
    }
    
    // Filtrar por categoria
    if (categoria) {
      filtro.categoria = categoria;
    }
    
    // Paginação segura
    const pagina = Math.max(1, parseInt(page) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pagina - 1) * limite;
    
    const [itens, total] = await Promise.all([
      Stock.find(filtro)
        .select('-__v')
        .sort({ tipo: 1, createdAt: -1 })
        .skip(skip)
        .limit(limite)
        .lean(),
      Stock.countDocuments(filtro)
    ]);
    
    res.json({
      sucesso: true,
      dados: itens,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite)
    });
    
  } catch (error) {
    console.error('Erro em getAllStock:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar itens" 
    });
  }
};

// GET - Estatísticas do stock
exports.getStockStats = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const empresaIdObj = new mongoose.Types.ObjectId(empresaId);
    
    const [totaisProdutos, totaisServicos, vencidos, proximosVencer, baixoEstoque, categorias, totalProdutos, totalServicos] = await Promise.all([
      calcularValorTotalStock(empresaIdObj, 'produto'),
      calcularValorTotalStock(empresaIdObj, 'servico'),
      calcularProdutosVencidos(empresaIdObj),
      calcularProdutosProximosVencer(empresaIdObj),
      calcularProdutosEstoqueBaixo(empresaIdObj),
      Stock.aggregate([
        { $match: { empresaId: empresaIdObj, ativo: true } },
        { $group: { 
          _id: "$categoria", 
          quantidade: { $sum: 1 }, 
          valor: { $sum: { $multiply: [{ $ifNull: ["$quantidade", 1] }, "$precoVenda"] } } 
        }},
        { $sort: { quantidade: -1 } },
        { $limit: 10 }
      ]),
      Stock.countDocuments({ empresaId: empresaIdObj, ativo: true, tipo: 'produto' }),
      Stock.countDocuments({ empresaId: empresaIdObj, ativo: true, tipo: 'servico' })
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        totalProdutos,
        totalServicos,
        totalItens: totalProdutos + totalServicos,
        totalQuantidadeProdutos: totaisProdutos.totalQuantidade || 0,
        valorTotalProdutos: totaisProdutos.totalValorVenda || 0,
        valorTotalServicos: totaisServicos.totalValorVenda || 0,
        valorTotalGeral: (totaisProdutos.totalValorVenda || 0) + (totaisServicos.totalValorVenda || 0),
        lucroEstimadoProdutos: totaisProdutos.totalLucroEstimado || 0,
        lucroEstimadoServicos: totaisServicos.totalLucroEstimado || 0,
        vencidos: vencidos || 0,
        proximosVencer: proximosVencer || 0,
        baixoEstoque: baixoEstoque || 0,
        categorias: categorias || []
      }
    });
    
  } catch (error) {
    console.error('Erro em getStockStats:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar estatísticas" 
    });
  }
};

// GET - Itens com estoque baixo (apenas produtos)
exports.getEstoqueBaixo = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const produtos = await Stock.find({
      empresaId: new mongoose.Types.ObjectId(empresaId),
      tipo: 'produto',
      ativo: true,
      $expr: { $lte: ["$quantidade", "$quantidadeMinima"] },
      quantidade: { $gt: 0 }
    })
    .select('-__v')
    .sort({ quantidade: 1 })
    .limit(20)
    .lean();
    
    res.json({ sucesso: true, dados: produtos });
    
  } catch (error) {
    console.error('Erro em getEstoqueBaixo:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar produtos com estoque baixo" 
    });
  }
};

// GET - Itens próximos a vencer (apenas produtos)
exports.getProximosVencer = async (req, res) => {
  try {
    const { empresaId, dias = 30 } = req.query;
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const limite = new Date();
    limite.setDate(limite.getDate() + Math.min(365, Math.max(1, parseInt(dias) || 30)));
    limite.setHours(23, 59, 59, 999);
    
    const produtos = await Stock.find({
      empresaId: new mongoose.Types.ObjectId(empresaId),
      tipo: 'produto',
      ativo: true,
      dataValidade: { $gte: hoje, $lte: limite }
    })
    .select('-__v')
    .sort({ dataValidade: 1 })
    .limit(20)
    .lean();
    
    res.json({ sucesso: true, dados: produtos });
    
  } catch (error) {
    console.error('Erro em getProximosVencer:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar produtos próximos a vencer" 
    });
  }
};

// GET - Produtos vencidos (apenas produtos)
exports.getProdutosVencidos = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const produtos = await Stock.find({
      empresaId: new mongoose.Types.ObjectId(empresaId),
      tipo: 'produto',
      ativo: true,
      dataValidade: { $lt: hoje },
      quantidade: { $gt: 0 }
    })
    .select('-__v')
    .sort({ dataValidade: 1 })
    .lean();
    
    res.json({ sucesso: true, dados: produtos });
    
  } catch (error) {
    console.error('Erro em getProdutosVencidos:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar produtos vencidos" 
    });
  }
};

// GET - Buscar por código de barras
exports.getStockByCodigoBarras = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { empresaId } = req.query;
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    if (!codigo || typeof codigo !== 'string') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Código de barras inválido" 
      });
    }
    
    const item = await Stock.findOne({ 
      empresaId: new mongoose.Types.ObjectId(empresaId),
      codigoBarras: sanitizarString(codigo), 
      ativo: true 
    })
    .select('-__v')
    .lean();
    
    if (!item) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Item não encontrado" 
      });
    }
    
    res.json({ sucesso: true, dados: item });
    
  } catch (error) {
    console.error('Erro em getStockByCodigoBarras:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar item" 
    });
  }
};

// GET - Item por ID
exports.getStockById = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.query;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "ID do item inválido" 
      });
    }
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const item = await Stock.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId),
      ativo: true
    })
    .select('-__v')
    .lean();
    
    if (!item) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Item não encontrado" 
      });
    }
    
    res.json({ sucesso: true, dados: item });
    
  } catch (error) {
    console.error('Erro em getStockById:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar item" 
    });
  }
};

// ============================================
// POST - Criar item (produto ou serviço) - CORRIGIDO
// ============================================
exports.createStock = async (req, res) => {
  try {
    const { empresaId, tipo = 'produto' } = req.body;
    
    console.log('📦 Recebendo dados:', JSON.stringify(req.body, null, 2));
    
    // 1. VALIDAÇÃO DA EMPRESA
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const empresaIdObj = new mongoose.Types.ObjectId(empresaId);
    
    // 2. VALIDAÇÃO DO NOME (OBRIGATÓRIO)
    const nome = sanitizarString(req.body.produto);
    if (!nome) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Nome do item é obrigatório" 
      });
    }
    
    // 3. VALIDAÇÃO DO PREÇO DE VENDA (OBRIGATÓRIO)
    const precoVenda = validarNumero(req.body.precoVenda, 0);
    if (precoVenda <= 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Preço de venda deve ser maior que zero" 
      });
    }
    
    // 4. VERIFICAR DUPLICATA POR NOME
    const existeItem = await Stock.findOne({ 
      empresaId: empresaIdObj, 
      produto: nome 
    });
    
    if (existeItem) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Já existe um item com o nome "${nome}" para esta empresa` 
      });
    }
    
    // 5. VERIFICAR DUPLICATA POR CÓDIGO DE BARRAS (SE FORNECIDO)
    if (req.body.codigoBarras) {
      const existeCodigo = await Stock.findOne({ 
        empresaId: empresaIdObj, 
        codigoBarras: sanitizarString(req.body.codigoBarras) 
      });
      if (existeCodigo) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: `Código de barras "${req.body.codigoBarras}" já está em uso` 
        });
      }
    }
    
    // 6. VERIFICAR DUPLICATA POR CÓDIGO INTERNO (SE FORNECIDO)
    if (req.body.codigoInterno) {
      const existeCodigoInterno = await Stock.findOne({ 
        empresaId: empresaIdObj, 
        codigoInterno: sanitizarString(req.body.codigoInterno) 
      });
      if (existeCodigoInterno) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: `Código interno "${req.body.codigoInterno}" já está em uso` 
        });
      }
    }
    
    // 7. DADOS COMUNS (produto e serviço)
    const itemData = {
      produto: nome,
      empresaId: empresaIdObj,
      tipo: tipo,
      precoVenda: precoVenda,
      categoria: req.body.categoria || 'Geral',
      unidadeMedida: req.body.unidadeMedida || 'Unidade',
      taxaIVA: validarNumero(req.body.taxaIVA, 0, 36, 14),
      observacoes: req.body.observacoes || '',
      ativo: true,
      criadoPor: req.user?.nome || "Sistema",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 8. CAMPOS ESPECÍFICOS PARA PRODUTO
    if (tipo === 'produto') {
      const precoCompra = validarNumero(req.body.precoCompra, 0);
      if (precoCompra <= 0) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: "Preço de compra deve ser maior que zero para produtos" 
        });
      }
      
      if (precoVenda < precoCompra) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: "Preço de venda não pode ser menor que o preço de compra" 
        });
      }
      
      // DATA DE VALIDADE - OBRIGATÓRIA PARA PRODUTOS
      if (!req.body.dataValidade) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: "Data de validade é obrigatória para produtos" 
        });
      }
      
      const dataValidade = validarData(req.body.dataValidade, true);
      if (!dataValidade) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: "Data de validade inválida" 
        });
      }
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (dataValidade <= hoje) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: "Data de validade deve ser futura" 
        });
      }
      
      itemData.precoCompra = precoCompra;
      itemData.dataValidade = dataValidade;
      itemData.quantidade = validarNumero(req.body.quantidade, 0, 999999, 0);
      itemData.quantidadeMinima = validarNumero(req.body.quantidadeMinima, 0, 999999, 5);
      itemData.quantidadeMaxima = validarNumero(req.body.quantidadeMaxima, 0, 999999, 1000);
      itemData.armazem = sanitizarString(req.body.armazem) || "Principal";
      itemData.fornecedor = sanitizarString(req.body.fornecedor) || "";
      itemData.numeroLote = sanitizarString(req.body.numeroLote) || "";
      itemData.marca = sanitizarString(req.body.marca) || "";
      itemData.controlaValidade = req.body.controlaValidade !== false;
      
      if (itemData.quantidade > 0) {
        itemData.dataUltimaEntrada = new Date();
      }
      
    } else if (tipo === 'servico') {
      // 9. CAMPOS ESPECÍFICOS PARA SERVIÇO
      itemData.quantidade = 0;
      itemData.controlaValidade = false;
      itemData.duracaoEstimada = validarNumero(req.body.duracaoEstimada, 0);
      itemData.unidadeTempo = req.body.unidadeTempo || 'horas';
      itemData.precoHora = validarNumero(req.body.precoHora, 0);
      itemData.executadoPor = sanitizarString(req.body.executadoPor) || '';
      itemData.requerAgendamento = req.body.requerAgendamento === true;
      itemData.localExecucao = sanitizarString(req.body.localExecucao) || '';
      itemData.recursosNecessarios = sanitizarString(req.body.recursosNecessarios) || '';
      itemData.instrucoes = sanitizarString(req.body.instrucoes) || '';
      
      // Remover campos que não se aplicam a serviços
      delete itemData.precoCompra;
      delete itemData.dataValidade;
      delete itemData.quantidadeMinima;
      delete itemData.quantidadeMaxima;
      delete itemData.armazem;
      delete itemData.fornecedor;
      delete itemData.numeroLote;
      delete itemData.dataUltimaEntrada;
    }
    
    // 10. SALVAR NO BANCO
    const item = new Stock(itemData);
    await item.save();
    
    console.log(`✅ ${tipo === 'produto' ? 'Produto' : 'Serviço'} criado: ${item.produto}`);
    
    res.status(201).json({ 
      sucesso: true, 
      mensagem: tipo === 'produto' ? "Produto cadastrado com sucesso" : "Serviço cadastrado com sucesso",
      dados: item 
    });
    
  } catch (error) {
    console.error('❌ Erro em createStock:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Código de barras ou código interno já existe" 
      });
    }
    
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao cadastrar item: " + error.message 
    });
  }
};


// PUT - Atualizar item (produto ou serviço)
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.body;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "ID do item inválido" 
      });
    }
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const item = await Stock.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!item) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Item não encontrado" 
      });
    }
    
    // Verificar duplicatas em atualização
    if (req.body.codigoBarras && req.body.codigoBarras !== item.codigoBarras) {
      const existeCodigoBarras = await Stock.findOne({ 
        _id: { $ne: id },
        empresaId: item.empresaId, 
        codigoBarras: sanitizarString(req.body.codigoBarras) 
      });
      if (existeCodigoBarras) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: `Código de barras "${req.body.codigoBarras}" já está em uso` 
        });
      }
    }
    
    if (req.body.codigoInterno && req.body.codigoInterno !== item.codigoInterno) {
      const existeCodigoInterno = await Stock.findOne({ 
        _id: { $ne: id },
        empresaId: item.empresaId, 
        codigoInterno: sanitizarString(req.body.codigoInterno) 
      });
      if (existeCodigoInterno) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: `Código interno "${req.body.codigoInterno}" já está em uso` 
        });
      }
    }
    
    // Atualizar campos comuns
    item.produto = req.body.produto ? sanitizarString(req.body.produto) : item.produto;
    item.codigoBarras = req.body.codigoBarras ? sanitizarString(req.body.codigoBarras) : item.codigoBarras;
    item.codigoInterno = req.body.codigoInterno ? sanitizarString(req.body.codigoInterno) : item.codigoInterno;
    item.categoria = req.body.categoria || item.categoria;
    item.marca = req.body.marca || item.marca;
    item.precoVenda = validarNumero(req.body.precoVenda, 0, Infinity, item.precoVenda);
    item.taxaIVA = validarNumero(req.body.taxaIVA, 0, 36, item.taxaIVA);
    item.fornecedor = req.body.fornecedor || item.fornecedor;
    item.observacoes = req.body.observacoes || item.observacoes;
    item.atualizadoPor = req.user?.nome || "Sistema";
    item.updatedAt = new Date();
    
    if (item.tipo === 'produto') {
      const novoPrecoCompra = req.body.precoCompra ? validarNumero(req.body.precoCompra, 0) : item.precoCompra;
      const novoPrecoVenda = item.precoVenda;
      
      if (novoPrecoVenda < novoPrecoCompra) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: "Preço de venda não pode ser menor que o preço de compra" 
        });
      }
      
      item.precoCompra = novoPrecoCompra;
      item.quantidadeMinima = validarNumero(req.body.quantidadeMinima, 0, 999999, item.quantidadeMinima);
      item.quantidadeMaxima = validarNumero(req.body.quantidadeMaxima, 0, 999999, item.quantidadeMaxima);
      item.armazem = sanitizarString(req.body.armazem) || item.armazem;
      
      if (req.body.quantidade !== undefined) {
        const novaQuantidade = validarNumero(req.body.quantidade, 0);
        if (novaQuantidade !== item.quantidade) {
          const diff = novaQuantidade - item.quantidade;
          if (diff > 0) {
            item.dataUltimaEntrada = new Date();
          } else if (diff < 0) {
            item.dataUltimaSaida = new Date();
          }
          item.quantidade = novaQuantidade;
        }
      }
      
      if (req.body.dataValidade) {
        const novaDataValidade = validarData(req.body.dataValidade, true);
        if (!novaDataValidade) {
          return res.status(400).json({ 
            sucesso: false, 
            mensagem: "Data de validade inválida" 
          });
        }
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        if (novaDataValidade <= hoje) {
          return res.status(400).json({ 
            sucesso: false, 
            mensagem: "Data de validade deve ser futura" 
          });
        }
        item.dataValidade = novaDataValidade;
      }
    } else {
      // Atualização de serviço
      item.duracaoEstimada = validarNumero(req.body.duracaoEstimada, 0, Infinity, item.duracaoEstimada);
      item.unidadeTempo = req.body.unidadeTempo || item.unidadeTempo;
      item.precoHora = validarNumero(req.body.precoHora, 0, Infinity, item.precoHora);
      item.executadoPor = sanitizarString(req.body.executadoPor) || item.executadoPor;
      item.requerAgendamento = req.body.requerAgendamento === true;
      item.localExecucao = sanitizarString(req.body.localExecucao) || item.localExecucao;
      item.recursosNecessarios = sanitizarString(req.body.recursosNecessarios) || item.recursosNecessarios;
      item.instrucoes = sanitizarString(req.body.instrucoes) || item.instrucoes;
    }
    
    await item.save();
    
    res.json({ 
      sucesso: true, 
      mensagem: item.tipo === 'produto' ? "Produto atualizado com sucesso" : "Serviço atualizado com sucesso",
      dados: item 
    });
    
  } catch (error) {
    console.error('Erro em updateStock:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Código de barras ou código interno já existe" 
      });
    }
    
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao atualizar item" 
    });
  }
};

// PATCH - Ajustar estoque (apenas produtos)
exports.ajustarEstoque = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId, tipo, quantidade, motivo } = req.body;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "ID do produto inválido" 
      });
    }
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    if (!['entrada', 'saida'].includes(tipo)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Tipo deve ser 'entrada' ou 'saida'" 
      });
    }
    
    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Quantidade inválida" 
      });
    }
    
    const produto = await Stock.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!produto) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Produto não encontrado" 
      });
    }
    
    if (produto.tipo !== 'produto') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Ajuste de estoque só é permitido para produtos físicos" 
      });
    }
    
    await produto.registrarMovimentacao(
      tipo,
      quantidadeNum,
      motivo || 'Ajuste manual de estoque',
      req.user?.nome || "Sistema",
      req.user?.id
    );
    
    res.json({ 
      sucesso: true, 
      mensagem: `Estoque ajustado: ${quantidadeNum} unidade(s) em ${tipo}`,
      dados: {
        produto: produto.produto,
        quantidadeAtual: produto.quantidade
      }
    });
    
  } catch (error) {
    console.error('Erro em ajustarEstoque:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao ajustar estoque" 
    });
  }
};

// POST - Registrar entrada (apenas produtos)
exports.registrarEntrada = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId, quantidade, motivo } = req.body;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "ID do produto inválido" 
      });
    }
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Quantidade inválida" 
      });
    }
    
    const produto = await Stock.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!produto) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Produto não encontrado" 
      });
    }
    
    if (produto.tipo !== 'produto') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Registro de entrada só é permitido para produtos físicos" 
      });
    }
    
    await produto.registrarMovimentacao(
      'entrada',
      quantidadeNum,
      motivo || 'Entrada de estoque',
      req.user?.nome || "Sistema",
      req.user?.id
    );
    
    res.json({ 
      sucesso: true, 
      mensagem: `${quantidadeNum} unidade(s) adicionada(s) ao estoque`,
      dados: {
        produto: produto.produto,
        quantidadeAnterior: produto.quantidade - quantidadeNum,
        quantidadeNova: produto.quantidade
      }
    });
    
  } catch (error) {
    console.error('Erro em registrarEntrada:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao registrar entrada" 
    });
  }
};

// POST - Registrar saída (apenas produtos)
exports.registrarSaida = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId, quantidade, motivo } = req.body;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "ID do produto inválido" 
      });
    }
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Quantidade inválida" 
      });
    }
    
    const produto = await Stock.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!produto) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Produto não encontrado" 
      });
    }
    
    if (produto.tipo !== 'produto') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Registro de saída só é permitido para produtos físicos" 
      });
    }
    
    if (produto.quantidade < quantidadeNum) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Estoque insuficiente. Disponível: ${produto.quantidade}` 
      });
    }
    
    await produto.registrarMovimentacao(
      'saida',
      quantidadeNum,
      motivo || 'Saída de estoque',
      req.user?.nome || "Sistema",
      req.user?.id
    );
    
    res.json({ 
      sucesso: true, 
      mensagem: `${quantidadeNum} unidade(s) removida(s) do estoque`,
      dados: {
        produto: produto.produto,
        quantidadeAnterior: produto.quantidade + quantidadeNum,
        quantidadeNova: produto.quantidade
      }
    });
    
  } catch (error) {
    console.error('Erro em registrarSaida:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao registrar saída" 
    });
  }
};

// DELETE - Remover item (soft delete)
exports.deleteStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.query;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "ID do item inválido" 
      });
    }
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const item = await Stock.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!item) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Item não encontrado" 
      });
    }
    
    item.ativo = false;
    item.updatedAt = new Date();
    item.atualizadoPor = req.user?.nome || "Sistema";
    await item.save();
    
    res.json({ 
      sucesso: true, 
      mensagem: item.tipo === 'produto' ? "Produto removido com sucesso" : "Serviço removido com sucesso" 
    });
    
  } catch (error) {
    console.error('Erro em deleteStock:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao remover item" 
    });
  }
};

// POST - Devolver produto (apenas produtos)
exports.devolverProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId, quantidade, motivo, observacao } = req.body;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "ID do produto inválido" 
      });
    }
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Quantidade inválida" 
      });
    }
    
    const motivosValidos = ['vencido', 'danificado', 'erro_pedido', 'defeito', 'cliente', 'outro'];
    if (!motivosValidos.includes(motivo)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Motivo de devolução inválido" 
      });
    }
    
    const produto = await Stock.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!produto) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Produto não encontrado" 
      });
    }
    
    if (produto.tipo !== 'produto') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Devolução só é permitida para produtos físicos" 
      });
    }
    
    if (produto.quantidade < quantidadeNum) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Estoque insuficiente. Disponível: ${produto.quantidade}` 
      });
    }
    
    await produto.registrarDevolucao(
      quantidadeNum, 
      motivo, 
      observacao, 
      req.user?.nome || "Sistema"
    );
    
    res.json({ 
      sucesso: true, 
      mensagem: `Devolução de ${quantidadeNum} unidades registrada com sucesso`,
      dados: {
        produto: produto.produto,
        quantidadeDevolvida: quantidadeNum,
        quantidadeAtual: produto.quantidade,
        motivo
      }
    });
    
  } catch (error) {
    console.error('Erro em devolverProduto:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao registrar devolução" 
    });
  }
};

// POST - Descartar produto (apenas produtos)
exports.descartarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId, quantidade, motivo } = req.body;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "ID do produto inválido" 
      });
    }
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Quantidade inválida" 
      });
    }
    
    const produto = await Stock.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!produto) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Produto não encontrado" 
      });
    }
    
    if (produto.tipo !== 'produto') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Descarte só é permitido para produtos físicos" 
      });
    }
    
    if (produto.quantidade < quantidadeNum) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Estoque insuficiente. Disponível: ${produto.quantidade}` 
      });
    }
    
    await produto.registrarMovimentacao(
      'descarte',
      quantidadeNum,
      motivo || 'Descarte de produto',
      req.user?.nome || "Sistema",
      req.user?.id
    );
    
    res.json({ 
      sucesso: true, 
      mensagem: `${quantidadeNum} unidade(s) descartada(s) com sucesso`,
      dados: {
        produto: produto.produto,
        quantidadeDescartada: quantidadeNum,
        quantidadeAtual: produto.quantidade
      }
    });
    
  } catch (error) {
    console.error('Erro em descartarProduto:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao descartar produto" 
    });
  }
};

// GET - Buscar por lote (apenas produtos)
exports.getStockByLote = async (req, res) => {
  try {
    const { lote } = req.params;
    const { empresaId } = req.query;
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const produtos = await Stock.find({
      empresaId: new mongoose.Types.ObjectId(empresaId),
      tipo: 'produto',
      numeroLote: lote,
      ativo: true
    })
    .select('-__v')
    .lean();
    
    res.json({ sucesso: true, dados: produtos });
    
  } catch (error) {
    console.error('Erro em getStockByLote:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar por lote" 
    });
  }
};

// GET - Buscar por armazém (apenas produtos)
exports.getStockByArmazem = async (req, res) => {
  try {
    const { armazem } = req.params;
    const { empresaId } = req.query;
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const produtos = await Stock.find({
      empresaId: new mongoose.Types.ObjectId(empresaId),
      tipo: 'produto',
      armazem: armazem,
      ativo: true
    })
    .select('-__v')
    .sort({ produto: 1 })
    .lean();
    
    const stats = {
      totalProdutos: produtos.length,
      quantidadeTotal: produtos.reduce((acc, p) => acc + p.quantidade, 0),
      valorTotal: produtos.reduce((acc, p) => acc + (p.quantidade * p.precoVenda), 0)
    };
    
    res.json({ 
      sucesso: true, 
      dados: produtos,
      estatisticas: stats
    });
    
  } catch (error) {
    console.error('Erro em getStockByArmazem:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar por armazém" 
    });
  }
};

// GET - Relatório de validade (apenas produtos)
exports.relatorioValidade = async (req, res) => {
  try {
    const { empresaId, dias = 30 } = req.query;
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const limite = new Date();
    limite.setDate(limite.getDate() + parseInt(dias));
    limite.setHours(23, 59, 59, 999);
    
    const produtos = await Stock.find({
      empresaId: new mongoose.Types.ObjectId(empresaId),
      tipo: 'produto',
      ativo: true,
      dataValidade: { $lte: limite }
    })
    .select('produto codigoBarras quantidade dataValidade fornecedor precoCompra precoVenda')
    .sort({ dataValidade: 1 })
    .lean();
    
    const vencidos = produtos.filter(p => new Date(p.dataValidade) < hoje);
    const proximos = produtos.filter(p => new Date(p.dataValidade) >= hoje);
    
    res.json({
      sucesso: true,
      dados: {
        totalProdutos: produtos.length,
        vencidos: vencidos.length,
        proximosVencer: proximos.length,
        listaVencidos: vencidos,
        listaProximos: proximos,
        valorTotalVencidos: vencidos.reduce((acc, p) => acc + (p.quantidade * p.precoVenda), 0)
      }
    });
    
  } catch (error) {
    console.error('Erro em relatorioValidade:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao gerar relatório" 
    });
  }
};

// GET - Relatório de movimentações (apenas produtos)
exports.relatorioMovimentacoes = async (req, res) => {
  try {
    const { empresaId, inicio, fim, tipo } = req.query;
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const dataInicio = inicio ? new Date(inicio) : new Date(new Date().setDate(1));
    const dataFim = fim ? new Date(fim) : new Date();
    dataFim.setHours(23, 59, 59, 999);
    
    const produtos = await Stock.find({
      empresaId: new mongoose.Types.ObjectId(empresaId),
      tipo: 'produto',
      ativo: true,
      'historicoMovimentacoes.data': { $gte: dataInicio, $lte: dataFim }
    })
    .select('produto codigoBarras historicoMovimentacoes')
    .lean();
    
    let movimentacoes = [];
    produtos.forEach(produto => {
      produto.historicoMovimentacoes.forEach(mov => {
        if (mov.data >= dataInicio && mov.data <= dataFim) {
          if (!tipo || mov.tipo === tipo) {
            movimentacoes.push({
              produto: produto.produto,
              codigoBarras: produto.codigoBarras,
              ...mov
            });
          }
        }
      });
    });
    
    movimentacoes.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    const resumo = {
      totalMovimentacoes: movimentacoes.length,
      totalEntradas: movimentacoes.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.quantidade, 0),
      totalSaidas: movimentacoes.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.quantidade, 0),
      totalDevolucoes: movimentacoes.filter(m => m.tipo === 'devolucao').reduce((acc, m) => acc + m.quantidade, 0),
      totalDescartes: movimentacoes.filter(m => m.tipo === 'descarte').reduce((acc, m) => acc + m.quantidade, 0)
    };
    
    res.json({
      sucesso: true,
      dados: {
        periodo: { inicio: dataInicio, fim: dataFim },
        resumo,
        movimentacoes
      }
    });
    
  } catch (error) {
    console.error('Erro em relatorioMovimentacoes:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao gerar relatório" 
    });
  }
};

// GET - Dashboard de stock
exports.getDashboardStock = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId || !mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Empresa inválida" 
      });
    }
    
    const empresaIdObj = new mongoose.Types.ObjectId(empresaId);
    
    const [topProdutos, topServicos, produtosAlerta, categorias, totais, vencidos, proximosVencer, baixoEstoque, totalProdutos, totalServicos] = await Promise.all([
      Stock.find({ empresaId: empresaIdObj, ativo: true, tipo: 'produto' })
        .sort({ valorTotalVenda: -1 })
        .limit(10)
        .select('produto quantidade precoVenda valorTotalVenda')
        .lean(),
      Stock.find({ empresaId: empresaIdObj, ativo: true, tipo: 'servico' })
        .sort({ precoVenda: -1 })
        .limit(10)
        .select('produto precoVenda duracaoEstimada unidadeTempo')
        .lean(),
      Stock.find({
        empresaId: empresaIdObj,
        tipo: 'produto',
        ativo: true,
        $expr: { $lte: ["$quantidade", "$quantidadeMinima"] },
        quantidade: { $gt: 0 }
      })
      .limit(10)
      .select('produto quantidade quantidadeMinima')
      .lean(),
      Stock.aggregate([
        { $match: { empresaId: empresaIdObj, ativo: true } },
        { $group: { 
          _id: "$categoria", 
          total: { $sum: { $cond: [{ $eq: ["$tipo", "produto"] }, "$quantidade", 1] } }, 
          valor: { $sum: { $multiply: [{ $ifNull: ["$quantidade", 1] }, "$precoVenda"] } } 
        }},
        { $sort: { valor: -1 } },
        { $limit: 10 }
      ]),
      calcularValorTotalStock(empresaIdObj),
      calcularProdutosVencidos(empresaIdObj),
      calcularProdutosProximosVencer(empresaIdObj),
      calcularProdutosEstoqueBaixo(empresaIdObj),
      Stock.countDocuments({ empresaId: empresaIdObj, ativo: true, tipo: 'produto' }),
      Stock.countDocuments({ empresaId: empresaIdObj, ativo: true, tipo: 'servico' })
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        estatisticas: {
          totalProdutos,
          totalServicos,
          totalItens: totalProdutos + totalServicos,
          totalQuantidadeProdutos: totais.totalQuantidade || 0,
          valorTotalProdutos: totais.totalValorVenda || 0,
          valorTotalServicos: totais.totalValorCompra || 0,
          valorTotalGeral: totais.totalValorVenda || 0,
          lucroEstimado: totais.totalLucroEstimado || 0,
          vencidos: vencidos || 0,
          proximosVencer: proximosVencer || 0,
          baixoEstoque: baixoEstoque || 0
        },
        topProdutos: topProdutos || [],
        topServicos: topServicos || [],
        produtosAlerta: produtosAlerta || [],
        categorias: categorias || []
      }
    });
    
  } catch (error) {
    console.error('Erro em getDashboardStock:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar dados do dashboard" 
    });
  }
};


// ============================================
// ASSOCIAR PRODUTO AO FORNECEDOR AUTOMATICAMENTE
// ============================================

// POST - Registrar entrada com associação automática ao fornecedor
exports.registrarEntradaComFornecedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId, quantidade, fornecedorId, numeroFactura, dataCompra } = req.body;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "ID do produto inválido" 
      });
    }
    
    const produto = await Stock.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!produto) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Produto não encontrado" 
      });
    }
    
    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Quantidade inválida" 
      });
    }
    
    // Registrar movimentação
    await produto.registrarMovimentacao(
      'entrada',
      quantidadeNum,
      `Compra do fornecedor ${fornecedorId} - Factura ${numeroFactura || 'N/A'}`,
      req.user?.nome || "Sistema",
      req.user?.id
    );
    
    // Registrar associação com fornecedor no histórico
    produto.ultimoFornecedor = fornecedorId;
    produto.ultimaCompra = {
      data: dataCompra || new Date(),
      quantidade: quantidadeNum,
      precoUnitario: produto.precoCompra,
      numeroFactura: numeroFactura,
      fornecedorId: fornecedorId
    };
    
    // Atualizar preço médio se necessário
    const valorTotalAntigo = produto.quantidade * produto.precoCompra;
    const valorTotalNovo = quantidadeNum * produto.precoCompra;
    const quantidadeTotal = produto.quantidade + quantidadeNum;
    produto.precoCompraMedio = (valorTotalAntigo + valorTotalNovo) / quantidadeTotal;
    
    await produto.save();
    
    // Atualizar estatísticas do fornecedor
    await atualizarEstatisticasFornecedor(fornecedorId, produto._id, quantidadeNum, produto.precoCompra);
    
    res.json({ 
      sucesso: true, 
      mensagem: `${quantidadeNum} unidade(s) adicionadas e associadas ao fornecedor`,
      dados: {
        produto: produto.produto,
        quantidadeAtual: produto.quantidade,
        fornecedorId,
        precoMedio: produto.precoCompraMedio
      }
    });
    
  } catch (error) {
    console.error('Erro ao registrar entrada com fornecedor:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: error.message 
    });
  }
};

// Função para atualizar estatísticas do fornecedor
async function atualizarEstatisticasFornecedor(fornecedorId, produtoId, quantidade, preco) {
  try {
    const Fornecedor = require('../models/Fornecedor');
    const fornecedor = await Fornecedor.findById(fornecedorId);
    
    if (fornecedor) {
      // Adicionar ao histórico de compras do fornecedor
      fornecedor.historicoCompras = fornecedor.historicoCompras || [];
      fornecedor.historicoCompras.push({
        data: new Date(),
        produtoId,
        quantidade,
        valorTotal: quantidade * preco,
        precoUnitario: preco
      });
      
      // Atualizar total comprado
      fornecedor.totalCompras = (fornecedor.totalCompras || 0) + (quantidade * preco);
      fornecedor.ultimaCompra = new Date();
      
      await fornecedor.save();
    }
  } catch (error) {
    console.error('Erro ao atualizar estatísticas do fornecedor:', error);
  }
}