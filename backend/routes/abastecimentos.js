// backend/routes/abastecimentos.js
const express = require('express');
const router = express.Router();
const Abastecimento = require('../models/Abastecimento');
const Viatura = require('../models/Viatura');
const Empresa = require('../models/Empresa');
const integracaoPagamentos = require('../services/integracaoPagamentos');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// GET - Listar abastecimentos por empresa
router.get('/', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'ID da empresa é obrigatório' });
    }
    
    const abastecimentos = await Abastecimento.find({ empresaId })
      .sort({ dataAbastecimento: -1 });
    
    res.json(abastecimentos);
  } catch (error) {
    console.error('Erro ao buscar abastecimentos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar abastecimentos' });
  }
});

// GET - Por ID
router.get('/:id', async (req, res) => {
  try {
    const { empresaId } = req.query;
    const abastecimento = await Abastecimento.findOne({ 
      _id: req.params.id, 
      empresaId 
    });
    
    if (!abastecimento) {
      return res.status(404).json({ mensagem: 'Não encontrado' });
    }
    
    res.json(abastecimento);
  } catch (error) {
    console.error('Erro ao buscar abastecimento:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar' });
  }
});

// GET - Estatísticas por empresa
router.get('/stats/resumo', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'ID da empresa é obrigatório' });
    }
    
    console.log(`📊 Buscando estatísticas para empresa: ${empresaId}`);
    
    const stats = await Abastecimento.aggregate([
      { $match: { empresaId: new mongoose.Types.ObjectId(empresaId) } },
      {
        $group: {
          _id: null,
          totalLitros: { $sum: '$quantidade' },
          totalGasto: { $sum: '$total' },
          totalAbastecimentos: { $sum: 1 },
          mediaPreco: { $avg: '$precoLitro' }
        }
      }
    ]);
    
    console.log('📊 Estatísticas encontradas:', stats);
    
    const resultado = stats[0] || { 
      totalLitros: 0, 
      totalGasto: 0, 
      totalAbastecimentos: 0, 
      mediaPreco: 0 
    };
    
    res.json({
      sucesso: true,
      dados: resultado
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar estatísticas' });
  }
});

// POST - Criar abastecimento
router.post('/', async (req, res) => {
  try {
    console.log('\n⛽ [ABASTECIMENTO] Criando abastecimento...');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const { empresaId, viaturaId, ...dados } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa é obrigatória' });
    }
    
    if (!viaturaId) {
      return res.status(400).json({ mensagem: 'Viatura é obrigatória' });
    }
    
    // Verificar se a viatura pertence à empresa
    const viatura = await Viatura.findOne({ _id: viaturaId, empresaId });
    if (!viatura) {
      return res.status(404).json({ mensagem: 'Viatura não encontrada para esta empresa' });
    }
    
    // Calcular total
    const total = dados.quantidade * dados.precoLitro;
    
    const abastecimento = new Abastecimento({
      ...dados,
      viaturaId,
      viaturaMatricula: viatura.matricula,
      total,
      empresaId,
      usuario: req.user?.nome || 'Sistema',
      dataAbastecimento: new Date()
    });
    
    await abastecimento.save();
    console.log(`✅ Abastecimento salvo: ${abastecimento._id}`);
    
    // Atualizar km da viatura
    if (dados.km && dados.km > viatura.km) {
      viatura.km = dados.km;
      await viatura.save();
      console.log(`✅ KM da viatura atualizado: ${viatura.km}`);
    }
    
    // INTEGRAÇÃO COM PAGAMENTOS
    console.log('🔔 Integrando com pagamentos...');
    
    const empresa = await Empresa.findById(empresaId);
    if (empresa && abastecimento.total > 0) {
      console.log(`🏢 Empresa: ${empresa.nome}`);
      console.log(`💰 Total: ${abastecimento.total} Kz`);
      
      const pagamento = await integracaoPagamentos.integrarAbastecimento(abastecimento, empresa, req.user?.nome || 'Sistema');
      
      if (pagamento) {
        console.log(`✅ Pagamento criado: ${pagamento.referencia}`);
      } else {
        console.log(`⚠️ Falha ao criar pagamento`);
      }
    }
    
    res.status(201).json(abastecimento);
  } catch (error) {
    console.error('❌ Erro ao criar abastecimento:', error);
    res.status(500).json({ mensagem: 'Erro ao criar abastecimento', error: error.message });
  }
});

// PUT - Atualizar abastecimento
router.put('/:id', async (req, res) => {
  try {
    const { empresaId, ...dados } = req.body;
    
    const abastecimento = await Abastecimento.findOne({ 
      _id: req.params.id, 
      empresaId 
    });
    
    if (!abastecimento) {
      return res.status(404).json({ mensagem: 'Não encontrado' });
    }
    
    // Recalcular total se quantidade ou preço mudaram
    if (dados.quantidade || dados.precoLitro) {
      const quantidade = dados.quantidade || abastecimento.quantidade;
      const precoLitro = dados.precoLitro || abastecimento.precoLitro;
      dados.total = quantidade * precoLitro;
    }
    
    Object.assign(abastecimento, dados);
    abastecimento.updatedAt = new Date();
    
    await abastecimento.save();
    
    res.json(abastecimento);
  } catch (error) {
    console.error('Erro ao atualizar abastecimento:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar abastecimento' });
  }
});

// DELETE - Excluir abastecimento
router.delete('/:id', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    const abastecimento = await Abastecimento.findOneAndDelete({ 
      _id: req.params.id, 
      empresaId 
    });
    
    if (!abastecimento) {
      return res.status(404).json({ mensagem: 'Não encontrado' });
    }
    
    res.json({ mensagem: 'Abastecimento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir abastecimento:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir abastecimento' });
  }
});

module.exports = router;