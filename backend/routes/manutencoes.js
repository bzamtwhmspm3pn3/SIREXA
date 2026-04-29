// backend/routes/manutencoes.js
const express = require('express');
const router = express.Router();
const Manutencao = require('../models/Manutencao');
const Viatura = require('../models/Viatura');
const Empresa = require('../models/Empresa');
const integracaoPagamentos = require('../services/integracaoPagamentos');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// GET - Listar manutenções por empresa
router.get('/', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'ID da empresa é obrigatório' });
    }
    
    const manutencoes = await Manutencao.find({ empresaId })
      .sort({ dataManutencao: -1 });
    
    res.json(manutencoes);
  } catch (error) {
    console.error('Erro ao buscar manutenções:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar manutenções' });
  }
});

// GET - Por ID
router.get('/:id', async (req, res) => {
  try {
    const { empresaId } = req.query;
    const manutencao = await Manutencao.findOne({ 
      _id: req.params.id, 
      empresaId 
    });
    
    if (!manutencao) {
      return res.status(404).json({ mensagem: 'Não encontrado' });
    }
    
    res.json(manutencao);
  } catch (error) {
    console.error('Erro ao buscar manutenção:', error);
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
    
    const stats = await Manutencao.aggregate([
      { $match: { empresaId: new mongoose.Types.ObjectId(empresaId) } },
      {
        $group: {
          _id: '$tipoManutencao',
          totalCusto: { $sum: '$custo' },
          totalManutencoes: { $sum: 1 },
          mediaCusto: { $avg: '$custo' }
        }
      },
      { $sort: { totalCusto: -1 } }
    ]);
    
    const totalGeral = await Manutencao.aggregate([
      { $match: { empresaId: new mongoose.Types.ObjectId(empresaId) } },
      {
        $group: {
          _id: null,
          totalCusto: { $sum: '$custo' },
          totalManutencoes: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        porTipo: stats,
        totalGeral: totalGeral[0]?.totalCusto || 0,
        totalManutencoes: totalGeral[0]?.totalManutencoes || 0
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar estatísticas' });
  }
});

// POST - Criar manutenção
router.post('/', async (req, res) => {
  try {
    console.log('\n🔧 [MANUTENÇÃO] Criando manutenção...');
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
    
    const manutencao = new Manutencao({
      ...dados,
      viaturaId,
      viaturaMatricula: viatura.matricula,
      empresaId,
      usuario: req.user?.nome || 'Sistema',
      dataManutencao: dados.dataManutencao || new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await manutencao.save();
    console.log(`✅ Manutenção salva: ${manutencao._id}`);
    
    // Atualizar km da viatura se informado
    if (dados.km && dados.km > viatura.km) {
      viatura.km = dados.km;
      await viatura.save();
      console.log(`✅ KM da viatura atualizado: ${viatura.km}`);
    }
    
    // INTEGRAÇÃO COM PAGAMENTOS
    console.log('🔔 Integrando com pagamentos...');
    
    const empresa = await Empresa.findById(empresaId);
    if (empresa && manutencao.custo > 0) {
      console.log(`🏢 Empresa: ${empresa.nome}`);
      console.log(`💰 Custo: ${manutencao.custo} Kz`);
      
      const pagamento = await integracaoPagamentos.integrarManutencao(manutencao, empresa, req.user?.nome || 'Sistema');
      
      if (pagamento) {
        console.log(`✅ Pagamento criado: ${pagamento.referencia}`);
      } else {
        console.log(`⚠️ Falha ao criar pagamento`);
      }
    }
    
    res.status(201).json(manutencao);
  } catch (error) {
    console.error('❌ Erro ao criar manutenção:', error);
    res.status(500).json({ mensagem: 'Erro ao criar manutenção', error: error.message });
  }
});

// PUT - Atualizar manutenção
router.put('/:id', async (req, res) => {
  try {
    const { empresaId, ...dados } = req.body;
    
    const manutencao = await Manutencao.findOne({ 
      _id: req.params.id, 
      empresaId 
    });
    
    if (!manutencao) {
      return res.status(404).json({ mensagem: 'Não encontrado' });
    }
    
    Object.assign(manutencao, dados);
    manutencao.updatedAt = new Date();
    
    await manutencao.save();
    
    res.json(manutencao);
  } catch (error) {
    console.error('Erro ao atualizar manutenção:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar manutenção' });
  }
});

// DELETE - Excluir manutenção
router.delete('/:id', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    const manutencao = await Manutencao.findOneAndDelete({ 
      _id: req.params.id, 
      empresaId 
    });
    
    if (!manutencao) {
      return res.status(404).json({ mensagem: 'Não encontrado' });
    }
    
    res.json({ mensagem: 'Manutenção excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir manutenção:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir manutenção' });
  }
});

module.exports = router;