// backend/routes/configuracaoBanco.js
const express = require('express');
const router = express.Router();
const ConfiguracaoBanco = require('../models/ConfiguracaoBanco');
const { verifyToken } = require('../middlewares/auth');
const { validateEmpresaAccess } = require('../middlewares/security');

// 🔒 TODAS AS ROTAS REQUEREM AUTENTICAÇÃO
router.use(verifyToken);

// ============================================
// GET - Listar configurações bancárias da empresa
// ============================================
router.get('/listar', validateEmpresaAccess, async (req, res) => {
  try {
    const empresaId = req.empresaAtual;
    
    console.log(`📋 Buscando configuração bancária para empresa: ${empresaId}`);
    
    let configuracao = await ConfiguracaoBanco.findOne({ empresaId });
    
    if (!configuracao) {
      // Retorna uma configuração padrão vazia, não erro
      return res.json({
        sucesso: true,
        dados: {
          empresaId,
          banco: '',
          numeroConta: '',
          iban: '',
          swift: '',
          titular: '',
          nif: '',
          endereco: '',
          telefone: '',
          email: '',
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    res.json({
      sucesso: true,
      dados: configuracao
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar configuração bancária:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar configuração bancária',
      erro: error.message 
    });
  }
});

// ============================================
// POST - Salvar configuração bancária
// ============================================
router.post('/salvar', validateEmpresaAccess, async (req, res) => {
  try {
    const empresaId = req.empresaAtual;
    
    const {
      banco,
      numeroConta,
      iban,
      swift,
      titular,
      nif,
      endereco,
      telefone,
      email,
      ativo
    } = req.body;
    
    console.log(`💾 Salvando configuração bancária para empresa: ${empresaId}`);
    
    // Buscar configuração existente
    let configuracao = await ConfiguracaoBanco.findOne({ empresaId });
    
    if (configuracao) {
      // Atualizar existente
      configuracao.banco = banco || configuracao.banco;
      configuracao.numeroConta = numeroConta || configuracao.numeroConta;
      configuracao.iban = iban || configuracao.iban;
      configuracao.swift = swift || configuracao.swift;
      configuracao.titular = titular || configuracao.titular;
      configuracao.nif = nif || configuracao.nif;
      configuracao.endereco = endereco || configuracao.endereco;
      configuracao.telefone = telefone || configuracao.telefone;
      configuracao.email = email || configuracao.email;
      configuracao.ativo = ativo !== undefined ? ativo : configuracao.ativo;
      configuracao.updatedAt = new Date();
      
      await configuracao.save();
      console.log(`✅ Configuração bancária atualizada com sucesso`);
    } else {
      // Criar nova
      configuracao = new ConfiguracaoBanco({
        empresaId,
        banco: banco || '',
        numeroConta: numeroConta || '',
        iban: iban || '',
        swift: swift || '',
        titular: titular || '',
        nif: nif || '',
        endereco: endereco || '',
        telefone: telefone || '',
        email: email || '',
        ativo: ativo !== undefined ? ativo : true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await configuracao.save();
      console.log(`✅ Configuração bancária criada com sucesso`);
    }
    
    res.json({
      sucesso: true,
      mensagem: 'Configuração bancária salva com sucesso',
      dados: configuracao
    });
    
  } catch (error) {
    console.error('❌ Erro ao salvar configuração bancária:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao salvar configuração bancária',
      erro: error.message 
    });
  }
});

// ============================================
// DELETE - Excluir configuração bancária
// ============================================
router.delete('/excluir', validateEmpresaAccess, async (req, res) => {
  try {
    const empresaId = req.empresaAtual;
    
    console.log(`🗑️ Excluindo configuração bancária para empresa: ${empresaId}`);
    
    const configuracao = await ConfiguracaoBanco.findOneAndDelete({ empresaId });
    
    if (!configuracao) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Configuração bancária não encontrada' 
      });
    }
    
    res.json({
      sucesso: true,
      mensagem: 'Configuração bancária excluída com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao excluir configuração bancária:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao excluir configuração bancária',
      erro: error.message 
    });
  }
});

module.exports = router;