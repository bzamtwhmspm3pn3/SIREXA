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
  return str.trim().replace(/[<>]/g, ''); // Remove caracteres perigosos
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

const calcularValorTotalStock = async (empresaId) => {
  try {
    const empresaIdObj = validarObjectId(empresaId, 'Empresa');
    
    const resultado = await Stock.aggregate([
      { $match: { empresaId: empresaIdObj, ativo: true } },
      { $group: {
        _id: null,
        totalQuantidade: { $sum: "$quantidade" },
        totalValorCompra: { $sum: { $multiply: ["$quantidade", "$precoCompra"] } },
        totalValorVenda: { $sum: { $multiply: ["$quantidade", "$precoVenda"] } },
        totalLucroEstimado: { $sum: { $multiply: ["$quantidade", { $subtract: ["$precoVenda", "$precoCompra"] }] } }
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

// GET - Listar todos os produtos
exports.getAllStock = async (req, res) => {
  try {
    const { 
      empresaId, 
      search, 
      categoria, 
      statusEstoque, 
      statusValidade, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    console.log('=' .repeat(60));
    console.log('🔍 getAllStock CHAMADO');
    console.log('📌 empresaId:', empresaId);
    console.log('📌 search:', search);
    console.log('📌 page:', page);
    console.log('📌 limit:', limit);
    
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
    
    console.log('📋 Filtro:', JSON.stringify(filtro));
    
    // Buscar TODOS os produtos sem paginação para debug
    const todosProdutos = await Stock.find({ empresaId: empresaIdObj }).lean();
    console.log(`📦 Total de produtos na empresa (sem filtro ativo): ${todosProdutos.length}`);
    todosProdutos.forEach(p => {
      console.log(`   - ${p.produto}: ativo=${p.ativo}`);
    });
    
    // Buscar com filtro ativo
    const produtosAtivos = await Stock.find({ empresaId: empresaIdObj, ativo: true }).lean();
    console.log(`📦 Produtos ativos: ${produtosAtivos.length}`);
    
    // Filtros adicionais
    if (search && typeof search === 'string') {
      const searchSanitized = sanitizarString(search);
      filtro.$or = [
        { produto: { $regex: searchSanitized, $options: 'i' } },
        { codigoBarras: { $regex: searchSanitized, $options: 'i' } },
        { codigoInterno: { $regex: searchSanitized, $options: 'i' } }
      ];
      console.log('🔍 Com filtro de busca:', filtro.$or);
    }
    
    // Paginação segura
    const pagina = Math.max(1, parseInt(page) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pagina - 1) * limite;
    
    const [produtos, total] = await Promise.all([
      Stock.find(filtro)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limite)
        .lean(),
      Stock.countDocuments(filtro)
    ]);
    
    console.log(`✅ Retornando ${produtos.length} produtos de ${total} total`);
    console.log('=' .repeat(60));
    
    res.json({
      sucesso: true,
      dados: produtos,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite)
    });
    
  } catch (error) {
    console.error('Erro em getAllStock:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar produtos" 
    });
  }
};

// GET - Estatísticas do stock
exports.getStockStats = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
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
    
    const [totais, vencidos, proximosVencer, baixoEstoque, categorias, totalProdutos] = await Promise.all([
      calcularValorTotalStock(empresaIdObj),
      calcularProdutosVencidos(empresaIdObj),
      calcularProdutosProximosVencer(empresaIdObj),
      calcularProdutosEstoqueBaixo(empresaIdObj),
      Stock.aggregate([
        { $match: { empresaId: empresaIdObj, ativo: true } },
        { $group: { 
          _id: "$categoria", 
          quantidade: { $sum: 1 }, 
          valor: { $sum: { $multiply: ["$quantidade", "$precoVenda"] } } 
        }},
        { $sort: { quantidade: -1 } },
        { $limit: 10 }
      ]),
      Stock.countDocuments({ empresaId: empresaIdObj, ativo: true })
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        totalProdutos,
        totalQuantidade: totais.totalQuantidade || 0,
        valorTotalCompra: totais.totalValorCompra || 0,
        valorTotalVenda: totais.totalValorVenda || 0,
        lucroEstimado: totais.totalLucroEstimado || 0,
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

// GET - Produtos com estoque baixo
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

// GET - Produtos próximos a vencer
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
    
    const produto = await Stock.findOne({ 
      empresaId: new mongoose.Types.ObjectId(empresaId),
      codigoBarras: sanitizarString(codigo), 
      ativo: true 
    })
    .select('-__v')
    .lean();
    
    if (!produto) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Produto não encontrado" 
      });
    }
    
    res.json({ sucesso: true, dados: produto });
    
  } catch (error) {
    console.error('Erro em getStockByCodigoBarras:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar produto" 
    });
  }
};

// GET - Produto por ID
exports.getStockById = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.query;
    
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
    
    const produto = await Stock.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId),
      ativo: true
    })
    .select('-__v')
    .lean();
    
    if (!produto) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Produto não encontrado" 
      });
    }
    
    res.json({ sucesso: true, dados: produto });
    
  } catch (error) {
    console.error('Erro em getStockById:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao buscar produto" 
    });
  }
};

// POST - Criar produto (BLINDADO)
exports.createStock = async (req, res) => {
  try {
    const { empresaId } = req.body;
    
    // Validação da empresa
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
    
    // Validação de campos obrigatórios
    const produtoNome = sanitizarString(req.body.produto);
    if (!produtoNome) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Nome do produto é obrigatório" 
      });
    }
    
    const quantidade = validarNumero(req.body.quantidade, 0);
    if (quantidade < 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Quantidade inválida" 
      });
    }
    
    const precoCompra = validarNumero(req.body.precoCompra, 0);
    if (precoCompra <= 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Preço de compra deve ser maior que zero" 
      });
    }
    
    const precoVenda = validarNumero(req.body.precoVenda, 0);
    if (precoVenda <= 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Preço de venda deve ser maior que zero" 
      });
    }
    
    if (precoVenda < precoCompra) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Preço de venda não pode ser menor que o preço de compra" 
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
    
    // Verificação de duplicatas
    const [existeProduto, existeCodigoBarras, existeCodigoInterno] = await Promise.all([
      Stock.findOne({ empresaId: empresaIdObj, produto: produtoNome }),
      req.body.codigoBarras ? Stock.findOne({ empresaId: empresaIdObj, codigoBarras: sanitizarString(req.body.codigoBarras) }) : Promise.resolve(null),
      req.body.codigoInterno ? Stock.findOne({ empresaId: empresaIdObj, codigoInterno: sanitizarString(req.body.codigoInterno) }) : Promise.resolve(null)
    ]);
    
    if (existeProduto) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Já existe um produto com o nome "${produtoNome}" para esta empresa` 
      });
    }
    
    if (existeCodigoBarras) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Código de barras "${req.body.codigoBarras}" já está em uso` 
      });
    }
    
    if (existeCodigoInterno) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Código interno "${req.body.codigoInterno}" já está em uso` 
      });
    }
    
    // Preparar dados do produto
    const produtoData = {
      ...req.body,
      produto: produtoNome,
      empresaId: empresaIdObj,
      quantidade,
      precoCompra,
      precoVenda,
      dataValidade,
      precoVendaMinimo: validarNumero(req.body.precoVendaMinimo, 0),
      precoPromocional: validarNumero(req.body.precoPromocional, 0),
      taxaIVA: validarNumero(req.body.taxaIVA, 0, 100, 14),
      taxaISC: validarNumero(req.body.taxaISC, 0, 100, 0),
      quantidadeMinima: validarNumero(req.body.quantidadeMinima, 0, 999999, 5),
      quantidadeMaxima: validarNumero(req.body.quantidadeMaxima, 0, 999999, 1000),
      estoqueSeguranca: validarNumero(req.body.estoqueSeguranca, 0),
      pontoReposicao: validarNumero(req.body.pontoReposicao, 0),
      dataFabricacao: validarData(req.body.dataFabricacao),
      dataInicioPromocao: validarData(req.body.dataInicioPromocao),
      dataFimPromocao: validarData(req.body.dataFimPromocao),
      fornecedor: sanitizarString(req.body.fornecedor),
      fornecedorReferencia: sanitizarString(req.body.fornecedorReferencia),
      localizacao: sanitizarString(req.body.localizacao),
      armazem: sanitizarString(req.body.armazem) || "Principal",
      prateleira: sanitizarString(req.body.prateleira),
      numeroLote: sanitizarString(req.body.numeroLote),
      serie: sanitizarString(req.body.serie),
      observacoes: sanitizarString(req.body.observacoes),
      categoria: sanitizarString(req.body.categoria) || "Geral",
      subcategoria: sanitizarString(req.body.subcategoria),
      marca: sanitizarString(req.body.marca),
      modelo: sanitizarString(req.body.modelo),
      unidadeMedida: req.body.unidadeMedida || "Unidade",
      metodoCusteio: req.body.metodoCusteio || "FIFO",
      controlaValidade: req.body.controlaValidade !== false,
      controlaLote: req.body.controlaLote === true,
      criadoPor: req.user?.nome || "Sistema",
      criadoPorId: req.user?.id,
      dataUltimaEntrada: quantidade > 0 ? new Date() : null,
      dataUltimaSaida: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Remover campos undefined
    Object.keys(produtoData).forEach(key => {
      if (produtoData[key] === undefined || produtoData[key] === null) {
        delete produtoData[key];
      }
    });
    
    const produto = new Stock(produtoData);
    await produto.save();
    
    res.status(201).json({ 
      sucesso: true, 
      mensagem: "Produto cadastrado com sucesso",
      dados: produto 
    });
    
  } catch (error) {
    console.error('Erro em createStock:', error);
    
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      const mensagem = campo === 'codigoBarras' 
        ? 'Código de barras já cadastrado'
        : campo === 'codigoInterno'
        ? 'Código interno já cadastrado'
        : `${campo} já cadastrado`;
      
      return res.status(400).json({ 
        sucesso: false, 
        mensagem 
      });
    }
    
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao cadastrar produto" 
    });
  }
};

// PUT - Atualizar produto (BLINDADO)
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.body;
    
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
    
    // Verificar duplicatas em atualização
    if (req.body.codigoBarras && req.body.codigoBarras !== produto.codigoBarras) {
      const existeCodigoBarras = await Stock.findOne({ 
        _id: { $ne: id },
        empresaId: produto.empresaId, 
        codigoBarras: sanitizarString(req.body.codigoBarras) 
      });
      
      if (existeCodigoBarras) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: `Código de barras "${req.body.codigoBarras}" já está em uso` 
        });
      }
    }
    
    if (req.body.codigoInterno && req.body.codigoInterno !== produto.codigoInterno) {
      const existeCodigoInterno = await Stock.findOne({ 
        _id: { $ne: id },
        empresaId: produto.empresaId, 
        codigoInterno: sanitizarString(req.body.codigoInterno) 
      });
      
      if (existeCodigoInterno) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: `Código interno "${req.body.codigoInterno}" já está em uso` 
        });
      }
    }
    
    // Validar preços se foram alterados
    const novoPrecoCompra = req.body.precoCompra ? validarNumero(req.body.precoCompra, 0) : produto.precoCompra;
    const novoPrecoVenda = req.body.precoVenda ? validarNumero(req.body.precoVenda, 0) : produto.precoVenda;
    
    if (novoPrecoVenda < novoPrecoCompra) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Preço de venda não pode ser menor que o preço de compra" 
      });
    }
    
    // Validar data de validade
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
      
      produto.dataValidade = novaDataValidade;
    }
    
    // Atualizar campos
    Object.assign(produto, {
      ...req.body,
      produto: req.body.produto ? sanitizarString(req.body.produto) : produto.produto,
      codigoBarras: req.body.codigoBarras ? sanitizarString(req.body.codigoBarras) : produto.codigoBarras,
      codigoInterno: req.body.codigoInterno ? sanitizarString(req.body.codigoInterno) : produto.codigoInterno,
      precoCompra: novoPrecoCompra,
      precoVenda: novoPrecoVenda,
      quantidade: req.body.quantidade !== undefined ? validarNumero(req.body.quantidade, 0) : produto.quantidade,
      quantidadeMinima: req.body.quantidadeMinima !== undefined ? validarNumero(req.body.quantidadeMinima, 0) : produto.quantidadeMinima,
      atualizadoPor: req.user?.nome || "Sistema",
      updatedAt: new Date()
    });
    
    await produto.save();
    
    res.json({ 
      sucesso: true, 
      mensagem: "Produto atualizado com sucesso",
      dados: produto 
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
      mensagem: "Erro interno ao atualizar produto" 
    });
  }
};

// PATCH - Ajustar estoque (BLINDADO)
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
    
    const quantidadeAnterior = produto.quantidade;
    
    if (tipo === 'entrada') {
      produto.quantidade += quantidadeNum;
      produto.dataUltimaEntrada = new Date();
    } else {
      if (produto.quantidade < quantidadeNum) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: `Estoque insuficiente. Disponível: ${produto.quantidade}` 
        });
      }
      produto.quantidade -= quantidadeNum;
      produto.dataUltimaSaida = new Date();
    }
    
    // Registrar movimentação
    const dataHora = new Date().toLocaleString('pt-BR');
    const movimentacao = `[${dataHora}] ${sanitizarString(motivo) || 'Ajuste de estoque'} - ${tipo.toUpperCase()}: ${quantidadeNum} unidades (Anterior: ${quantidadeAnterior} → Nova: ${produto.quantidade})`;
    produto.observacoes = produto.observacoes 
      ? `${movimentacao}\n${produto.observacoes}` 
      : movimentacao;
    
    produto.updatedAt = new Date();
    await produto.save();
    
    res.json({ 
      sucesso: true, 
      mensagem: `Estoque ajustado: ${tipo} de ${quantidadeNum} unidades`,
      dados: {
        produto: produto.produto,
        quantidadeAnterior,
        quantidadeNova: produto.quantidade,
        tipo,
        quantidade: quantidadeNum
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

// DELETE - Remover produto (soft delete)
exports.deleteStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.query;
    
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
    
    produto.ativo = false;
    produto.updatedAt = new Date();
    produto.atualizadoPor = req.user?.nome || "Sistema";
    await produto.save();
    
    res.json({ 
      sucesso: true, 
      mensagem: "Produto removido com sucesso" 
    });
    
  } catch (error) {
    console.error('Erro em deleteStock:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro interno ao remover produto" 
    });
  }
};

// Adicione estas funções ao stockController.js

// GET - Produtos vencidos
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

// POST - Devolver produto
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

// POST - Descartar produto
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

// POST - Registrar entrada
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

// POST - Registrar saída
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

// GET - Buscar por lote
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

// GET - Buscar por armazém
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

// GET - Relatório de validade
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

// GET - Relatório de movimentações
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
    
    const [topProdutos, produtosAlerta, categorias, totais, vencidos, proximosVencer, baixoEstoque, totalProdutos] = await Promise.all([
      Stock.find({ empresaId: empresaIdObj, ativo: true })
        .sort({ valorTotalVenda: -1 })
        .limit(10)
        .select('produto quantidade precoVenda valorTotalVenda')
        .lean(),
      Stock.find({
        empresaId: empresaIdObj,
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
          total: { $sum: "$quantidade" }, 
          valor: { $sum: { $multiply: ["$quantidade", "$precoVenda"] } } 
        }},
        { $sort: { valor: -1 } },
        { $limit: 10 }
      ]),
      calcularValorTotalStock(empresaIdObj),
      calcularProdutosVencidos(empresaIdObj),
      calcularProdutosProximosVencer(empresaIdObj),
      calcularProdutosEstoqueBaixo(empresaIdObj),
      Stock.countDocuments({ empresaId: empresaIdObj, ativo: true })
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        estatisticas: {
          totalProdutos,
          totalQuantidade: totais.totalQuantidade || 0,
          valorTotalCompra: totais.totalValorCompra || 0,
          valorTotalVenda: totais.totalValorVenda || 0,
          lucroEstimado: totais.totalLucroEstimado || 0,
          vencidos: vencidos || 0,
          proximosVencer: proximosVencer || 0,
          baixoEstoque: baixoEstoque || 0
        },
        topProdutos: topProdutos || [],
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