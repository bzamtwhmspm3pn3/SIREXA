// backend/routes/licenca.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Licenca = require('../models/Licenca');
const Empresa = require('../models/Empresa');
const { verifyToken } = require('../middlewares/auth');
const { keyValidationLimiter } = require('../middlewares/security');

// VALIDAR CHAVE (para cadastro de gestor)
router.post('/validar', keyValidationLimiter, async (req, res) => {
  try {
    const { chave, nomeEmpresa, nifEmpresa } = req.body;
    
    if (!chave) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Chave de ativação é obrigatória' 
      });
    }
    
    const chaveNormalizada = chave.replace(/-/g, '').toUpperCase();
    const licenca = await Licenca.findOne({ chave: chaveNormalizada });
    
    if (!licenca) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Chave de ativação inválida.' 
      });
    }
    
    if (licenca.status !== 'ativa' && licenca.status !== 'trial') {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: `Licença ${licenca.status}. Contacte o suporte.` 
      });
    }
    
    if (licenca.dataExpiracao && new Date() > licenca.dataExpiracao) {
      licenca.status = 'expirada';
      await licenca.save();
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Licença expirada. Faça a renovação.' 
      });
    }
    
    if (licenca.empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Esta chave já foi utilizada.' 
      });
    }
    
    if (!nomeEmpresa || !nifEmpresa) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Dados da empresa são obrigatórios.' 
      });
    }
    
    const empresaExistente = await Empresa.findOne({ nif: nifEmpresa });
    if (empresaExistente) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Já existe uma empresa com este NIF.' 
      });
    }
    
    const empresa = new Empresa({
      nome: nomeEmpresa,
      nif: nifEmpresa,
      status: 'Ativa',
      licencaId: licenca._id,
      plano: licenca.plano
    });
    
    await empresa.save();
    
    licenca.empresaId = empresa._id;
    licenca.empresaNome = empresa.nome;
    licenca.ipAtivacao = req.ip;
    licenca.status = 'ativa';
    await licenca.save();
    
    res.json({
      sucesso: true,
      valida: true,
      plano: licenca.plano,
      modulos: licenca.modulos,
      limites: licenca.limites,
      empresaId: empresa._id,
      empresaNome: empresa.nome,
      dataExpiracao: licenca.dataExpiracao,
      mensagem: `✅ Chave válida! Plano: ${licenca.plano}`
    });
    
  } catch (error) {
    console.error('Erro ao validar chave:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao validar chave' 
    });
  }
});

// VERIFICAR STATUS DA LICENÇA
router.get('/status', verifyToken, async (req, res) => {
  try {
    const licenca = await Licenca.findOne({ empresaId: req.user.empresaId });
    
    if (!licenca) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Licença não encontrada' 
      });
    }
    
    res.json({
      sucesso: true,
      plano: licenca.plano,
      modulos: licenca.modulos,
      limites: licenca.limites,
      status: licenca.status,
      dataExpiracao: licenca.dataExpiracao,
      diasRestantes: licenca.diasRestantes()
    });
    
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ mensagem: 'Erro interno' });
  }
});

module.exports = router;