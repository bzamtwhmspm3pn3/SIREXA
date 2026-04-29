// backend/routes/tecnico.js
const express = require('express');
const router = express.Router();
const Tecnico = require('../models/Tecnico');
const Funcionario = require('../models/Funcionario');
const Empresa = require('../models/Empresa');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middlewares/auth');

// ============================================
// ROTA DE LOGIN - PÚBLICA
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log("📝 Login técnico - Email:", email);
    
    if (!email || !senha) {
      return res.status(400).json({ mensagem: "Email e senha são obrigatórios" });
    }
    
    const tecnico = await Tecnico.findOne({ email });
    if (!tecnico) {
      console.log("❌ Técnico não encontrado:", email);
      return res.status(401).json({ mensagem: "Email ou senha inválidos" });
    }
    
    const senhaValida = await bcrypt.compare(senha, tecnico.senha);
    if (!senhaValida) {
      console.log("❌ Senha inválida para:", email);
      return res.status(401).json({ mensagem: "Email ou senha inválidos" });
    }
    
    // 🔥 CORREÇÃO: Adicionar empresasPermitidas
    const empresasPermitidas = tecnico.empresaId ? [tecnico.empresaId.toString()] : [];
    
    console.log("🏢 Técnico - Empresa ID:", tecnico.empresaId);
    console.log("🏢 Empresas permitidas:", empresasPermitidas);
    
    const token = jwt.sign(
      { 
        id: tecnico._id, 
        email: tecnico.email,
        nome: tecnico.nome,
        role: 'tecnico',
        empresaId: tecnico.empresaId,
        empresaNome: tecnico.empresaNome,
        modulos: tecnico.modulos,
        empresasPermitidas: empresasPermitidas
      },
      process.env.JWT_SECRET || 'segredo-super-seguro',
      { expiresIn: '7d' }
    );
    
    console.log("✅ Login bem-sucedido:", email);
    
    res.json({
      mensagem: 'Login efectuado com sucesso!',
      token,
      usuario: {
        id: tecnico._id,
        nome: tecnico.nome,
        email: tecnico.email,
        telefone: tecnico.telefone,
        funcao: tecnico.funcao,
        empresaId: tecnico.empresaId,
        empresaNome: tecnico.empresaNome,
        modulos: tecnico.modulos,
        role: 'tecnico',
        empresasPermitidas: empresasPermitidas
      }
    });
  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({ mensagem: "Erro ao fazer login" });
  }
});

// ============================================
// ROTA DE TESTE - PÚBLICA
// ============================================
router.get('/teste', (req, res) => {
  res.json({ mensagem: "Rota de técnico funcionando!" });
});

// ============================================
// ROTAS PROTEGIDAS
// ============================================

// GET - Listar todos os técnicos
router.get('/', verifyToken, async (req, res) => {
  try {
    const tecnicos = await Tecnico.find().select('-senha').sort({ nome: 1 });
    res.json(tecnicos);
  } catch (error) {
    console.error('Erro ao buscar técnicos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar técnicos' });
  }
});

// GET - Buscar técnico por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const tecnico = await Tecnico.findById(req.params.id).select('-senha');
    if (!tecnico) {
      return res.status(404).json({ mensagem: 'Técnico não encontrado' });
    }
    res.json(tecnico);
  } catch (error) {
    console.error('Erro ao buscar técnico:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar técnico' });
  }
});

// POST - Criar técnico (a partir de funcionário)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { funcionarioId, empresaId, senha, modulos } = req.body;
    
    if (!funcionarioId) {
      return res.status(400).json({ mensagem: 'Funcionário é obrigatório' });
    }
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa é obrigatória' });
    }
    if (!senha) {
      return res.status(400).json({ mensagem: 'Senha é obrigatória' });
    }
    
    const funcionario = await Funcionario.findById(funcionarioId);
    if (!funcionario) {
      return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
    }
    
    if (funcionario.isTecnico) {
      return res.status(400).json({ mensagem: 'Funcionário já é um técnico' });
    }
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    }
    
    const tecnicoExistente = await Tecnico.findOne({ email: funcionario.email });
    if (tecnicoExistente) {
      return res.status(400).json({ mensagem: 'Já existe um técnico com este email' });
    }
    
    // Módulos padrão se não for fornecido
    const modulosPadrao = {
      vendas: false,
      stock: false,
      facturacao: false,
      funcionarios: false,
      folhaSalarial: false,
      gestaoFaltas: false,
      gestaoAbonos: false,
      avaliacao: false,
      viaturas: false,
      abastecimentos: false,
      manutencoes: false,
      inventario: false,
      fornecedores: false,
      fluxoCaixa: false,
      contaCorrente: false,
      controloPagamento: false,
      custosReceitas: false,
      orcamentos: false,
      dre: false,
      indicadores: false,
      transferencias: false,
      reconciliacao: false,
      relatorios: false,
      graficos: false,
      analise: false
    };
    
    const tecnico = new Tecnico({
      nome: funcionario.nome,
      email: funcionario.email,
      senha: senha,
      telefone: funcionario.telefone || '',
      funcao: funcionario.funcao || funcionario.cargo || 'Técnico',
      empresaId: empresa._id,
      empresaNome: empresa.nome,
      modulos: { ...modulosPadrao, ...modulos },
      funcionarioId: funcionario._id
    });
    
    await tecnico.save();
    
    funcionario.isTecnico = true;
    funcionario.usuarioId = tecnico._id;
    await funcionario.save();
    
    const tecnicoResponse = tecnico.toObject();
    delete tecnicoResponse.senha;
    
    res.status(201).json({
      mensagem: 'Técnico criado com sucesso!',
      tecnico: tecnicoResponse
    });
  } catch (error) {
    console.error('Erro ao criar técnico:', error);
    res.status(500).json({ mensagem: 'Erro ao criar técnico', error: error.message });
  }
});

// PUT - Atualizar técnico
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { nome, email, senha, telefone, funcao, empresaId, modulos } = req.body;
    
    const tecnico = await Tecnico.findById(req.params.id);
    if (!tecnico) {
      return res.status(404).json({ mensagem: 'Técnico não encontrado' });
    }
    
    tecnico.nome = nome || tecnico.nome;
    tecnico.email = email || tecnico.email;
    tecnico.telefone = telefone || tecnico.telefone;
    tecnico.funcao = funcao || tecnico.funcao;
    
    if (senha && senha.trim() !== '') {
      tecnico.senha = senha;
    }
    
    if (empresaId) {
      const empresa = await Empresa.findById(empresaId);
      if (empresa) {
        tecnico.empresaId = empresaId;
        tecnico.empresaNome = empresa.nome;
      }
    }
    
    if (modulos) {
      tecnico.modulos = modulos;
    }
    
    await tecnico.save();
    
    if (tecnico.funcionarioId) {
      await Funcionario.findByIdAndUpdate(tecnico.funcionarioId, {
        nome: tecnico.nome,
        email: tecnico.email,
        telefone: tecnico.telefone,
        funcao: tecnico.funcao
      });
    }
    
    const tecnicoResponse = tecnico.toObject();
    delete tecnicoResponse.senha;
    
    res.json({
      mensagem: 'Técnico atualizado com sucesso!',
      tecnico: tecnicoResponse
    });
  } catch (error) {
    console.error('Erro ao atualizar técnico:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar técnico' });
  }
});

// DELETE - Excluir técnico
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const tecnico = await Tecnico.findById(req.params.id);
    if (!tecnico) {
      return res.status(404).json({ mensagem: 'Técnico não encontrado' });
    }
    
    if (tecnico.funcionarioId) {
      await Funcionario.findByIdAndUpdate(tecnico.funcionarioId, {
        isTecnico: false,
        usuarioId: null
      });
    }
    
    await Tecnico.findByIdAndDelete(req.params.id);
    
    res.json({ mensagem: 'Técnico excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir técnico:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir técnico' });
  }
});

// POST - Promover funcionário a técnico (versão corrigida)
router.post('/promover/:funcionarioId', verifyToken, async (req, res) => {
  try {
    const { funcionarioId } = req.params;
    const { empresaId, senha, modulos } = req.body;
    
    console.log("📝 Promovendo funcionário:", funcionarioId);
    
    const funcionario = await Funcionario.findById(funcionarioId);
    if (!funcionario) {
      return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
    }
    
    if (funcionario.isTecnico) {
      return res.status(400).json({ mensagem: 'Funcionário já é um técnico' });
    }
    
    const empresa = await Empresa.findById(empresaId || funcionario.empresaId);
    if (!empresa) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    }
    
    // Módulos padrão
    const modulosPadrao = {
      vendas: false,
      stock: false,
      facturacao: false,
      funcionarios: false,
      folhaSalarial: false,
      gestaoFaltas: false,
      gestaoAbonos: false,
      avaliacao: false,
      viaturas: false,
      abastecimentos: false,
      manutencoes: false,
      inventario: false,
      fornecedores: false,
      fluxoCaixa: false,
      contaCorrente: false,
      controloPagamento: false,
      custosReceitas: false,
      orcamentos: false,
      dre: false,
      indicadores: false,
      transferencias: false,
      reconciliacao: false,
      relatorios: false,
      graficos: false,
      analise: false
    };
    
    const tecnico = new Tecnico({
      nome: funcionario.nome,
      email: funcionario.email,
      senha: senha,
      telefone: funcionario.telefone || '',
      funcao: funcionario.funcao || funcionario.cargo || 'Técnico',
      empresaId: empresa._id,
      empresaNome: empresa.nome,
      modulos: { ...modulosPadrao, ...modulos },
      funcionarioId: funcionario._id
    });
    
    await tecnico.save();
    
    funcionario.isTecnico = true;
    funcionario.usuarioId = tecnico._id;
    await funcionario.save();
    
    const tecnicoResponse = tecnico.toObject();
    delete tecnicoResponse.senha;
    
    console.log("✅ Funcionário promovido com sucesso!");
    
    res.status(201).json({
      mensagem: 'Funcionário promovido a técnico com sucesso!',
      tecnico: tecnicoResponse
    });
  } catch (error) {
    console.error('Erro ao promover funcionário:', error);
    res.status(500).json({ mensagem: 'Erro ao promover funcionário', error: error.message });
  }
});

// ============================================
// ROTAS ADICIONAIS PARA GESTÃO DE TÉCNICOS
// ============================================

// POST - Ativar técnico (promover funcionário a técnico)
router.post('/ativar/:funcionarioId', verifyToken, async (req, res) => {
  try {
    const { funcionarioId } = req.params;
    const { senha, modulos, empresaId } = req.body;
    
    console.log("📝 Ativando técnico - Funcionário ID:", funcionarioId);
    
    if (!funcionarioId) {
      return res.status(400).json({ mensagem: 'ID do funcionário é obrigatório' });
    }
    
    if (!senha) {
      return res.status(400).json({ mensagem: 'Senha é obrigatória' });
    }
    
    const funcionario = await Funcionario.findById(funcionarioId);
    if (!funcionario) {
      return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
    }
    
    if (funcionario.isTecnico) {
      return res.status(400).json({ mensagem: 'Funcionário já é um técnico' });
    }
    
    let empresaIdFinal = empresaId || funcionario.empresaId;
    if (!empresaIdFinal && req.user?.empresaId) {
      empresaIdFinal = req.user.empresaId;
    }
    
    const empresa = await Empresa.findById(empresaIdFinal);
    if (!empresa) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    }
    
    const tecnicoExistente = await Tecnico.findOne({ email: funcionario.email });
    if (tecnicoExistente) {
      return res.status(400).json({ mensagem: 'Já existe um técnico com este email' });
    }
    
    const modulosPadrao = {
      vendas: false, stock: false, facturacao: false,
      funcionarios: false, folhaSalarial: false, gestaoFaltas: false, gestaoAbonos: false, avaliacao: false,
      viaturas: false, abastecimentos: false, manutencoes: false, inventario: false,
      fornecedores: false, fluxoCaixa: false, contaCorrente: false, controloPagamento: false,
      custosReceitas: false, orcamentos: false, dre: false, indicadores: false,
      transferencias: false, reconciliacao: false,
      relatorios: false, graficos: false, analise: false
    };
    
    const tecnico = new Tecnico({
      nome: funcionario.nome,
      email: funcionario.email,
      senha: senha,
      telefone: funcionario.telefone || '',
      funcao: funcionario.funcao || funcionario.cargo || 'Técnico',
      empresaId: empresa._id,
      empresaNome: empresa.nome,
      modulos: { ...modulosPadrao, ...modulos },
      funcionarioId: funcionario._id
    });
    
    await tecnico.save();
    
    funcionario.isTecnico = true;
    funcionario.usuarioId = tecnico._id;
    await funcionario.save();
    
    const tecnicoResponse = tecnico.toObject();
    delete tecnicoResponse.senha;
    
    console.log("✅ Técnico ativado com sucesso:", tecnico._id);
    
    res.status(201).json({
      sucesso: true,
      mensagem: `Técnico ${funcionario.nome} ativado com sucesso!`,
      tecnico: tecnicoResponse
    });
    
  } catch (error) {
    console.error('❌ Erro ao ativar técnico:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao ativar técnico',
      erro: error.message 
    });
  }
});

// POST - Despromover técnico (remover acesso)
router.post('/despromover/:tecnicoId', verifyToken, async (req, res) => {
  try {
    const { tecnicoId } = req.params;
    
    console.log("📝 Despromovendo técnico - ID:", tecnicoId);
    
    const tecnico = await Tecnico.findById(tecnicoId);
    if (!tecnico) {
      return res.status(404).json({ mensagem: 'Técnico não encontrado' });
    }
    
    if (tecnico.funcionarioId) {
      await Funcionario.findByIdAndUpdate(tecnico.funcionarioId, {
        isTecnico: false,
        usuarioId: null
      });
    }
    
    await Tecnico.findByIdAndDelete(tecnicoId);
    
    console.log("✅ Técnico despromovido com sucesso");
    
    res.json({
      sucesso: true,
      mensagem: `Técnico ${tecnico.nome} foi despromovido com sucesso!`
    });
    
  } catch (error) {
    console.error('❌ Erro ao despromover técnico:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao despromover técnico',
      erro: error.message 
    });
  }
});

// GET - Buscar técnico por funcionário ID
router.get('/funcionario/:funcionarioId', verifyToken, async (req, res) => {
  try {
    const { funcionarioId } = req.params;
    
    const tecnico = await Tecnico.findOne({ funcionarioId }).select('-senha');
    if (!tecnico) {
      return res.status(404).json({ mensagem: 'Técnico não encontrado para este funcionário' });
    }
    
    res.json({
      sucesso: true,
      dados: tecnico
    });
  } catch (error) {
    console.error('Erro ao buscar técnico por funcionário:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar técnico',
      erro: error.message 
    });
  }
});

// GET - Listar técnicos por empresa
router.get('/empresa/:empresaId', verifyToken, async (req, res) => {
  try {
    const { empresaId } = req.params;
    
    const tecnicos = await Tecnico.find({ empresaId }).select('-senha').sort({ nome: 1 });
    
    res.json(tecnicos);
  } catch (error) {
    console.error('Erro ao buscar técnicos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar técnicos' });
  }
});

// GET - Listar candidatos a técnico (funcionários que não são técnicos)
router.get('/candidatos/empresa/:empresaId', verifyToken, async (req, res) => {
  try {
    const { empresaId } = req.params;
    
    const candidatos = await Funcionario.find({ 
      empresaId, 
      isTecnico: { $ne: true }
    }).select('nome email telefone funcao cargo');
    
    res.json(candidatos);
  } catch (error) {
    console.error('Erro ao buscar candidatos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar candidatos' });
  }
});

module.exports = router;