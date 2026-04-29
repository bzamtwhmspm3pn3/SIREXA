// backend/routes/bancos.js - Versão que aceita empresaId de várias fontes
const express = require('express');
const router = express.Router();
const Banco = require('../models/Banco');
const RegistoBancario = require('../models/RegistoBancario');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

async function calcularSaldoAtual(codNome, empresaId) {
  try {
    const entradas = await RegistoBancario.find({ empresaId, conta: codNome, entradaSaida: 'entrada' });
    const totalEntradas = entradas.reduce((sum, r) => sum + (r.valor || 0), 0);
    const saidas = await RegistoBancario.find({ empresaId, conta: codNome, entradaSaida: 'saida' });
    const totalSaidas = saidas.reduce((sum, r) => sum + (r.valor || 0), 0);
    const banco = await Banco.findOne({ codNome, empresaId });
    const saldoInicial = banco?.saldoInicial || 0;
    return saldoInicial + totalEntradas - totalSaidas;
  } catch (error) {
    console.error('Erro ao calcular saldo:', error);
    return 0;
  }
}

// Helper para obter empresaId - VERSÃO SIMPLIFICADA
function getEmpresaId(req) {
  // SEMPRE priorizar o ID enviado na query ou body
  const empresaId = req.query.empresaId || req.body.empresaId;
  
  console.log("🔍 getEmpresaId - ID recebido:", empresaId);
  console.log("🔍 Método:", req.method);
  
  if (!empresaId) {
    console.log("⚠️ Nenhum empresaId encontrado na requisição");
    return null;
  }
  
  return empresaId;
}


// GET - Listar bancos
router.get('/', async (req, res) => {
  try {
    const empresaId = req.query.empresaId;
    
    console.log("=== BUSCANDO BANCOS ===");
    console.log("EmpresaId da query:", empresaId);
    
    if (!empresaId) {
      return res.status(400).json({ 
        sucesso: false,
        mensagem: 'Empresa não identificada. Envie empresaId na URL.' 
      });
    }
    
    const bancos = await Banco.find({ empresaId, ativo: true }).sort({ nome: 1 });
    
    console.log(`📊 Encontrados ${bancos.length} bancos`);
    
    const bancosComSaldo = await Promise.all(bancos.map(async (banco) => {
      const saldoAtual = await calcularSaldoAtual(banco.codNome, empresaId);
      return {
        _id: banco._id,
        codNome: banco.codNome,
        nome: banco.nome,
        iban: banco.iban,
        swift: banco.swift,
        saldoInicial: banco.saldoInicial,
        saldoDisponivel: saldoAtual,
        moeda: banco.moeda,
        ativo: banco.ativo,
        empresaId: banco.empresaId
      };
    }));
    
    res.json(bancosComSaldo);
  } catch (error) {
    console.error('Erro ao buscar bancos:', error);
    res.status(500).json({ 
      sucesso: false,
      mensagem: 'Erro ao buscar bancos: ' + error.message 
    });
  }
});


// POST - Criar banco
router.post('/', async (req, res) => {
  try {
    // Usar o empresaId da query OU do body
    const empresaId = req.query.empresaId || req.body.empresaId;
    
    console.log("=== CRIANDO BANCO ===");
    console.log("EmpresaId da query:", req.query.empresaId);
    console.log("EmpresaId do body:", req.body.empresaId);
    console.log("EmpresaId final:", empresaId);
    console.log("Body recebido:", JSON.stringify(req.body, null, 2));
    
    if (!empresaId) {
      console.log("❌ EmpresaId não encontrado");
      return res.status(400).json({ 
        sucesso: false,
        mensagem: 'Empresa não identificada. Envie empresaId na URL ou no body.' 
      });
    }
    
    // Validar campos obrigatórios
    if (!req.body.codNome) {
      return res.status(400).json({ mensagem: 'Código da conta é obrigatório' });
    }
    
    if (!req.body.nome) {
      return res.status(400).json({ mensagem: 'Nome da conta é obrigatório' });
    }
    
    // Verificar duplicidade para esta empresa
    const existe = await Banco.findOne({ 
      codNome: req.body.codNome.toUpperCase(), 
      empresaId: empresaId 
    });
    
    if (existe) {
      console.log(`❌ Código "${req.body.codNome}" já existe para esta empresa`);
      return res.status(400).json({ 
        mensagem: `Código "${req.body.codNome}" já existe para esta empresa. Use um código diferente.` 
      });
    }
    
    const bancoData = {
      codNome: req.body.codNome.toUpperCase(),
      nome: req.body.nome,
      iban: req.body.iban || '',
      swift: req.body.swift ? req.body.swift.toUpperCase() : '',
      saldoInicial: req.body.saldoInicial || 0,
      moeda: req.body.moeda || 'AOA',
      empresaId: empresaId  // USAR O ID CORRETO
    };
    
    console.log("📝 Dados a salvar:", JSON.stringify(bancoData, null, 2));
    
    const banco = new Banco(bancoData);
    await banco.save();
    
    console.log(`✅ Banco criado com sucesso: ${banco.codNome} para empresa ${empresaId}`);
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Banco criado com sucesso',
      dados: banco
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar banco:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ mensagem: errors.join(', ') });
    }
    
    res.status(500).json({ 
      mensagem: 'Erro ao criar banco: ' + error.message 
    });
  }
});

// PUT - Atualizar banco
router.put('/:id', async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const banco = await Banco.findOneAndUpdate(
      { _id: req.params.id, empresaId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!banco) {
      return res.status(404).json({ mensagem: 'Banco não encontrado' });
    }
    
    const saldoAtual = await calcularSaldoAtual(banco.codNome, empresaId);
    
    res.json({
      ...banco.toObject(),
      saldoDisponivel: saldoAtual
    });
  } catch (error) {
    console.error('Erro ao atualizar banco:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar banco' });
  }
});

// DELETE - Desativar banco
router.delete('/:id', async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    
    console.log("=== DELETANDO BANCO ===");
    console.log("ID:", req.params.id);
    console.log("EmpresaId:", empresaId);
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const banco = await Banco.findOne({ _id: req.params.id, empresaId });
    
    if (!banco) {
      return res.status(404).json({ mensagem: 'Banco não encontrado para esta empresa' });
    }
    
    banco.ativo = false;
    banco.updatedAt = new Date();
    await banco.save();
    
    res.json({ sucesso: true, mensagem: 'Banco desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar banco:', error);
    res.status(500).json({ mensagem: 'Erro ao desativar banco: ' + error.message });
  }
});

module.exports = router;