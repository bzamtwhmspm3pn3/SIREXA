// backend/routes/viaturas.js - CORRIGIDO
const express = require('express');
const router = express.Router();
const Viatura = require('../models/Viatura');
const { verifyToken } = require('../middlewares/auth');

// Todas as rotas exigem autenticação
router.use(verifyToken);

// GET - Listar viaturas por empresa
router.get('/', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'ID da empresa é obrigatório' });
    }
    
    const viaturas = await Viatura.find({ empresaId, ativo: true }).sort({ matricula: 1 });
    res.json(viaturas);
  } catch (error) {
    console.error('Erro ao buscar viaturas:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar viaturas' });
  }
});

// GET - Buscar viatura por ID
router.get('/:id', async (req, res) => {
  try {
    const { empresaId } = req.query;
    const viatura = await Viatura.findOne({ _id: req.params.id, empresaId, ativo: true });
    
    if (!viatura) {
      return res.status(404).json({ mensagem: 'Viatura não encontrada' });
    }
    
    res.json(viatura);
  } catch (error) {
    console.error('Erro ao buscar viatura:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar viatura' });
  }
});

// POST - Criar viatura
router.post('/', async (req, res) => {
  try {
    console.log("=== CRIANDO VIATURA ===");
    console.log("Body recebido:", JSON.stringify(req.body, null, 2));
    
    const { 
      empresaId, 
      matricula, 
      marca, 
      modelo, 
      ano,
      cor,
      motorista,
      km,
      estado,
      aquisicao,
      valorAquisicao,
      vidaUtil,
      combustivel,
      consumoMedio,
      ultimaRevisao,
      proximaRevisao
    } = req.body;
    
    // VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS
    if (!empresaId) {
      console.log("❌ empresaId não fornecido");
      return res.status(400).json({ mensagem: 'ID da empresa é obrigatório' });
    }
    
    if (!matricula) {
      console.log("❌ matrícula não fornecida");
      return res.status(400).json({ mensagem: 'Matrícula é obrigatória' });
    }
    
    if (!marca) {
      console.log("❌ marca não fornecida");
      return res.status(400).json({ mensagem: 'Marca é obrigatória' });
    }
    
    if (!modelo) {
      console.log("❌ modelo não fornecido");
      return res.status(400).json({ mensagem: 'Modelo é obrigatório' });
    }
    
    if (!ano) {
      console.log("❌ ano não fornecido");
      return res.status(400).json({ mensagem: 'Ano é obrigatório' });
    }
    
    // Verificar se já existe viatura com mesma matrícula para esta empresa
    const existe = await Viatura.findOne({ empresaId, matricula, ativo: true });
    if (existe) {
      console.log(`❌ Matrícula ${matricula} já existe para esta empresa`);
      return res.status(400).json({ mensagem: 'Já existe uma viatura com esta matrícula para esta empresa' });
    }
    
    // Preparar dados para salvar
    const viaturaData = {
      empresaId,
      matricula: matricula.toUpperCase(),
      marca,
      modelo,
      ano: parseInt(ano),
      cor: cor || "",
      motorista: motorista || "",
      km: km || 0,
      estado: estado || "Em uso",
      aquisicao: aquisicao || "",
      valorAquisicao: valorAquisicao || 0,
      vidaUtil: vidaUtil || "",
      combustivel: combustivel || "",
      consumoMedio: consumoMedio || null,
      ultimaRevisao: ultimaRevisao ? new Date(ultimaRevisao) : null,
      proximaRevisao: proximaRevisao ? new Date(proximaRevisao) : null,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log("📝 Dados a salvar:", JSON.stringify(viaturaData, null, 2));
    
    const viatura = new Viatura(viaturaData);
    await viatura.save();
    
    console.log(`✅ Viatura criada com sucesso: ${matricula}`);
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Viatura criada com sucesso',
      dados: viatura
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar viatura:', error);
    
    // Verificar erro de validação do mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ mensagem: errors.join(', ') });
    }
    
    res.status(500).json({ 
      mensagem: 'Erro ao criar viatura: ' + error.message 
    });
  }
});

// PUT - Atualizar viatura
router.put('/:id', async (req, res) => {
  try {
    console.log("=== ATUALIZANDO VIATURA ===");
    console.log("ID:", req.params.id);
    console.log("Body recebido:", JSON.stringify(req.body, null, 2));
    
    const { empresaId, matricula } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'ID da empresa é obrigatório' });
    }
    
    // Verificar duplicata de matrícula (exceto a própria)
    const existe = await Viatura.findOne({ 
      empresaId, 
      matricula, 
      _id: { $ne: req.params.id },
      ativo: true
    });
    
    if (existe) {
      console.log(`❌ Matrícula ${matricula} já existe para outra viatura`);
      return res.status(400).json({ mensagem: 'Já existe outra viatura com esta matrícula para esta empresa' });
    }
    
    // Preparar dados para atualizar
    const viaturaData = {
      ...req.body,
      matricula: req.body.matricula?.toUpperCase(),
      ano: req.body.ano ? parseInt(req.body.ano) : undefined,
      km: req.body.km || 0,
      valorAquisicao: req.body.valorAquisicao || 0,
      ultimaRevisao: req.body.ultimaRevisao ? new Date(req.body.ultimaRevisao) : null,
      proximaRevisao: req.body.proximaRevisao ? new Date(req.body.proximaRevisao) : null,
      updatedAt: new Date()
    };
    
    const viatura = await Viatura.findOneAndUpdate(
      { _id: req.params.id, empresaId },
      viaturaData,
      { new: true, runValidators: true }
    );
    
    if (!viatura) {
      return res.status(404).json({ mensagem: 'Viatura não encontrada' });
    }
    
    console.log(`✅ Viatura atualizada: ${viatura.matricula}`);
    
    res.json({
      sucesso: true,
      mensagem: 'Viatura atualizada com sucesso',
      dados: viatura
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar viatura:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar viatura: ' + error.message });
  }
});

// DELETE - Excluir viatura (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    console.log("=== EXCLUINDO VIATURA ===");
    console.log("ID:", req.params.id);
    console.log("EmpresaId:", empresaId);
    
    const viatura = await Viatura.findOneAndUpdate(
      { _id: req.params.id, empresaId },
      { ativo: false, updatedAt: new Date() },
      { new: true }
    );
    
    if (!viatura) {
      return res.status(404).json({ mensagem: 'Viatura não encontrada' });
    }
    
    console.log(`✅ Viatura excluída: ${viatura.matricula}`);
    
    res.json({ 
      sucesso: true,
      mensagem: 'Viatura excluída com sucesso' 
    });
    
  } catch (error) {
    console.error('❌ Erro ao excluir viatura:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir viatura: ' + error.message });
  }
});

module.exports = router;