// backend/routes/fornecedores.js - VERSÃO COMPLETA (nada removido)
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Fornecedor = require('../models/Fornecedor');
const Empresa = require('../models/Empresa');
const Stock = require('../models/Stock');
const Pagamento = require('../models/Pagamento');
const { verifyToken } = require('../middlewares/auth');
const { validateEmpresaAccess } = require('../middlewares/security');

router.use(verifyToken);
router.use(validateEmpresaAccess);

// ============================================
// FUNÇÃO PARA CRIAR PRODUTO NO STOCK
// ============================================
async function criarProdutoNoStock(fornecedor, produtoInfo, empresaId, usuario) {
  try {
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
    console.error(`❌ Erro ao criar produto no stock:`, error);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA GERAR PAGAMENTO
// ============================================
async function gerarPagamento(fornecedor, contrato, usuario) {
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
      descricao: `Pagamento - ${contrato.descricao || fornecedor.tipoFornecedor}`,
      usuario: usuario,
      empresaId: fornecedor.empresaId,
      detalhesPagamento: {
        contaBancaria: fornecedor.pagamento?.iban || '',
        modalidade: fornecedor.pagamento?.formaPagamento || 'Transferência',
        mesReferencia: mesReferencia,
        contratoId: contrato._id
      }
    });
    
    await pagamento.save();
    console.log(`💰 Pagamento gerado: ${pagamento._id}`);
    return pagamento;
  } catch (error) {
    console.error('Erro ao gerar pagamento:', error);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA CALCULAR PRÓXIMO PAGAMENTO
// ============================================
function calcularProximoPagamento(contrato, dataReferencia = new Date()) {
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
    case 'Único':
      proximoPagamento = null;
      break;
    default:
      proximoPagamento = null;
  }

  return proximoPagamento;
}

// ============================================
// GET - Listar fornecedores
// ============================================
router.get('/', async (req, res) => {
  try {
    const { empresaId, tipoFornecedor, status, busca } = req.query;
    const query = {};
    
    if (empresaId) query.empresaId = empresaId;
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
    res.status(500).json({ mensagem: 'Erro ao listar fornecedores', erro: error.message });
  }
});

// ============================================
// GET - Buscar fornecedor por ID
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findById(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    res.json(fornecedor);
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar fornecedor', erro: error.message });
  }
});

// ============================================
// POST - Criar fornecedor (COMPLETO)
// ============================================
router.post('/', async (req, res) => {
  try {
    const { 
      nome, nif, empresaId, tipoFornecedor, tipoServico,
      contratos, produtoInfo, regimeTributacao, fiscal, 
      pagamento, status, observacoes, contato, telefone, email, endereco
    } = req.body;
    
    const usuario = req.user?.nome || req.user?.email || 'Sistema';
    
    if (!empresaId) return res.status(400).json({ mensagem: 'empresaId é obrigatório' });
    if (!nome) return res.status(400).json({ mensagem: 'Nome do fornecedor é obrigatório' });
    if (!nif) return res.status(400).json({ mensagem: 'NIF é obrigatório' });
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    
    const nifExistente = await Fornecedor.findOne({ nif, empresaId });
    if (nifExistente) return res.status(400).json({ mensagem: 'Já existe um fornecedor com este NIF' });
    
    const fornecedor = new Fornecedor({
      empresaId,
      empresaNome: empresa.nome,
      nome,
      nif,
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
      criadoPor: usuario
    });
    
    await fornecedor.save();
    console.log(`✅ Fornecedor criado: ${fornecedor.nome}`);
    
    let produtoCriado = null;
    
    // Integração para mercadoria
    if ((tipoFornecedor === 'mercadoria' || tipoServico === 'mercadoria') && produtoInfo?.produto) {
      produtoCriado = await criarProdutoNoStock(fornecedor, produtoInfo, empresaId, usuario);
      if (produtoCriado) {
        fornecedor.produtoInfo.stockId = produtoCriado._id;
        await fornecedor.save();
      }
    }
    
    // Integração para contratos
    if (contratos && contratos.length > 0) {
      for (const contrato of contratos) {
        contrato.proximoPagamento = calcularProximoPagamento(contrato);
        await gerarPagamento(fornecedor, contrato, usuario);
      }
    }
    
    res.status(201).json({
      sucesso: true,
      mensagem: `Fornecedor ${fornecedor.nome} cadastrado com sucesso!`,
      _id: fornecedor._id,
      fornecedor
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar fornecedor:', error);
    res.status(500).json({ mensagem: 'Erro ao criar fornecedor', erro: error.message });
  }
});

// ============================================
// PUT - Atualizar fornecedor
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nif, itens, ...atualizacoes } = req.body;
    const usuario = req.user?.nome || 'Sistema';
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    if (nif && nif !== fornecedor.nif) {
      const nifExistente = await Fornecedor.findOne({ nif, empresaId: fornecedor.empresaId, _id: { $ne: id } });
      if (nifExistente) {
        return res.status(400).json({ mensagem: 'NIF já existe' });
      }
      atualizacoes.nif = nif;
    }
    
    // Converter itens para itensFornecidos
    if (itens && !atualizacoes.itensFornecidos) {
      atualizacoes.itensFornecidos = itens;
    }
    
    Object.assign(fornecedor, atualizacoes);
    fornecedor.atualizadoPor = usuario;
    await fornecedor.save();
    
    res.json(fornecedor);
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar fornecedor', erro: error.message });
  }
});

// ============================================
// DELETE - Excluir fornecedor
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findByIdAndDelete(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    res.json({ mensagem: 'Fornecedor excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir fornecedor:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir fornecedor', erro: error.message });
  }
});

// ============================================
// CRUD DE ITENS
// ============================================

router.post('/:id/itens', async (req, res) => {
  try {
    const { id } = req.params;
    const item = req.body;
    const usuario = req.user?.nome || 'Sistema';
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    
    if (!fornecedor.itensFornecidos) fornecedor.itensFornecidos = [];
    fornecedor.itensFornecidos.push({ ...item, usuario, dataRegisto: new Date() });
    await fornecedor.save();
    
    res.json({ mensagem: 'Item adicionado com sucesso', item });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

router.put('/:id/itens/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const updates = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    
    const itemIndex = fornecedor.itensFornecidos.findIndex(i => i._id.toString() === itemId);
    if (itemIndex === -1) return res.status(404).json({ mensagem: 'Item não encontrado' });
    
    Object.assign(fornecedor.itensFornecidos[itemIndex], updates);
    await fornecedor.save();
    
    res.json({ mensagem: 'Item atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

router.delete('/:id/itens/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    
    fornecedor.itensFornecidos = fornecedor.itensFornecidos.filter(i => i._id.toString() !== itemId);
    await fornecedor.save();
    
    res.json({ mensagem: 'Item removido com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

// ============================================
// CRUD DE CONTRATOS
// ============================================

router.post('/:id/contratos', async (req, res) => {
  try {
    const { id } = req.params;
    const contrato = req.body;
    const usuario = req.user?.nome || 'Sistema';
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    
    contrato.proximoPagamento = calcularProximoPagamento(contrato);
    fornecedor.contratos.push(contrato);
    await fornecedor.save();
    
    await gerarPagamento(fornecedor, contrato, usuario);
    
    res.json({ mensagem: 'Contrato adicionado com sucesso', fornecedor });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

router.put('/:id/contratos/:contratoId', async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    const updates = req.body;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    
    const contratoIndex = fornecedor.contratos.findIndex(c => c._id.toString() === contratoId);
    if (contratoIndex === -1) return res.status(404).json({ mensagem: 'Contrato não encontrado' });
    
    Object.assign(fornecedor.contratos[contratoIndex], updates);
    await fornecedor.save();
    
    res.json({ mensagem: 'Contrato atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

router.delete('/:id/contratos/:contratoId', async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    
    fornecedor.contratos = fornecedor.contratos.filter(c => c._id.toString() !== contratoId);
    await fornecedor.save();
    
    res.json({ mensagem: 'Contrato removido com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

// ============================================
// ROTAS DE PAGAMENTOS (PRESERVADAS)
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
    
    res.json({ fornecedor: { _id: fornecedor._id, nome: fornecedor.nome, nif: fornecedor.nif }, pagamentos });
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ mensagem: 'Erro ao listar pagamentos', erro: error.message });
  }
});

// PUT - Atualizar status do pagamento
router.put('/pagamentos/:pagamentoId', async (req, res) => {
  try {
    const { pagamentoId } = req.params;
    const { status, dataPagamento, observacao } = req.body;
    
    const pagamento = await Pagamento.findById(pagamentoId);
    if (!pagamento) {
      return res.status(404).json({ mensagem: 'Pagamento não encontrado' });
    }
    
    pagamento.status = status;
    
    if (status === 'Pago' && dataPagamento) {
      pagamento.dataPagamento = new Date(dataPagamento);
      pagamento.saldo = 0;
      pagamento.pagoPor = req.user?.nome || req.user?.email || 'Sistema';
    }
    
    if (observacao) pagamento.observacao = observacao;
    pagamento.atualizadoPor = req.user?.nome || req.user?.email || 'Sistema';
    pagamento.updatedAt = new Date();
    
    await pagamento.save();
    
    res.json({ sucesso: true, mensagem: `Pagamento atualizado para ${status}`, pagamento });
  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar pagamento', erro: error.message });
  }
});

// POST - Gerar pagamentos automáticos (recalculo geral)
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
        
        const mesReferencia = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const pagamentoExistente = await Pagamento.findOne({
          tipo: 'Fornecedor',
          origemId: fornecedor._id,
          'detalhesPagamento.mesReferencia': mesReferencia
        });
        
        if (!pagamentoExistente) {
          const pagamento = await gerarPagamento(fornecedor, contrato, 'Sistema - Automático');
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

// POST - Recalcular todos os contratos
router.post('/recalcular-pagamentos', async (req, res) => {
  try {
    const { empresaId } = req.body;
    const query = { status: 'Ativo' };
    if (empresaId) query.empresaId = empresaId;
    
    const fornecedores = await Fornecedor.find(query);
    let atualizados = 0;
    
    for (const fornecedor of fornecedores) {
      let modificado = false;
      for (const contrato of fornecedor.contratos || []) {
        const novoPagamento = calcularProximoPagamento(contrato);
        if (novoPagamento !== contrato.proximoPagamento) {
          contrato.proximoPagamento = novoPagamento;
          modificado = true;
        }
      }
      if (modificado) {
        await fornecedor.save();
        atualizados++;
      }
    }
    
    res.json({ sucesso: true, mensagem: `${atualizados} fornecedores atualizados` });
  } catch (error) {
    console.error('Erro ao recalcular:', error);
    res.status(500).json({ mensagem: 'Erro ao recalcular', erro: error.message });
  }
});

// POST - Gerar pagamento para contrato específico
router.post('/:id/contratos/:contratoId/gerar-pagamento', async (req, res) => {
  try {
    const { id, contratoId } = req.params;
    const usuario = req.user?.nome || 'Sistema - Manual';
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    
    const contrato = fornecedor.contratos.find(c => c._id.toString() === contratoId);
    if (!contrato) return res.status(404).json({ mensagem: 'Contrato não encontrado' });
    
    const pagamento = await gerarPagamento(fornecedor, contrato, usuario);
    
    if (pagamento) {
      res.json({ sucesso: true, mensagem: 'Pagamento gerado com sucesso', pagamento });
    } else {
      res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar pagamento' });
    }
  } catch (error) {
    res.status(500).json({ mensagem: error.message });
  }
});

module.exports = router;