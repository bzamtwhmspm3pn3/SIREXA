// backend/controllers/fornecedorController.js
const mongoose = require('mongoose');
const Fornecedor = require('../models/Fornecedor');
const Empresa = require('../models/Empresa');
const Stock = require('../models/Stock');
const Manutencao = require('../models/Manutencao');
const Abastecimento = require('../models/Abastecimento');
const Inventario = require('../models/Inventario');
const Pagamento = require('../models/Pagamento');

// ============================================
// PROCESSAMENTO INTELIGENTE POR TIPO
// ============================================

async function processarItemPorTipo(fornecedor, item, empresaId, usuario) {
  const tipo = fornecedor.tipoFornecedor;
  
  switch (tipo) {
    case 'mercadoria':
      return await processarMercadoria(fornecedor, item, empresaId, usuario);
    case 'manutencao':
      return await processarManutencao(fornecedor, item, empresaId, usuario);
    case 'abastecimento':
      return await processarAbastecimento(fornecedor, item, empresaId, usuario);
    case 'equipamento':
      return await processarEquipamento(fornecedor, item, empresaId, usuario);
    case 'servicoProfissional':
    case 'renda':
    case 'internet':
    case 'servicoGeral':
      return await processarServico(fornecedor, item, empresaId, usuario);
    default:
      return { sucesso: false, erro: 'Tipo não suportado' };
  }
}

async function processarMercadoria(fornecedor, item, empresaId, usuario) {
  try {
    let produto = await Stock.findOne({
      empresaId: new mongoose.Types.ObjectId(empresaId),
      produto: { $regex: new RegExp(`^${item.produto}$`, 'i') }
    });
    
    const quantidade = item.quantidade || 0;
    const precoCompra = item.precoCompra || 0;
    const precoVenda = item.precoVenda || (precoCompra * 1.3);
    
    if (produto) {
      produto.quantidade += quantidade;
      produto.precoCompra = precoCompra;
      produto.precoVenda = precoVenda;
      produto.ultimoFornecedor = fornecedor._id;
      produto.fornecedorId = fornecedor._id;
      produto.fornecedor = fornecedor.nome;
      produto.dataUltimaEntrada = new Date();
      
      produto.historicoMovimentacoes = produto.historicoMovimentacoes || [];
      produto.historicoMovimentacoes.push({
        data: new Date(),
        tipo: 'entrada',
        quantidade: quantidade,
        quantidadeAnterior: produto.quantidade - quantidade,
        quantidadeNova: produto.quantidade,
        motivo: `Compra do fornecedor ${fornecedor.nome}`,
        usuario: usuario,
        fornecedorId: fornecedor._id,
        precoUnitario: precoCompra
      });
      
      await produto.save();
    } else {
      produto = new Stock({
        produto: item.produto,
        empresaId: new mongoose.Types.ObjectId(empresaId),
        tipo: 'produto',
        codigoBarras: item.codigoBarras || '',
        codigoInterno: item.codigoInterno || '',
        categoria: item.categoria || 'Geral',
        marca: item.marca || '',
        unidadeMedida: item.unidadeMedida || 'Unidade',
        precoCompra: precoCompra,
        precoVenda: precoVenda,
        quantidade: quantidade,
        quantidadeMinima: item.estoqueMinimo || 5,
        fornecedorId: fornecedor._id,
        ultimoFornecedor: fornecedor._id,
        fornecedor: fornecedor.nome,
        dataValidade: item.dataValidade || null,
        armazem: item.armazem || 'Principal',
        taxaIVA: item.taxaIVA || 14,
        ativo: true,
        criadoPor: usuario
      });
      
      await produto.save();
    }
    
    console.log(`📦 Stock atualizado: ${produto.produto} (+${quantidade})`);
    return { sucesso: true, modulo: 'Stock', dados: produto };
    
  } catch (error) {
    console.error(`❌ Erro processar mercadoria:`, error);
    return { sucesso: false, erro: error.message };
  }
}

async function processarManutencao(fornecedor, item, empresaId, usuario) {
  try {
    const manutencao = new Manutencao({
      tipoManutencao: item.tipoManutencao || 'Preventiva',
      descricao: item.descricao,
      custo: item.valor,
      dataManutencao: item.dataAgendamento || new Date(),
      fornecedorId: fornecedor._id,
      fornecedorNome: fornecedor.nome,
      viaturaId: item.viatura,
      km: item.kmAtual,
      status: 'agendado',
      empresaId: new mongoose.Types.ObjectId(empresaId),
      usuario: usuario,
      observacoes: item.observacoes || '',
      garantia: item.garantia || 0,
      tecnico: item.tecnicoResponsavel
    });
    
    await manutencao.save();
    console.log(`🔧 Manutenção registrada: ${manutencao.descricao}`);
    return { sucesso: true, modulo: 'Manutencao', dados: manutencao };
    
  } catch (error) {
    console.error(`❌ Erro processar manutenção:`, error);
    return { sucesso: false, erro: error.message };
  }
}

async function processarAbastecimento(fornecedor, item, empresaId, usuario) {
  try {
    const abastecimento = new Abastecimento({
      fornecedorId: fornecedor._id,
      fornecedorNome: fornecedor.nome,
      tipoCombustivel: item.tipoCombustivel || 'Gasolina',
      quantidade: item.quantidade,
      precoLitro: item.precoLitro,
      total: item.valorTotal,
      dataAbastecimento: item.data || new Date(),
      viaturaId: item.viatura,
      km: item.kmAtual,
      empresaId: new mongoose.Types.ObjectId(empresaId),
      usuario: usuario,
      observacoes: item.observacoes || '',
      posto: item.posto,
      motorista: item.motorista,
      fatura: item.fatura
    });
    
    await abastecimento.save();
    console.log(`⛽ Abastecimento registrado: ${item.quantidade}L`);
    return { sucesso: true, modulo: 'Abastecimento', dados: abastecimento };
    
  } catch (error) {
    console.error(`❌ Erro processar abastecimento:`, error);
    return { sucesso: false, erro: error.message };
  }
}

async function processarEquipamento(fornecedor, item, empresaId, usuario) {
  try {
    const equipamento = new Inventario({
      nome: item.nome,
      tipo: 'equipamento',
      categoria: item.categoria || 'Hardware',
      descricao: item.descricao || '',
      valorAquisicao: item.valorAquisicao,
      dataAquisicao: item.dataAquisicao || new Date(),
      fornecedorId: fornecedor._id,
      fornecedorNome: fornecedor.nome,
      numeroSerie: item.numeroSerie || '',
      modelo: item.modelo || '',
      marca: item.marca || '',
      localizacao: item.localizacao || 'Armazém',
      status: 'ativo',
      empresaId: new mongoose.Types.ObjectId(empresaId),
      usuario: usuario,
      observacoes: item.observacoes || '',
      garantia: item.garantia || 0,
      vidaUtil: item.vidaUtil || 5,
      responsavel: item.responsavel
    });
    
    await equipamento.save();
    console.log(`🖥️ Equipamento adicionado ao inventário: ${item.nome}`);
    return { sucesso: true, modulo: 'Inventario', dados: equipamento };
    
  } catch (error) {
    console.error(`❌ Erro processar equipamento:`, error);
    return { sucesso: false, erro: error.message };
  }
}

async function processarServico(fornecedor, item, empresaId, usuario) {
  try {
    const pagamento = new Pagamento({
      tipo: 'Fornecedor',
      origemId: fornecedor._id,
      beneficiario: fornecedor.nome,
      nifBeneficiario: fornecedor.nif,
      valor: item.valor,
      dataVencimento: new Date(Date.now() + 30 * 86400000),
      status: 'pendente',
      descricao: item.descricao || item.servico || `Serviço - ${fornecedor.nome}`,
      usuario: usuario,
      empresaId: new mongoose.Types.ObjectId(empresaId),
      detalhesPagamento: {
        contaBancaria: fornecedor.pagamento?.iban || '',
        observacoes: `Serviço contratado: ${fornecedor.tipoFornecedor}`
      }
    });
    
    await pagamento.save();
    console.log(`💰 Pagamento criado para serviço: ${pagamento.descricao}`);
    return { sucesso: true, modulo: 'Pagamentos', dados: pagamento };
    
  } catch (error) {
    console.error(`❌ Erro processar serviço:`, error);
    return { sucesso: false, erro: error.message };
  }
}

// ============================================
// CONTROLLER PRINCIPAL
// ============================================

exports.criarFornecedor = async (req, res) => {
  try {
    const { 
      nome, nif, empresaId, tipoFornecedor, natureza,
      itens, contratos, fiscal, pagamento, ...outros 
    } = req.body;
    
    const usuario = req.user?.nome || req.user?.email || 'Sistema';
    
    // Validações
    if (!empresaId) return res.status(400).json({ mensagem: 'empresaId é obrigatório', erro: 'campo_faltando' });
    if (!nome) return res.status(400).json({ mensagem: 'Nome do fornecedor é obrigatório', erro: 'campo_faltando' });
    if (!nif) return res.status(400).json({ mensagem: 'NIF é obrigatório', erro: 'campo_faltando' });
    if (!tipoFornecedor) return res.status(400).json({ mensagem: 'Tipo de fornecedor é obrigatório', erro: 'campo_faltando' });
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada', erro: 'nao_encontrado' });
    
    const nifExistente = await Fornecedor.findOne({ nif, empresaId });
    if (nifExistente) return res.status(400).json({ mensagem: 'Já existe um fornecedor com este NIF', erro: 'duplicado' });
    
    // Criar fornecedor
    const fornecedor = new Fornecedor({
      nome, nif, empresaId, empresaNome: empresa.nome,
      tipoFornecedor, natureza: natureza || '',
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
      status: 'Ativo',
      observacoes: outros.observacoes || '',
      criadoPor: usuario
    });
    
    await fornecedor.save();
    console.log(`✅ Fornecedor criado: ${fornecedor.nome} (${fornecedor.tipoFornecedor})`);
    
    // Processar itens
    const resultados = [];
    if (itens && itens.length > 0) {
      for (const item of itens) {
        const resultado = await processarItemPorTipo(fornecedor, item, empresaId, usuario);
        resultados.push(resultado);
        await fornecedor.associarItem(item, usuario);
      }
    }
    
    const fornecedorObj = fornecedor.toObject();
    res.status(201).json({
      _id: fornecedorObj._id,
      ...fornecedorObj,
      processamento: resultados
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar fornecedor:', error);
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// LISTAR FORNECEDORES - COM FALLBACK DE EMPRESA
// ============================================
exports.listarFornecedores = async (req, res) => {
  try {
    // 🔥 USAR empresaAtual do security.js ou fallback
    const empresaId = req.empresaAtual || req.query.empresaId || req.user?.empresaId;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const { tipoFornecedor, status, busca } = req.query;
    const query = { empresaId: new mongoose.Types.ObjectId(empresaId) };
    
    if (tipoFornecedor) query.tipoFornecedor = tipoFornecedor;
    if (status) query.status = status;
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
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// BUSCAR FORNECEDOR POR ID - COM VERIFICAÇÃO DE ACESSO
// ============================================
exports.getFornecedorById = async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findById(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    // 🔥 VERIFICAR ACESSO (segurança extra)
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado a este fornecedor', erro: 'acesso_negado' });
    }
    
    res.json(fornecedor);
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// ATUALIZAR FORNECEDOR - COM VERIFICAÇÃO DE ACESSO
// ============================================
exports.atualizarFornecedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nif, ...atualizacoes } = req.body;
    const usuario = req.user?.nome || 'Sistema';
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    // 🔥 VERIFICAR ACESSO (segurança extra)
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado a este fornecedor', erro: 'acesso_negado' });
    }
    
    // Fallback para tipoFornecedor
    if (!fornecedor.tipoFornecedor && atualizacoes.tipoFornecedor) {
      fornecedor.tipoFornecedor = atualizacoes.tipoFornecedor;
    } else if (!fornecedor.tipoFornecedor) {
      fornecedor.tipoFornecedor = 'servicoGeral';
    }
    
    if (nif && nif !== fornecedor.nif) {
      const nifExistente = await Fornecedor.findOne({ nif, empresaId: fornecedor.empresaId, _id: { $ne: id } });
      if (nifExistente) {
        return res.status(400).json({ mensagem: 'NIF já existe', erro: 'duplicado' });
      }
      atualizacoes.nif = nif;
    }
    
    // Converter itens para itensFornecidos
    if (atualizacoes.itens && !atualizacoes.itensFornecidos) {
      atualizacoes.itensFornecidos = atualizacoes.itens;
      delete atualizacoes.itens;
    }
    
    Object.assign(fornecedor, atualizacoes);
    fornecedor.atualizadoPor = usuario;
    await fornecedor.save();
    
    res.json(fornecedor);
    
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// EXCLUIR/DESATIVAR FORNECEDOR - COM VERIFICAÇÃO DE ACESSO
// ============================================
exports.excluirFornecedor = async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findById(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    // 🔥 VERIFICAR ACESSO
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado a este fornecedor', erro: 'acesso_negado' });
    }
    
    fornecedor.status = 'Inativo';
    await fornecedor.save();
    
    res.json({ mensagem: `Fornecedor ${fornecedor.nome} desativado`, _id: fornecedor._id });
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// ESTATÍSTICAS DO FORNECEDOR
// ============================================
exports.getEstatisticasFornecedor = async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findById(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado', erro: 'acesso_negado' });
    }
    
    const pagamentos = await Pagamento.find({ tipo: 'Fornecedor', origemId: fornecedor._id });
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
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// TOP FORNECEDORES
// ============================================
exports.getTopFornecedores = async (req, res) => {
  try {
    const { empresaId, limit = 10 } = req.query;
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    const empresaFinal = empresaId || empresaUsuario;
    
    if (!empresaFinal) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const query = { status: 'Ativo', empresaId: new mongoose.Types.ObjectId(empresaFinal) };
    
    const fornecedores = await Fornecedor.find(query)
      .sort({ 'estatisticasCompras.totalGasto': -1 })
      .limit(parseInt(limit))
      .select('nome nif tipoFornecedor estatisticasCompras');
    
    res.json(fornecedores);
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// FORNECEDORES POR TIPO
// ============================================
exports.getFornecedoresPorTipo = async (req, res) => {
  try {
    const { tipoFornecedor } = req.params;
    const { empresaId } = req.query;
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    const empresaFinal = empresaId || empresaUsuario;
    
    if (!empresaFinal) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const query = { 
      tipoFornecedor, 
      status: 'Ativo',
      empresaId: new mongoose.Types.ObjectId(empresaFinal)
    };
    
    const fornecedores = await Fornecedor.find(query).sort({ nome: 1 });
    res.json(fornecedores);
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// CONTRATOS A VENCER
// ============================================
exports.getContratosAVencer = async (req, res) => {
  try {
    const { empresaId, dias = 30 } = req.query;
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    const empresaFinal = empresaId || empresaUsuario;
    
    if (!empresaFinal) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + parseInt(dias));
    
    const query = { 
      status: 'Ativo',
      empresaId: new mongoose.Types.ObjectId(empresaFinal),
      'contratos.dataFim': { $lte: dataLimite, $gte: hoje } 
    };
    
    const fornecedores = await Fornecedor.find(query).select('nome nif contratos');
    res.json(fornecedores);
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// ADICIONAR ITEM
// ============================================
exports.adicionarItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = req.body;
    const usuario = req.user?.nome || 'Sistema';
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado', erro: 'acesso_negado' });
    }
    
    if (!fornecedor.itensFornecidos) fornecedor.itensFornecidos = [];
    fornecedor.itensFornecidos.push(item);
    await fornecedor.save();
    
    res.json({ mensagem: 'Item adicionado com sucesso', item });
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// ATUALIZAR ITEM
// ============================================
exports.atualizarItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const updates = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado', erro: 'acesso_negado' });
    }
    
    const itemIndex = fornecedor.itensFornecidos.findIndex(i => i._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ mensagem: 'Item não encontrado', erro: 'nao_encontrado' });
    }
    
    Object.assign(fornecedor.itensFornecidos[itemIndex], updates);
    await fornecedor.save();
    
    res.json({ mensagem: 'Item atualizado com sucesso', item: fornecedor.itensFornecidos[itemIndex] });
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// REMOVER ITEM
// ============================================
exports.removerItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado', erro: 'acesso_negado' });
    }
    
    fornecedor.itensFornecidos = fornecedor.itensFornecidos.filter(i => i._id.toString() !== itemId);
    await fornecedor.save();
    
    res.json({ mensagem: 'Item removido com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// ADICIONAR CONTRATO
// ============================================
exports.adicionarContrato = async (req, res) => {
  try {
    const { id } = req.params;
    const contrato = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado', erro: 'acesso_negado' });
    }
    
    fornecedor.contratos.push(contrato);
    await fornecedor.save();
    
    res.json({ mensagem: 'Contrato adicionado com sucesso', contrato });
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// ATUALIZAR CONTRATO
// ============================================
exports.atualizarContrato = async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    const updates = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado', erro: 'acesso_negado' });
    }
    
    const contratoIndex = fornecedor.contratos.findIndex(c => c._id.toString() === contratoId);
    if (contratoIndex === -1) {
      return res.status(404).json({ mensagem: 'Contrato não encontrado', erro: 'nao_encontrado' });
    }
    
    Object.assign(fornecedor.contratos[contratoIndex], updates);
    await fornecedor.save();
    
    res.json({ mensagem: 'Contrato atualizado com sucesso', contrato: fornecedor.contratos[contratoIndex] });
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// REMOVER CONTRATO
// ============================================
exports.removerContrato = async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado', erro: 'acesso_negado' });
    }
    
    fornecedor.contratos = fornecedor.contratos.filter(c => c._id.toString() !== contratoId);
    await fornecedor.save();
    
    res.json({ mensagem: 'Contrato removido com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// GERAR PAGAMENTO DO CONTRATO
// ============================================
exports.gerarPagamentoContrato = async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado', erro: 'acesso_negado' });
    }
    
    const contrato = fornecedor.contratos.find(c => c._id.toString() === contratoId);
    if (!contrato) {
      return res.status(404).json({ mensagem: 'Contrato não encontrado', erro: 'nao_encontrado' });
    }
    
    const pagamento = new Pagamento({
      tipo: 'Fornecedor',
      origemId: fornecedor._id,
      beneficiario: fornecedor.nome,
      nifBeneficiario: fornecedor.nif,
      valor: contrato.valor,
      dataVencimento: new Date(Date.now() + 30 * 86400000),
      status: 'pendente',
      descricao: `Pagamento referente a contrato: ${contrato.descricao}`,
      usuario: req.user?.nome || 'Sistema',
      empresaId: fornecedor.empresaId
    });
    
    await pagamento.save();
    
    res.json({ mensagem: 'Pagamento gerado com sucesso', pagamento });
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// PRODUTOS FORNECIDOS
// ============================================
exports.getProdutosFornecidos = async (req, res) => {
  try {
    const { id } = req.params;
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado', erro: 'acesso_negado' });
    }
    
    const produtos = await Stock.find({ fornecedorId: fornecedor._id });
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};

// ============================================
// REGISTRAR COMPRA DE PRODUTO
// ============================================
exports.registrarCompraProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const { produtoId, quantidade, precoUnitario, numeroFactura } = req.body;
    const usuario = req.user?.nome || 'Sistema';
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado', erro: 'nao_encontrado' });
    }
    
    const empresaUsuario = req.empresaAtual || req.user?.empresaId;
    if (empresaUsuario && fornecedor.empresaId.toString() !== empresaUsuario.toString()) {
      return res.status(403).json({ mensagem: 'Acesso negado', erro: 'acesso_negado' });
    }
    
    const produto = await Stock.findById(produtoId);
    if (!produto) {
      return res.status(404).json({ mensagem: 'Produto não encontrado', erro: 'nao_encontrado' });
    }
    
    // Atualizar stock
    produto.quantidade += quantidade;
    produto.precoCompra = precoUnitario;
    produto.ultimoFornecedor = fornecedor._id;
    produto.dataUltimaEntrada = new Date();
    
    produto.historicoMovimentacoes = produto.historicoMovimentacoes || [];
    produto.historicoMovimentacoes.push({
      data: new Date(),
      tipo: 'entrada',
      quantidade: quantidade,
      quantidadeAnterior: produto.quantidade - quantidade,
      quantidadeNova: produto.quantidade,
      motivo: `Compra do fornecedor ${fornecedor.nome}`,
      usuario: usuario,
      fornecedorId: fornecedor._id,
      precoUnitario: precoUnitario,
      numeroFactura: numeroFactura
    });
    
    await produto.save();
    
    const valorTotal = quantidade * precoUnitario;
    fornecedor.estatisticasCompras = fornecedor.estatisticasCompras || {};
    fornecedor.estatisticasCompras.totalCompras = (fornecedor.estatisticasCompras.totalCompras || 0) + 1;
    fornecedor.estatisticasCompras.totalGasto = (fornecedor.estatisticasCompras.totalGasto || 0) + valorTotal;
    fornecedor.estatisticasCompras.ultimaCompra = new Date();
    await fornecedor.save();
    
    res.json({
      mensagem: 'Compra registrada com sucesso',
      produto,
      fornecedor: {
        _id: fornecedor._id,
        nome: fornecedor.nome,
        totalGasto: fornecedor.estatisticasCompras.totalGasto
      }
    });
    
  } catch (error) {
    console.error('Erro ao registrar compra:', error);
    res.status(500).json({ mensagem: error.message, erro: error.message });
  }
};