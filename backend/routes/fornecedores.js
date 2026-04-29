const express = require('express');
const router = express.Router();
const Fornecedor = require('../models/Fornecedor');
const Empresa = require('../models/Empresa');
const Pagamento = require('../models/Pagamento'); // <-- ADICIONADO
const integracaoPagamentos = require('../services/integracaoPagamentos');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// =============================================
// ROTAS PRINCIPAIS
// =============================================

router.get('/', async (req, res) => {
  try {
    const { status, tipoServico, busca, empresaId } = req.query;
    const query = {};
    if (empresaId) query.empresaId = empresaId;
    if (status) query.status = status;
    if (tipoServico) query.tipoServico = tipoServico;
    if (busca) {
      query.$or = [
        { nome: { $regex: busca, $options: 'i' } },
        { nif: { $regex: busca, $options: 'i' } },
        { tipoServico: { $regex: busca, $options: 'i' } },
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

// POST - Criar novo fornecedor (COM INTEGRAÇÃO AUTOMÁTICA)
router.post('/', async (req, res) => {
  try {
    const { nome, nif, empresaId, ...outros } = req.body;

    if (!empresaId) {
      return res.status(400).json({ mensagem: 'empresaId é obrigatório' });
    }
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    }

    const nifExistente = await Fornecedor.findOne({ nif, empresaId });
    if (nifExistente) {
      return res.status(400).json({ mensagem: 'Já existe um fornecedor com este NIF nesta empresa' });
    }

    const fornecedor = new Fornecedor({
      nome,
      nif,
      empresaId,
      empresaNome: empresa.nome,
      ...outros,
      criadoPor: req.user?.nome || req.user?.email || 'Sistema'
    });

    await fornecedor.save();
    
    // 🔥 INTEGRAÇÃO AUTOMÁTICA - GERAR PAGAMENTOS PARA CONTRATOS EXISTENTES
    if (fornecedor.contratos && fornecedor.contratos.length > 0) {
      console.log(`\n🏢 Gerando pagamentos para contratos de ${fornecedor.nome}...`);
      for (const contrato of fornecedor.contratos) {
        await integracaoPagamentos.integrarFornecedor(fornecedor, contrato, req.user?.nome || 'Sistema');
      }
    }
    
    res.status(201).json(fornecedor);
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error);
    res.status(500).json({ mensagem: 'Erro ao criar fornecedor', erro: error.message });
  }
});

// PUT - Atualizar fornecedor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nif, empresaId, ...atualizacoes } = req.body;

    const fornecedorExistente = await Fornecedor.findById(id);
    if (!fornecedorExistente) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }

    if (empresaId && String(empresaId) !== String(fornecedorExistente.empresaId)) {
      const empresa = await Empresa.findById(empresaId);
      if (!empresa) {
        return res.status(404).json({ mensagem: 'Empresa não encontrada' });
      }
      atualizacoes.empresaId = empresaId;
      atualizacoes.empresaNome = empresa.nome;
    }

    const empresaAlvo = atualizacoes.empresaId || fornecedorExistente.empresaId;
    if (nif && nif !== fornecedorExistente.nif) {
      const nifExistente = await Fornecedor.findOne({
        nif,
        empresaId: empresaAlvo,
        _id: { $ne: id }
      });
      if (nifExistente) {
        return res.status(400).json({ mensagem: 'Já existe um fornecedor com este NIF nesta empresa' });
      }
      atualizacoes.nif = nif;
    }

    const fornecedor = await Fornecedor.findByIdAndUpdate(
      id,
      {
        ...atualizacoes,
        atualizadoPor: req.user?.nome || req.user?.email || 'Sistema',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    res.json(fornecedor);
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar fornecedor', erro: error.message });
  }
});

// DELETE - Excluir fornecedor
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

// =============================================
// ROTAS DE CONTRATOS COM INTEGRAÇÃO AUTOMÁTICA
// =============================================

// POST - Adicionar contrato a fornecedor (COM INTEGRAÇÃO AUTOMÁTICA)
router.post('/:id/contratos', async (req, res) => {
  try {
    const { id } = req.params;
    const contrato = req.body;

    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }

    // Calcular próximo pagamento
    const proximoPagamento = calcularProximoPagamento(contrato);

    fornecedor.contratos = fornecedor.contratos || [];
    fornecedor.contratos.push({ ...contrato, proximoPagamento });
    fornecedor.proximoPagamento = proximoPagamento;

    await fornecedor.save();

    // 🔥 INTEGRAÇÃO AUTOMÁTICA - GERAR PAGAMENTO PARA O NOVO CONTRATO
    console.log(`\n📄 Gerando pagamento para novo contrato de ${fornecedor.nome}...`);
    const pagamento = await integracaoPagamentos.integrarFornecedor(
      fornecedor, 
      contrato, 
      req.user?.nome || 'Sistema'
    );
    
    console.log(`✅ Pagamento gerado: ${pagamento?.referencia || 'N/A'}`);

    res.json({
      sucesso: true,
      mensagem: 'Contrato adicionado com sucesso',
      fornecedor,
      pagamento
    });
  } catch (error) {
    console.error('Erro ao adicionar contrato:', error);
    res.status(500).json({ mensagem: 'Erro ao adicionar contrato', erro: error.message });
  }
});

// =============================================
// ROTA DE RECALCULO E GERAÇÃO DE PAGAMENTOS PENDENTES
// =============================================

// POST - Recalcular todos os contratos e gerar pagamentos pendentes
router.post('/recalcular-pagamentos', async (req, res) => {
  try {
    const { empresaId } = req.body;
    console.log('\n🔄 [FORNECEDORES] Recalculando contratos e gerando pagamentos pendentes...');
    
    const query = { status: 'Ativo' };
    if (empresaId) query.empresaId = empresaId;
    
    const fornecedores = await Fornecedor.find(query);
    let totalContratosAtualizados = 0;
    let totalPagamentosGerados = 0;
    let totalErros = 0;
    
    for (const fornecedor of fornecedores) {
      console.log(`\n🏢 Processando: ${fornecedor.nome}`);
      let contratoAtualizado = false;
      
      for (let i = 0; i < fornecedor.contratos.length; i++) {
        const contrato = fornecedor.contratos[i];
        const hoje = new Date();
        const dataFim = new Date(contrato.dataFim);
        
        if (dataFim < hoje) {
          console.log(`   ⏭️ Contrato ${i + 1} expirado`);
          continue;
        }
        
        // Calcular próximo pagamento se não existir
        if (!contrato.proximoPagamento && contrato.modalidadePagamento !== 'Único') {
          const diaPagamento = contrato.diaPagamento || 15;
          let proximoPagamento = new Date(hoje);
          
          switch (contrato.modalidadePagamento) {
            case 'Mensal':
              proximoPagamento.setDate(diaPagamento);
              if (proximoPagamento <= hoje) {
                proximoPagamento.setMonth(proximoPagamento.getMonth() + 1);
              }
              break;
            case 'Semanal':
              proximoPagamento.setDate(hoje.getDate() + 7);
              break;
            case 'Quinzenal':
              proximoPagamento.setDate(hoje.getDate() + 15);
              break;
            default:
              proximoPagamento = null;
          }
          
          if (proximoPagamento && proximoPagamento <= dataFim) {
            contrato.proximoPagamento = proximoPagamento;
            contratoAtualizado = true;
            totalContratosAtualizados++;
            console.log(`   ✅ Contrato ${i + 1}: próximo pagamento = ${proximoPagamento.toLocaleDateString()}`);
          }
        }
        
        // Gerar pagamento para o contrato
        if (contrato.proximoPagamento && contrato.proximoPagamento >= hoje) {
          try {
            const pagamento = await integracaoPagamentos.integrarFornecedor(
              fornecedor,
              contrato,
              'Sistema - Recalculo'
            );
            
            if (pagamento) {
              totalPagamentosGerados++;
              console.log(`      ✅ Pagamento gerado: ${pagamento.referencia}`);
            }
          } catch (error) {
            totalErros++;
            console.error(`      ❌ Erro: ${error.message}`);
          }
        }
      }
      
      if (contratoAtualizado) {
        const pagamentosFuturos = fornecedor.contratos
          .filter(c => c.proximoPagamento && new Date(c.proximoPagamento) > new Date())
          .map(c => new Date(c.proximoPagamento))
          .sort((a, b) => a - b);
        
        fornecedor.proximoPagamento = pagamentosFuturos[0] || null;
        await fornecedor.save();
      }
    }
    
    res.json({
      sucesso: true,
      mensagem: 'Recalculo concluído',
      estatisticas: {
        fornecedoresProcessados: fornecedores.length,
        contratosAtualizados: totalContratosAtualizados,
        pagamentosGerados: totalPagamentosGerados,
        erros: totalErros
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao recalcular pagamentos:', error);
    res.status(500).json({ mensagem: 'Erro ao recalcular pagamentos', erro: error.message });
  }
});

// =============================================
// ROTAS DE PAGAMENTOS
// =============================================

// GET - Listar pagamentos de um fornecedor específico
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
    
    res.json({
      sucesso: true,
      mensagem: `Pagamento ${pagamento.referencia} atualizado para ${status}`,
      pagamento
    });
  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar pagamento', erro: error.message });
  }
});

// POST - Gerar pagamentos automáticos para fornecedores
router.post('/gerar-pagamentos', async (req, res) => {
  try {
    const { empresaId } = req.body;
    const pagamentos = await integracaoPagamentos.gerarPagamentosFornecedores(empresaId);

    res.json({
      sucesso: true,
      mensagem: `${pagamentos.length} pagamentos de fornecedores gerados`,
      pagamentos
    });
  } catch (error) {
    console.error('Erro ao gerar pagamentos:', error);
    res.status(500).json({ mensagem: 'Erro ao gerar pagamentos', erro: error.message });
  }
});


// =============================================
// ROTA PARA GERAR PAGAMENTO DE CONTRATO ESPECÍFICO
// =============================================

// POST - Gerar pagamento para um contrato específico
router.post('/:id/contratos/:contratoIndex/gerar-pagamento', async (req, res) => {
  try {
    const { id, contratoIndex } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    const contrato = fornecedor.contratos[parseInt(contratoIndex)];
    if (!contrato) {
      return res.status(404).json({ sucesso: false, mensagem: 'Contrato não encontrado' });
    }
    
    // Verificar se já existe pagamento
    const hoje = new Date();
    const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    
    const pagamentoExistente = await Pagamento.findOne({
      tipo: 'Fornecedor',
      origemId: fornecedor._id,
      'detalhesPagamento.mesReferencia': mesReferencia
    });
    
    if (pagamentoExistente) {
      return res.json({
        sucesso: false,
        mensagem: 'Pagamento já existe para este período',
        pagamento: pagamentoExistente
      });
    }
    
    // Gerar pagamento
    const pagamento = await integracaoPagamentos.integrarFornecedor(
      fornecedor,
      contrato,
      req.user?.nome || 'Sistema - Manual'
    );
    
    if (pagamento) {
      res.json({
        sucesso: true,
        mensagem: `Pagamento ${pagamento.referencia} gerado com sucesso`,
        pagamento
      });
    } else {
      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao gerar pagamento'
      });
    }
    
  } catch (error) {
    console.error('Erro ao gerar pagamento:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// DELETE - Excluir contrato específico
router.delete('/:id/contratos/:contratoIndex', async (req, res) => {
  try {
    const { id, contratoIndex } = req.params;
    
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    if (!fornecedor.contratos[parseInt(contratoIndex)]) {
      return res.status(404).json({ sucesso: false, mensagem: 'Contrato não encontrado' });
    }
    
    // Remover contrato
    fornecedor.contratos.splice(parseInt(contratoIndex), 1);
    
    // Recalcular próximo pagamento geral
    const hoje = new Date();
    const pagamentosFuturos = fornecedor.contratos
      .filter(c => c.proximoPagamento && new Date(c.proximoPagamento) > hoje)
      .map(c => new Date(c.proximoPagamento))
      .sort((a, b) => a - b);
    
    fornecedor.proximoPagamento = pagamentosFuturos[0] || null;
    
    await fornecedor.save();
    
    res.json({
      sucesso: true,
      mensagem: 'Contrato excluído com sucesso',
      fornecedor
    });
    
  } catch (error) {
    console.error('Erro ao excluir contrato:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});


// =============================================
// FUNÇÕES AUXILIARES
// =============================================

function formatarNumero(numero) {
  if (!numero && numero !== 0) return "0,00";
  return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

module.exports = router;