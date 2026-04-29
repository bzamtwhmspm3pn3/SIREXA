// backend/routes/empresa.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Empresa = require('../models/Empresa');
const Gestor = require('../models/Gestor');
const { verifyToken } = require('../middlewares/auth');

// Garantir que a pasta uploads existe
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
});

// ============================================
// ROTA PÚBLICA PARA TÉCNICOS - Buscar empresa por ID (sem validação de gestor)
// ============================================
router.get('/public/:id', verifyToken, async (req, res) => {
  try {
    console.log('🔍 Buscando empresa pública ID:', req.params.id);
    
    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    console.log('✅ Empresa encontrada (pública):', empresa.nome);
    res.json({ 
      sucesso: true, 
      dados: empresa 
    });
  } catch (error) {
    console.error('❌ Erro ao buscar empresa pública:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar empresa', 
      erro: error.message 
    });
  }
});

// ============================================
// ROTA PARA TÉCNICO - Buscar sua empresa designada
// ============================================
router.get('/tecnico/empresa', verifyToken, async (req, res) => {
  try {
    console.log("🔍 Técnico buscando sua empresa:", req.user.empresaId);
    
    // Verificar se é técnico
    if (req.user.role !== 'tecnico') {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado. Apenas técnicos podem usar esta rota.' 
      });
    }
    
    const empresaId = req.user.empresaId;
    if (!empresaId) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Técnico não tem empresa designada' 
      });
    }
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    console.log("✅ Empresa do técnico encontrada:", empresa.nome);
    res.json({ 
      sucesso: true, 
      dados: empresa 
    });
  } catch (error) {
    console.error('❌ Erro ao buscar empresa do técnico:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar empresa', 
      erro: error.message 
    });
  }
});

// Aplicar middleware de autenticação em todas as rotas
router.use(verifyToken);

// ============================================
// GET - Listar empresas do gestor logado
// ============================================
router.get('/', async (req, res) => {
  try {
    console.log('📋 Listando empresas para gestor:', req.user.id);
    
    const gestor = await Gestor.findById(req.user.id).populate('empresas');
    if (!gestor) {
      return res.status(404).json({ mensagem: 'Gestor não encontrado' });
    }
    
    console.log(`✅ Gestor: ${gestor.nome}, Empresas: ${gestor.empresas?.length || 0}`);
    res.json(gestor.empresas || []);
  } catch (error) {
    console.error('❌ Erro ao listar empresas:', error);
    res.status(500).json({ mensagem: 'Erro ao listar empresas' });
  }
});

// ============================================
// GET - Buscar empresa por ID (apenas gestor com acesso)
// ============================================
router.get('/:id', async (req, res) => {
  try {
    console.log('🔍 Buscando empresa ID:', req.params.id);
    console.log('👤 Gestor ID:', req.user.id);
    
    const gestor = await Gestor.findById(req.user.id);
    if (!gestor) {
      return res.status(404).json({ mensagem: 'Gestor não encontrado' });
    }
    
    // Verificar se o gestor tem acesso a esta empresa
    const temAcesso = gestor.empresas && gestor.empresas.some(id => id.toString() === req.params.id);
    if (!temAcesso) {
      console.log('❌ Acesso negado: empresa não pertence ao gestor');
      return res.status(403).json({ mensagem: 'Acesso negado a esta empresa' });
    }
    
    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    }
    
    console.log('✅ Empresa encontrada:', empresa.nome);
    res.json(empresa);
  } catch (error) {
    console.error('❌ Erro ao buscar empresa:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar empresa' });
  }
});

// ============================================
// POST - Criar empresa e associar ao gestor (COM NOVO TOKEN)
// ============================================
// ============================================
// POST - Criar empresa e associar ao gestor (COM CONFIGURAÇÕES INSS)
// ============================================
router.post('/', upload.single('logotipo'), async (req, res) => {
  try {
    console.log('=== INICIANDO CADASTRO DE EMPRESA ===');
    console.log('👤 Gestor ID:', req.user.id);
    
    const gestor = await Gestor.findById(req.user.id);
    if (!gestor) {
      return res.status(404).json({ mensagem: 'Gestor não encontrado' });
    }
    
    const dados = JSON.parse(req.body.dados || '{}');
    const { 
      nome, nif, nomeComercial, regimeIva,
      endereco, contactos,
      objetoSocial, dataConstituicao, capitalSocial, servicos,
      banco, iban, swift,
      caed, regimeTributario,
      // 🔥 NOVOS CAMPOS 🔥
      isBaixosRendimentos,
      regimeINSS,
      inssColaboradorTaxa,
      inssEmpregadorTaxa,
      limiteBaixosRendimentos,
      irtTipoCalculo,
      irtTaxaFixa,
      taxaIVA,
      incluiIVA,
      incluiRetencao,
      taxaRetencao
    } = dados;
    
    if (!nome || !nome.trim()) {
      return res.status(400).json({ mensagem: 'Nome da empresa é obrigatório' });
    }
    
    if (!nif || !nif.trim()) {
      return res.status(400).json({ mensagem: 'NIF é obrigatório' });
    }
    
    const empresaExistente = await Empresa.findOne({ nif });
    if (empresaExistente) {
      return res.status(400).json({ mensagem: 'Já existe uma empresa com este NIF' });
    }
    
    // 🔥 CONFIGURAR TAXAS INSS 🔥
    let inssColaborador = inssColaboradorTaxa;
    let inssEmpregador = inssEmpregadorTaxa;
    let isBaixos = false;
    
    if (isBaixosRendimentos || regimeINSS === 'baixos_rendimentos') {
      isBaixos = true;
      inssColaborador = inssColaboradorTaxa || 0.015;  // 1.5%
      inssEmpregador = inssEmpregadorTaxa || 0.04;     // 4%
    } else {
      inssColaborador = inssColaboradorTaxa || 0.03;   // 3%
      inssEmpregador = inssEmpregadorTaxa || 0.08;     // 8%
    }
    
    const empresaData = {
      nome: nome.trim(),
      nomeComercial: nomeComercial || '',
      nif: nif.trim(),
      regimeIva: regimeIva || 'Normal',
      endereco: endereco || {},
      contactos: contactos || {},
      objetoSocial: objetoSocial || '',
      dataConstituicao: dataConstituicao || null,
      capitalSocial: capitalSocial || 0,
      numeroFuncionarios: 0,
      servicos: servicos || [],
      banco: banco || '',
      iban: iban || '',
      swift: swift || '',
      caed: caed || '',
      regimeTributario: regimeTributario || '',
      logotipo: req.file ? req.file.filename : null,
      ativo: true,
      // 🔥 CAMPOS INSS 🔥
      isBaixosRendimentos: isBaixos,
      regimeINSS: isBaixos ? 'baixos_rendimentos' : 'normal',
      inssColaboradorTaxa: inssColaborador,
      inssEmpregadorTaxa: inssEmpregador,
      limiteBaixosRendimentos: limiteBaixosRendimentos || 350000,
      // 🔥 CAMPOS IRT 🔥
      irtTipoCalculo: irtTipoCalculo || 'progressivo',
      irtTaxaFixa: irtTaxaFixa || 0.065,
      // 🔥 CAMPOS IVA 🔥
      taxaIVA: taxaIVA || 14,
      incluiIVA: incluiIVA !== undefined ? incluiIVA : true,
      incluiRetencao: incluiRetencao || false,
      taxaRetencao: taxaRetencao || 7,
      gestorId: gestor._id,
      gestorNome: gestor.nome
    };
    
    const empresa = new Empresa(empresaData);
    await empresa.save();
    
    console.log(`✅ Empresa criada: ${empresa.nome}`);
    console.log(`   Regime INSS: ${empresa.descricaoRegimeINSS}`);
    console.log(`   Colaborador: ${empresa.inssColaboradorTaxa * 100}%`);
    console.log(`   Empregador: ${empresa.inssEmpregadorTaxa * 100}%`);
    
    // ASSOCIAR EMPRESA AO GESTOR
    await Gestor.findByIdAndUpdate(
      req.user.id,
      { $push: { empresas: empresa._id } }
    );
    
    // GERAR NOVO TOKEN
    const gestorAtualizado = await Gestor.findById(req.user.id).populate('empresas');
    const empresasIds = gestorAtualizado.empresas.map(emp => emp._id.toString());
    const primeiraEmpresaId = empresasIds.length > 0 ? empresasIds[0] : null;
    
    const JWT_SECRET = process.env.JWT_SECRET || 'segredo-super-seguro';
    
    const novoToken = jwt.sign(
      { 
        id: gestorAtualizado._id, 
        email: gestorAtualizado.email, 
        nome: gestorAtualizado.nome, 
        role: gestorAtualizado.role,
        empresaId: primeiraEmpresaId,
        empresasPermitidas: empresasIds
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.status(201).json({ 
      sucesso: true,
      mensagem: 'Empresa cadastrada com sucesso',
      empresa,
      novoToken
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar empresa:', error);
    res.status(500).json({ mensagem: 'Erro ao criar empresa', error: error.message });
  }
});

// ============================================
// PUT - Atualizar empresa (com verificação de acesso)
// ============================================
router.put('/:id', upload.single('logotipo'), async (req, res) => {
  try {
    const gestor = await Gestor.findById(req.user.id);
    if (!gestor || !gestor.empresas || !gestor.empresas.includes(req.params.id)) {
      return res.status(403).json({ mensagem: 'Acesso negado a esta empresa' });
    }
    
    const dados = JSON.parse(req.body.dados || '{}');
    const updateData = { ...dados, updatedAt: new Date() };
    
    if (req.file) {
      updateData.logotipo = req.file.filename;
    }
    
    const empresa = await Empresa.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!empresa) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    }
    
    res.json({ 
      mensagem: 'Empresa atualizada com sucesso',
      empresa 
    });
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar empresa', error: error.message });
  }
});

// ============================================
// DELETE - Excluir empresa (com verificação de acesso)
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const gestor = await Gestor.findById(req.user.id);
    if (!gestor || !gestor.empresas || !gestor.empresas.includes(req.params.id)) {
      return res.status(403).json({ mensagem: 'Acesso negado a esta empresa' });
    }
    
    const empresa = await Empresa.findByIdAndDelete(req.params.id);
    if (!empresa) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    }
    
    // Remover empresa da lista do gestor
    await Gestor.findByIdAndUpdate(req.user.id, {
      $pull: { empresas: req.params.id }
    });
    
    res.json({ mensagem: 'Empresa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir empresa' });
  }
});


// ============================================
// GET - Verificar acesso do gestor à empresa
// ============================================
router.get('/verificar-acesso/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const usuarioRole = req.user?.role;
    const usuarioEmpresaId = req.user?.empresaId;
    
    console.log(`🔍 Verificando acesso à empresa ${empresaId}`);
    console.log(`   Role: ${usuarioRole}`);
    console.log(`   EmpresaId do token: ${usuarioEmpresaId}`);
    
    let temAcesso = false;
    
    // ADMIN tem acesso total
    if (usuarioRole === 'admin') {
      temAcesso = true;
    }
    // TÉCNICO: verifica se a empresa do token é a mesma
    else if (usuarioRole === 'tecnico') {
      temAcesso = empresaId === usuarioEmpresaId;
      console.log(`   Técnico: acesso = ${temAcesso}`);
    }
    // GESTOR: verifica se a empresa está na lista de empresas permitidas
    else if (usuarioRole === 'gestor') {
      const gestor = await Gestor.findById(req.user.id);
      if (gestor && gestor.empresas) {
        temAcesso = gestor.empresas.some(id => id.toString() === empresaId);
      }
      console.log(`   Gestor: acesso = ${temAcesso}`);
    }
    
    if (!temAcesso) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado a esta empresa' 
      });
    }
    
    res.json({ sucesso: true });
  } catch (error) {
    console.error('❌ Erro ao verificar acesso:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao verificar acesso',
      erro: error.message 
    });
  }
});

// ============================================
// GET - Configuração Fiscal da Empresa
// ============================================
router.get('/config-fiscal/:empresaId', verifyToken, async (req, res) => {
  try {
    const { empresaId } = req.params;
    
    console.log('🔍 Buscando configuração fiscal para empresa:', empresaId);
    
    // Verificar acesso (apenas gestor ou técnico da empresa)
    if (req.user.role === 'tecnico') {
      // Técnico só pode acessar sua empresa designada
      if (req.user.empresaId !== empresaId) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Acesso negado a esta empresa' 
        });
      }
    } else if (req.user.role === 'gestor') {
      // Gestor precisa ter a empresa na lista
      const gestor = await Gestor.findById(req.user.id);
      if (!gestor || !gestor.empresas || !gestor.empresas.includes(empresaId)) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Acesso negado a esta empresa' 
        });
      }
    }
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    // Configuração fiscal padrão
    const configFiscal = {
      incluiIVA: true,
      taxaIVA: empresa.taxaIVA || 14,
      incluiRetencao: empresa.incluiRetencao || false,
      taxaRetencao: empresa.taxaRetencao || 7,
      regimeIva: empresa.regimeIva || 'Normal',
      regimeTributario: empresa.regimeTributario || 'Regime Geral'
    };
    
    console.log('✅ Configuração fiscal retornada:', configFiscal);
    res.json(configFiscal);
    
  } catch (error) {
    console.error('❌ Erro ao buscar configuração fiscal:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar configuração fiscal',
      erro: error.message 
    });
  }
});

// ============================================
// POST - Atualizar Configuração Fiscal da Empresa
// ============================================
router.post('/config-fiscal/:empresaId', verifyToken, async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { incluiIVA, taxaIVA, incluiRetencao, taxaRetencao, regimeIva, regimeTributario } = req.body;
    
    console.log('📝 Atualizando configuração fiscal para empresa:', empresaId);
    
    // Verificar acesso (apenas gestor)
    if (req.user.role !== 'gestor') {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Apenas gestores podem alterar configurações fiscais' 
      });
    }
    
    const gestor = await Gestor.findById(req.user.id);
    if (!gestor || !gestor.empresas || !gestor.empresas.includes(empresaId)) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado a esta empresa' 
      });
    }
    
    const updateData = {};
    if (incluiIVA !== undefined) updateData.incluiIVA = incluiIVA;
    if (taxaIVA !== undefined) updateData.taxaIVA = taxaIVA;
    if (incluiRetencao !== undefined) updateData.incluiRetencao = incluiRetencao;
    if (taxaRetencao !== undefined) updateData.taxaRetencao = taxaRetencao;
    if (regimeIva !== undefined) updateData.regimeIva = regimeIva;
    if (regimeTributario !== undefined) updateData.regimeTributario = regimeTributario;
    
    const empresa = await Empresa.findByIdAndUpdate(
      empresaId, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    const configFiscal = {
      incluiIVA: empresa.incluiIVA !== false,
      taxaIVA: empresa.taxaIVA || 14,
      incluiRetencao: empresa.incluiRetencao || false,
      taxaRetencao: empresa.taxaRetencao || 7,
      regimeIva: empresa.regimeIva || 'Normal',
      regimeTributario: empresa.regimeTributario || 'Regime Geral'
    };
    
    console.log('✅ Configuração fiscal atualizada:', configFiscal);
    res.json({ 
      sucesso: true, 
      mensagem: 'Configuração fiscal atualizada com sucesso',
      config: configFiscal 
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar configuração fiscal:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao atualizar configuração fiscal',
      erro: error.message 
    });
  }
});

// ============================================
// GET - Estatísticas da empresa (com verificação de acesso)
// ============================================
router.get('/:id/estatisticas', async (req, res) => {
  try {
    const gestor = await Gestor.findById(req.user.id);
    if (!gestor || !gestor.empresas || !gestor.empresas.includes(req.params.id)) {
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    
    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    }
    
    const estatisticas = {
      totalFuncionarios: empresa.numeroFuncionarios,
      dataCadastro: empresa.createdAt,
      ultimaAtualizacao: empresa.updatedAt,
      ativa: empresa.ativo
    };
    
    res.json(estatisticas);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;