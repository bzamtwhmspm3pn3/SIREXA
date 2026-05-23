// backend/routes/logs.js
const express = require('express');
const router = express.Router();
const LogAtividade = require('../models/LogAtividade');
const { verifyToken } = require('../middlewares/auth');

// Proteger todas as rotas
router.use(verifyToken);

// Listar logs com filtros
router.get('/', async (req, res) => {
  try {
    const { 
      empresaId, 
      usuarioId, 
      modulo, 
      acao, 
      dataInicio, 
      dataFim,
      pagina = 1,
      limite = 50
    } = req.query;
    
    const filtro = {};
    
    if (empresaId) filtro.empresaId = empresaId;
    if (usuarioId) filtro.usuarioId = usuarioId;
    if (modulo) filtro.modulo = modulo;
    if (acao) filtro.acao = acao;
    
    if (dataInicio || dataFim) {
      filtro.createdAt = {};
      if (dataInicio) filtro.createdAt.$gte = new Date(dataInicio);
      if (dataFim) filtro.createdAt.$lte = new Date(dataFim);
    }
    
    // Se for técnico, só vê logs da sua empresa
    if (req.user?.role === 'tecnico') {
      filtro.empresaId = req.user.empresaId;
    }
    
    const skip = (parseInt(pagina) - 1) * parseInt(limite);
    
    const [logs, total] = await Promise.all([
      LogAtividade.find(filtro)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limite)),
      LogAtividade.countDocuments(filtro)
    ]);
    
    res.json({
      sucesso: true,
      dados: logs,
      paginacao: {
        total,
        pagina: parseInt(pagina),
        totalPaginas: Math.ceil(total / parseInt(limite)),
        limite: parseInt(limite)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Estatísticas de logs
router.get('/estatisticas', async (req, res) => {
  try {
    const { empresaId, dias = 30 } = req.query;
    
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - parseInt(dias));
    
    const filtro = { createdAt: { $gte: dataLimite } };
    if (empresaId) filtro.empresaId = empresaId;
    if (req.user?.role === 'tecnico') filtro.empresaId = req.user.empresaId;
    
    const estatisticas = await LogAtividade.aggregate([
      { $match: filtro },
      { $group: {
        _id: { modulo: '$modulo', acao: '$acao' },
        total: { $sum: 1 }
      }},
      { $sort: { total: -1 } }
    ]);
    
    const porUsuario = await LogAtividade.aggregate([
      { $match: filtro },
      { $group: {
        _id: { usuarioId: '$usuarioId', usuarioNome: '$usuarioNome', usuarioTipo: '$usuarioTipo' },
        total: { $sum: 1 }
      }},
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        estatisticas,
        porUsuario,
        total: await LogAtividade.countDocuments(filtro)
      }
    });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Limpar logs antigos (apenas admin)
router.delete('/limpar', async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'gestor') {
      return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado' });
    }
    
    const { dias = 90 } = req.body;
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - parseInt(dias));
    
    const result = await LogAtividade.deleteMany({ createdAt: { $lt: dataLimite } });
    
    res.json({
      sucesso: true,
      mensagem: `${result.deletedCount} logs removidos (anteriores a ${dias} dias)`
    });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

module.exports = router;