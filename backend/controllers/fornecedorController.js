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
    // Criar pagamento para o serviço
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
    if (!empresaId) return res.status(400).json({ sucesso: false, mensagem: 'empresaId é obrigatório' });
    if (!nome) return res.status(400).json({ sucesso: false, mensagem: 'Nome do fornecedor é obrigatório' });
    if (!nif) return res.status(400).json({ sucesso: false, mensagem: 'NIF é obrigatório' });
    if (!tipoFornecedor) return res.status(400).json({ sucesso: false, mensagem: 'Tipo de fornecedor é obrigatório' });
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
    
    const nifExistente = await Fornecedor.findOne({ nif, empresaId });
    if (nifExistente) return res.status(400).json({ sucesso: false, mensagem: 'Já existe um fornecedor com este NIF' });
    
    // Criar fornecedor
    const fornecedor = new Fornecedor({
      nome, nif, empresaId, empresaNome: empresa.nome,
      tipoFornecedor, natureza,
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
    
    res.status(201).json({
      sucesso: true,
      mensagem: `Fornecedor ${fornecedor.nome} cadastrado com sucesso!`,
      dados: { fornecedor, processamento: resultados }
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar fornecedor:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.listarFornecedores = async (req, res) => {
  try {
    const { empresaId, tipoFornecedor, status, busca } = req.query;
    const query = {};
    
    if (empresaId) query.empresaId = new mongoose.Types.ObjectId(empresaId);
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
    res.json({ sucesso: true, dados: fornecedores });
  } catch (error) {
    console.error('Erro ao listar fornecedores:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.getFornecedorById = async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findById(req.params.id);
    if (!fornecedor) return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    res.json({ sucesso: true, dados: fornecedor });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.atualizarFornecedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nif, ...atualizacoes } = req.body;
    const usuario = req.user?.nome || 'Sistema';
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    
    if (nif && nif !== fornecedor.nif) {
      const nifExistente = await Fornecedor.findOne({ nif, empresaId: fornecedor.empresaId, _id: { $ne: id } });
      if (nifExistente) return res.status(400).json({ sucesso: false, mensagem: 'NIF já existe' });
      atualizacoes.nif = nif;
    }
    
    Object.assign(fornecedor, atualizacoes);
    fornecedor.atualizadoPor = usuario;
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: `Fornecedor ${fornecedor.nome} atualizado`, dados: fornecedor });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.excluirFornecedor = async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findById(req.params.id);
    if (!fornecedor) return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    
    fornecedor.status = 'Inativo';
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: `Fornecedor ${fornecedor.nome} desativado` });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.getEstatisticasFornecedor = async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findById(req.params.id);
    if (!fornecedor) return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    
    const pagamentos = await Pagamento.find({ tipo: 'Fornecedor', origemId: fornecedor._id });
    const totalPago = pagamentos.filter(p => p.status === 'Pago').reduce((sum, p) => sum + p.valor, 0);
    const totalPendente = pagamentos.filter(p => p.status === 'pendente').reduce((sum, p) => sum + p.valor, 0);
    
    res.json({
      sucesso: true,
      dados: {
        fornecedor: { _id: fornecedor._id, nome: fornecedor.nome, nif: fornecedor.nif, tipoFornecedor: fornecedor.tipoFornecedor, status: fornecedor.status },
        estatisticas: {
          totalCompras: fornecedor.estatisticasCompras?.totalCompras || 0,
          totalGasto: fornecedor.estatisticasCompras?.totalGasto || 0,
          totalPago, totalPendente,
          itensFornecidos: fornecedor.itensFornecidos?.length || 0,
          contratosAtivos: fornecedor.contratos?.filter(c => new Date(c.dataFim) > new Date()).length || 0
        },
        ultimosPagamentos: pagamentos.slice(0, 10)
      }
    });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// NOVOS MÉTODOS PARA O FORNECEDOR CONTROLLER
// ============================================

exports.getTopFornecedores = async (req, res) => {
  try {
    const { empresaId, limit = 10 } = req.query;
    const query = { status: 'Ativo' };
    if (empresaId) query.empresaId = new mongoose.Types.ObjectId(empresaId);
    
    const fornecedores = await Fornecedor.find(query)
      .sort({ 'estatisticasCompras.totalGasto': -1 })
      .limit(parseInt(limit))
      .select('nome nif tipoServico estatisticasCompras');
    
    res.json({ sucesso: true, dados: fornecedores });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.getFornecedoresPorTipo = async (req, res) => {
  try {
    const { tipoFornecedor } = req.params;
    const { empresaId } = req.query;
    const query = { tipoServico: tipoFornecedor, status: 'Ativo' };
    if (empresaId) query.empresaId = new mongoose.Types.ObjectId(empresaId);
    
    const fornecedores = await Fornecedor.find(query).sort({ nome: 1 });
    res.json({ sucesso: true, dados: fornecedores });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.getContratosAVencer = async (req, res) => {
  try {
    const { empresaId, dias = 30 } = req.query;
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + parseInt(dias));
    
    const query = { 
      status: 'Ativo', 
      'contratos.dataFim': { $lte: dataLimite, $gte: hoje } 
    };
    if (empresaId) query.empresaId = new mongoose.Types.ObjectId(empresaId);
    
    const fornecedores = await Fornecedor.find(query).select('nome nif contratos');
    res.json({ sucesso: true, dados: fornecedores });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.adicionarItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = req.body;
    const usuario = req.user?.nome || 'Sistema';
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    if (!fornecedor.itensFornecidos) fornecedor.itensFornecidos = [];
    fornecedor.itensFornecidos.push(item);
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Item adicionado com sucesso' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.atualizarItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const updates = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    const itemIndex = fornecedor.itensFornecidos.findIndex(i => i._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ sucesso: false, mensagem: 'Item não encontrado' });
    }
    
    Object.assign(fornecedor.itensFornecidos[itemIndex], updates);
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Item atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.removerItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    fornecedor.itensFornecidos = fornecedor.itensFornecidos.filter(i => i._id.toString() !== itemId);
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Item removido com sucesso' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.adicionarContrato = async (req, res) => {
  try {
    const { id } = req.params;
    const contrato = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    fornecedor.contratos.push(contrato);
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Contrato adicionado com sucesso' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.atualizarContrato = async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    const updates = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    const contratoIndex = fornecedor.contratos.findIndex(c => c._id.toString() === contratoId);
    if (contratoIndex === -1) {
      return res.status(404).json({ sucesso: false, mensagem: 'Contrato não encontrado' });
    }
    
    Object.assign(fornecedor.contratos[contratoIndex], updates);
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Contrato atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.removerContrato = async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    fornecedor.contratos = fornecedor.contratos.filter(c => c._id.toString() !== contratoId);
    await fornecedor.save();
    
    res.json({ sucesso: true, mensagem: 'Contrato removido com sucesso' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.gerarPagamentoContrato = async (req, res) => {
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
    
    const Pagamento = require('../models/Pagamento');
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
    
    res.json({ sucesso: true, mensagem: 'Pagamento gerado com sucesso', dados: pagamento });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.getProdutosFornecidos = async (req, res) => {
  try {
    const { id } = req.params;
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    res.json({ sucesso: true, dados: fornecedor.produtosFornecidos || [] });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.registrarCompraProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const { produtoId, quantidade, precoUnitario, numeroFactura } = req.body;
    const usuario = req.user?.nome || 'Sistema';
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    if (!fornecedor.registrarCompra) {
      return res.status(501).json({ sucesso: false, mensagem: 'Método registrarCompra não implementado' });
    }
    
    const resultado = await fornecedor.registrarCompra(produtoId, quantidade, precoUnitario, numeroFactura, usuario);
    
    if (resultado.sucesso) {
      res.json({ sucesso: true, mensagem: 'Compra registrada com sucesso', dados: resultado });
    } else {
      res.status(400).json({ sucesso: false, mensagem: resultado.erro });
    }
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};