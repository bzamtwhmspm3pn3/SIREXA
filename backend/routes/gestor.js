// backend/routes/gestor.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Gestor = require("../models/Gestor");
const Empresa = require("../models/Empresa");
const Licenca = require("../models/Licenca");
const Plano = require("../models/Plano");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { verifyToken } = require("../middlewares/auth");
const { enviarEmailValidacao, enviarEmailRecuperacao, enviarEmailBoasVindas } = require("../config/email");

// 🔒 DEFINIR JWT_SECRET COM FALLBACK
const JWT_SECRET = process.env.JWT_SECRET || "segredo-super-seguro-para-desenvolvimento";

// 🆕 Armazenamento temporário de códigos de recuperação
const codigosRecuperacao = new Map();

// Limpar códigos expirados a cada 5 minutos
setInterval(() => {
  const agora = Date.now();
  for (const [email, dados] of codigosRecuperacao) {
    if (agora > dados.expiraEm) {
      codigosRecuperacao.delete(email);
      console.log(`🧹 Código expirado removido: ${email}`);
    }
  }
}, 5 * 60 * 1000);

// ============================================
// 🔥 FUNÇÃO: GARANTIR QUE PLANOS EXISTEM (FALLBACK AUTOMÁTICO)
// ============================================
async function garantirPlanosExistentes() {
  try {
    // Verificar se o modelo Plano existe
    if (!Plano || typeof Plano.countDocuments !== 'function') {
      console.error('❌ Modelo Plano não está disponível!');
      return false;
    }
    
    const count = await Plano.countDocuments();
    console.log(`📊 Verificando planos no banco: ${count} encontrados`);
    
    if (count === 0) {
      console.log('⚠️ NENHUM PLANO ENCONTRADO! Criando planos padrão...');
      
      const planosPadrao = [
        { nome: 'FREE', descricao: 'Teste gratuito por 7 dias', preco: 0, duracaoDias: 7, ordem: 1, ativo: true },
        { nome: 'BÁSICO', descricao: 'Para pequenas empresas', preco: 29900, duracaoDias: 365, ordem: 2, ativo: true },
        { nome: 'PROFISSIONAL', descricao: 'Para empresas em crescimento', preco: 79900, duracaoDias: 365, ordem: 3, ativo: true },
        { nome: 'EMPRESARIAL', descricao: 'Solução completa', preco: 149900, duracaoDias: 365, ordem: 4, ativo: true },
        { nome: 'PLATINUM', descricao: 'Ilimitado + Suporte prioritário', preco: 299900, duracaoDias: 365, ordem: 5, ativo: true }
      ];
      
      await Plano.insertMany(planosPadrao);
      console.log('✅ Planos padrão criados com sucesso!');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erro ao garantir planos:', error);
    return false;
  }
}

// ============================================
// 🔥 FUNÇÃO: BUSCAR PLANOS DIRETAMENTE DO BANCO
// ============================================
async function buscarPlanosDoBanco() {
  try {
    console.log('📡 Buscando planos no MongoDB...');
    const planos = await Plano.find({}).sort({ ordem: 1 }).lean();
    console.log(`📊 Encontrados ${planos.length} planos`);
    
    if (planos.length > 0) {
      console.log('📋 Nomes:', planos.map(p => p.nome).join(', '));
    }
    
    return planos;
  } catch (error) {
    console.error('❌ Erro ao buscar planos:', error);
    return [];
  }
}

// ============================================
// ROTAS PÚBLICAS (sem token)
// ============================================

// 👉 REGISTO de gestor
router.post("/", async (req, res) => {
  try {
    const { nome, email, senha, telefone, chaveAtivacao, empresaNome, empresaNif } = req.body;
    
    console.log('📝 Tentativa de registo:', email);

    // Validações básicas
    if (!nome || !email || !senha) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Nome, email e senha são obrigatórios." 
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "A senha deve ter no mínimo 6 caracteres." 
      });
    }

    if (!chaveAtivacao) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Chave de ativação é obrigatória." 
      });
    }

    // Validar chave
    const chaveNormalizada = chaveAtivacao.replace(/-/g, '').toUpperCase();
    const licenca = await Licenca.findOne({ chave: chaveNormalizada });

    if (!licenca) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Chave de ativação inválida." 
      });
    }

    if (licenca.status !== 'ativa' && licenca.status !== 'trial') {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: `Licença ${licenca.status}.` 
      });
    }

    if (licenca.dataExpiracao && new Date() > licenca.dataExpiracao) {
      licenca.status = 'expirada';
      await licenca.save();
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: `Licença expirada em ${new Date(licenca.dataExpiracao).toLocaleDateString()}.` 
      });
    }

    if (licenca.empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Esta chave já foi utilizada." 
      });
    }

    if (!empresaNome || !empresaNif) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Nome da empresa e NIF são obrigatórios." 
      });
    }

    // Verificar duplicados
    const empresaExistente = await Empresa.findOne({ nif: empresaNif });
    if (empresaExistente) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Já existe uma empresa com este NIF." 
      });
    }

    const gestorExistente = await Gestor.findOne({ email });
    if (gestorExistente) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Este email já está registado." 
      });
    }

    // Garantir que planos existem
    await garantirPlanosExistentes();

    // Criar empresa
    const empresa = new Empresa({
      nome: empresaNome,
      nif: empresaNif,
      status: 'Ativa',
      licencaId: licenca._id,
      plano: licenca.plano,
      dataAtivacao: new Date(),
      modulosAtivos: [],
      limites: {}
    });

    await empresa.save();

    // Buscar plano e aplicar módulos
    const plano = await Plano.findOne({ nome: licenca.plano });
    if (plano) {
      empresa.modulosAtivos = Object.keys(plano.modulos || {}).filter(key => plano.modulos[key] === true);
      empresa.limites = plano.limites || {};
      empresa.dataExpiracaoPlano = new Date(Date.now() + (plano.duracaoDias || 365) * 24 * 60 * 60 * 1000);
      await empresa.save();
    }

    // Atualizar licença
    licenca.empresaId = empresa._id;
    licenca.empresaNome = empresa.nome;
    licenca.ipAtivacao = req.ip;
    licenca.status = 'ativa';
    await licenca.save();

    // Criar gestor
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const tokenValidacao = crypto.randomBytes(32).toString('hex');

    const gestor = new Gestor({
      nome,
      email,
      senha: senhaHash,
      telefone: telefone || "",
      empresas: [empresa._id],
      role: "gestor",
      ativo: false,
      chaveAtivacao: chaveNormalizada,
      licencaId: licenca._id,
      tokenValidacao,
      tokenValidacaoExpira: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await gestor.save();

    empresa.gestorId = gestor._id;
    await empresa.save();

    console.log(`✅ Gestor registado: ${email} (aguardando validação)`);

    await enviarEmailValidacao(email, nome, tokenValidacao);

    res.status(201).json({
      sucesso: true,
      mensagem: "Cadastro realizado! Enviamos um link de confirmação para seu email.",
      aguardarConfirmacao: true,
      empresa: { 
        id: empresa._id, 
        nome: empresa.nome, 
        plano: licenca.plano, 
        modulosAtivos: empresa.modulosAtivos 
      }
    });

  } catch (erro) {
    console.error('❌ Erro no registo:', erro);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro ao registar gestor.", 
      erro: erro.message 
    });
  }
});

// ============================================
// CONFIRMAR EMAIL
// ============================================
router.get("/confirmar-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Token de validação não fornecido." 
      });
    }

    const gestor = await Gestor.findOne({ 
      tokenValidacao: token,
      tokenValidacaoExpira: { $gt: new Date() }
    });

    if (!gestor) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Token inválido ou expirado." 
      });
    }

    gestor.ativo = true;
    gestor.tokenValidacao = null;
    gestor.tokenValidacaoExpira = null;
    gestor.dataConfirmacaoEmail = new Date();
    await gestor.save();

    const empresa = await Empresa.findById(gestor.empresas[0]);
    await enviarEmailBoasVindas(gestor.email, gestor.nome, empresa?.nome || 'Sua empresa');

    console.log(`✅ Email confirmado para: ${gestor.email}`);

    const frontendUrl = process.env.FRONTEND_URL || 'https://sirexa.vercel.app';
    res.redirect(`${frontendUrl}/login?confirmado=true`);

  } catch (error) {
    console.error('❌ Erro ao confirmar email:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro ao confirmar email." 
    });
  }
});

// ============================================
// REENVIAR LINK DE VALIDAÇÃO
// ============================================
router.post("/reenviar-validacao", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Email é obrigatório." 
      });
    }

    const gestor = await Gestor.findOne({ email });

    if (!gestor) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Email não encontrado." 
      });
    }

    if (gestor.ativo) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Este email já foi confirmado." 
      });
    }

    const tokenValidacao = crypto.randomBytes(32).toString('hex');
    gestor.tokenValidacao = tokenValidacao;
    gestor.tokenValidacaoExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await gestor.save();

    await enviarEmailValidacao(email, gestor.nome, tokenValidacao);

    res.json({ 
      sucesso: true, 
      mensagem: "Novo link de validação enviado." 
    });

  } catch (error) {
    console.error('❌ Erro ao reenviar validação:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro ao reenviar link." 
    });
  }
});

// ============================================
// LOGIN DE GESTOR (COM ROLE)
// ============================================
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    console.log(`🔐 Tentativa de login: ${email}`);
    
    const gestor = await Gestor.findOne({ email }).populate('empresas');
    
    if (!gestor) {
      console.log(`❌ Gestor não encontrado: ${email}`);
      return res.status(401).json({ 
        sucesso: false, 
        mensagem: "Email ou senha incorrectos." 
      });
    }
    
    if (!gestor.ativo) {
      console.log(`⚠️ Email não confirmado: ${email}`);
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: "Confirme seu email antes de fazer login.", 
        precisaConfirmacao: true,
        email: gestor.email
      });
    }
    
    const senhaCorreta = await bcrypt.compare(senha, gestor.senha);
    if (!senhaCorreta) {
      console.log(`❌ Senha incorrecta para: ${email}`);
      return res.status(401).json({ 
        sucesso: false, 
        mensagem: "Email ou senha incorrectos." 
      });
    }
    
    let role = gestor.role;
    if (email === "admin@sirexa.ao") {
      role = "admin_sistema";
      console.log("👑 ADMINISTRADOR DETECTADO! Role: admin_sistema");
    }
    
    console.log(`✅ Login realizado: ${gestor.nome} (${role})`);
    
    const empresasIds = gestor.empresas.map(emp => emp._id.toString());
    const primeiraEmpresaId = empresasIds.length > 0 ? empresasIds[0] : null;
    
    let modulosAtivos = ['stock', 'fornecedores'];
    if (primeiraEmpresaId) {
      const empresa = await Empresa.findById(primeiraEmpresaId);
      if (empresa && empresa.modulosAtivos) {
        modulosAtivos = empresa.modulosAtivos;
      }
    }
    
    const token = jwt.sign(
      { 
        id: gestor._id, 
        email: gestor.email, 
        nome: gestor.nome, 
        role: role,
        empresaId: primeiraEmpresaId,
        empresasPermitidas: empresasIds,
        modulosAtivos: modulosAtivos
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({
      sucesso: true,
      token,
      gestor: {
        _id: gestor._id,
        id: gestor._id,
        nome: gestor.nome,
        email: gestor.email,
        role: role,
        empresas: gestor.empresas,
        empresaAtual: primeiraEmpresaId,
        modulosAtivos: modulosAtivos
      }
    });
    
  } catch (erro) {
    console.error('❌ Erro no login:', erro);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro ao fazer login.", 
      erro: erro.message 
    });
  }
});


// ============================================
// 🔥 VALIDAÇÃO DE LICENÇA (PÚBLICA)
// ============================================

router.post("/licenca/validar", async (req, res) => {
  try {
    const { chave } = req.body;
    
    if (!chave) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Chave de ativação é obrigatória" 
      });
    }
    
    // Normalizar a chave (remover traços e converter para maiúsculo)
    const chaveNormalizada = chave.replace(/-/g, '').toUpperCase();
    
    console.log(`🔍 Validando chave: ${chaveNormalizada}`);
    
    // Buscar licença
    const licenca = await Licenca.findOne({ chave: chaveNormalizada });
    
    if (!licenca) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: "Chave de ativação inválida" 
      });
    }
    
    // Verificar status
    if (licenca.status !== 'ativa' && licenca.status !== 'trial') {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: `Licença ${licenca.status}. Contacte o suporte.` 
      });
    }
    
    // Verificar expiração
    if (licenca.dataExpiracao && new Date() > licenca.dataExpiracao) {
      licenca.status = 'expirada';
      await licenca.save();
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: `Licença expirada em ${new Date(licenca.dataExpiracao).toLocaleDateString()}` 
      });
    }
    
    // Verificar se já foi utilizada
    if (licenca.empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Esta chave já foi utilizada" 
      });
    }
    
    // Retornar informações da licença
    res.json({
      sucesso: true,
      mensagem: "Chave válida",
      dados: {
        plano: licenca.plano,
        modulos: licenca.modulos,
        limites: licenca.limites,
        dataExpiracao: licenca.dataExpiracao
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao validar chave:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro ao validar chave" 
    });
  }
});

// ============================================
// RECUPERAÇÃO DE SENHA
// ============================================

router.post("/recuperar-senha", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ mensagem: "Email é obrigatório." });
    }

    const emailNormalizado = email.toLowerCase().trim();
    console.log(`📧 Solicitação de recuperação: ${emailNormalizado}`);

    const gestor = await Gestor.findOne({ email: emailNormalizado });
    
    if (!gestor) {
      return res.status(404).json({ 
        mensagem: "Email não encontrado." 
      });
    }

    const existente = codigosRecuperacao.get(emailNormalizado);
    if (existente && Date.now() < existente.expiraEm) {
      const minutosRestantes = Math.ceil((existente.expiraEm - Date.now()) / 60000);
      return res.status(429).json({ 
        mensagem: `Aguarde ${minutosRestantes} minuto(s).` 
      });
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    
    codigosRecuperacao.set(emailNormalizado, {
      codigo,
      token,
      expiraEm: Date.now() + 15 * 60 * 1000,
      tentativas: 0
    });

    await enviarEmailRecuperacao(emailNormalizado, gestor.nome, token, codigo);

    console.log(`✅ Código enviado para ${emailNormalizado}`);

    res.json({ 
      sucesso: true,
      mensagem: "Código enviado para seu email.",
      ...(process.env.NODE_ENV === 'development' && { debug_codigo: codigo })
    });

  } catch (error) {
    console.error('❌ Erro na recuperação:', error);
    res.status(500).json({ 
      mensagem: "Erro ao enviar email." 
    });
  }
});

router.post("/redefinir-senha", async (req, res) => {
  try {
    const { email, codigo, novaSenha } = req.body;

    if (!email || !codigo || !novaSenha) {
      return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ mensagem: "A senha deve ter no mínimo 6 caracteres." });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const dadosRecuperacao = codigosRecuperacao.get(emailNormalizado);

    if (!dadosRecuperacao) {
      return res.status(400).json({ 
        mensagem: "Nenhum código solicitado." 
      });
    }

    if (Date.now() > dadosRecuperacao.expiraEm) {
      codigosRecuperacao.delete(emailNormalizado);
      return res.status(400).json({ 
        mensagem: "Código expirado." 
      });
    }

    if (dadosRecuperacao.tentativas >= 5) {
      codigosRecuperacao.delete(emailNormalizado);
      return res.status(400).json({ 
        mensagem: "Muitas tentativas." 
      });
    }

    if (dadosRecuperacao.codigo !== codigo.trim()) {
      dadosRecuperacao.tentativas++;
      codigosRecuperacao.set(emailNormalizado, dadosRecuperacao);
      return res.status(400).json({ 
        mensagem: `Código inválido.` 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(novaSenha, salt);

    await Gestor.findOneAndUpdate(
      { email: emailNormalizado },
      { senha: senhaHash }
    );

    codigosRecuperacao.delete(emailNormalizado);

    console.log(`✅ Senha redefinida: ${emailNormalizado}`);

    res.json({ 
      sucesso: true,
      mensagem: "Senha redefinida com sucesso!" 
    });

  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error);
    res.status(500).json({ 
      mensagem: "Erro ao redefinir senha." 
    });
  }
});

// ============================================
// ROTAS PROTEGIDAS (requer token)
// ============================================

router.get("/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const gestor = await Gestor.findById(userId)
      .select('-senha')
      .populate('empresas', 'nome nif');
    
    if (!gestor) {
      return res.status(404).json({ mensagem: "Gestor não encontrado" });
    }
    
    if (!gestor.ativo) {
      return res.status(403).json({ 
        mensagem: "Email não confirmado.",
        precisaConfirmacao: true 
      });
    }
    
    res.json(gestor);
  } catch (error) {
    console.error('❌ Erro ao buscar gestor:', error);
    res.status(500).json({ mensagem: "Erro ao buscar gestor" });
  }
});

// GET /api/gestor - Listar todos gestores (apenas admin)
router.get("/", verifyToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin_sistema') {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado. Apenas administradores.' 
      });
    }
    
    const gestores = await Gestor.find()
      .select('-senha')
      .populate('empresas', 'nome nif')
      .sort({ createdAt: -1 });
    
    res.json({
      sucesso: true,
      total: gestores.length,
      gestores
    });
  } catch (error) {
    console.error('Erro ao listar gestores:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// ROTAS ADMINISTRATIVAS (requer role admin_sistema)
// ============================================

const verificarAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin_sistema') {
    return res.status(403).json({ 
      sucesso: false, 
      mensagem: 'Acesso negado. Apenas administradores do sistema.' 
    });
  }
  next();
};

// ============================================
// 🔥 ROTAS DE PLANOS (ADMIN) - VERSÃO BLINDADA
// ============================================

// GET - Listar todos os planos
router.get("/admin/planos", verifyToken, verificarAdmin, async (req, res) => {
  try {
    console.log('🎯 GET /admin/planos');
    
    // Verificar se o modelo Plano existe
    if (!Plano) {
      console.error('❌ Modelo Plano não carregado!');
      return res.status(500).json({ 
        sucesso: false, 
        mensagem: 'Erro interno: modelo não disponível' 
      });
    }
    
    // Garantir que planos existem
    await garantirPlanosExistentes();
    
    // Buscar planos
    const planos = await buscarPlanosDoBanco();
    
    res.json({
      sucesso: true,
      total: planos.length,
      planos: planos
    });
  } catch (error) {
    console.error('❌ Erro ao listar planos:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: error.message 
    });
  }
});

// ============================================
// 🔥 ROTA DE EMERGÊNCIA - FORÇA CRIAÇÃO DE PLANOS
// ============================================
router.post("/admin/planos/emergencia/criar", verifyToken, verificarAdmin, async (req, res) => {
  try {
    console.log('🚨 EMERGÊNCIA - Forçando criação/recriação de planos');
    
    // Verificar modelo
    if (!Plano) {
      return res.status(500).json({ 
        sucesso: false, 
        mensagem: 'Modelo Plano não disponível' 
      });
    }
    
    // Deletar todos os planos existentes
    const deleteResult = await Plano.deleteMany({});
    console.log(`🗑️ Removidos ${deleteResult.deletedCount} planos antigos`);
    
    // Criar planos padrão
    const planosPadrao = [
      { nome: 'FREE', descricao: 'Teste gratuito por 7 dias', preco: 0, duracaoDias: 7, ordem: 1, ativo: true },
      { nome: 'BÁSICO', descricao: 'Para pequenas empresas', preco: 29900, duracaoDias: 365, ordem: 2, ativo: true },
      { nome: 'PROFISSIONAL', descricao: 'Para empresas em crescimento', preco: 79900, duracaoDias: 365, ordem: 3, ativo: true },
      { nome: 'EMPRESARIAL', descricao: 'Solução completa', preco: 149900, duracaoDias: 365, ordem: 4, ativo: true },
      { nome: 'PLATINUM', descricao: 'Ilimitado + Suporte prioritário', preco: 299900, duracaoDias: 365, ordem: 5, ativo: true }
    ];
    
    await Plano.insertMany(planosPadrao);
    console.log('✅ Planos recriados com sucesso!');
    
    const novosPlanos = await Plano.find().sort({ ordem: 1 });
    
    res.json({
      sucesso: true,
      mensagem: `${novosPlanos.length} planos criados com sucesso`,
      planos: novosPlanos
    });
  } catch (error) {
    console.error('❌ Erro na rota de emergência:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: error.message 
    });
  }
});

// POST - Criar ou atualizar plano
router.post("/admin/planos", verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { nome, descricao, preco, duracaoDias, ordem, limites, modulos, ativo } = req.body;
    
    if (!nome) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Nome do plano é obrigatório' 
      });
    }
    
    let plano = await Plano.findOne({ nome });
    
    if (plano) {
      // Atualizar existente
      plano.descricao = descricao || plano.descricao;
      plano.preco = preco !== undefined ? preco : plano.preco;
      plano.duracaoDias = duracaoDias || plano.duracaoDias;
      plano.ordem = ordem !== undefined ? ordem : plano.ordem;
      plano.limites = limites || plano.limites;
      plano.modulos = modulos || plano.modulos;
      plano.ativo = ativo !== undefined ? ativo : plano.ativo;
      plano.updatedAt = new Date();
    } else {
      // Criar novo
      plano = new Plano({
        nome,
        descricao: descricao || '',
        preco: preco || 0,
        duracaoDias: duracaoDias || 365,
        ordem: ordem || 0,
        limites: limites || {},
        modulos: modulos || {},
        ativo: ativo !== undefined ? ativo : true
      });
    }
    
    await plano.save();
    
    res.json({
      sucesso: true,
      mensagem: `Plano ${nome} salvo com sucesso`,
      plano
    });
  } catch (error) {
    console.error('❌ Erro ao salvar plano:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: error.message 
    });
  }
});

// PUT - Atualizar plano específico
router.put("/admin/planos/:nome", verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { nome } = req.params;
    const updates = req.body;
    
    const plano = await Plano.findOneAndUpdate(
      { nome },
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!plano) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Plano não encontrado' 
      });
    }
    
    res.json({
      sucesso: true,
      mensagem: `Plano ${nome} atualizado com sucesso`,
      plano
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar plano:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: error.message 
    });
  }
});

// DELETE - Remover plano
router.delete("/admin/planos/:nome", verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { nome } = req.params;
    
    // Verificar se plano está em uso
    const empresasComPlano = await Empresa.countDocuments({ plano: nome });
    if (empresasComPlano > 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Não é possível deletar o plano ${nome}. Existem ${empresasComPlano} empresa(s) usando este plano.` 
      });
    }
    
    const plano = await Plano.findOneAndDelete({ nome });
    
    if (!plano) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Plano não encontrado' 
      });
    }
    
    res.json({
      sucesso: true,
      mensagem: `Plano ${nome} removido com sucesso`
    });
  } catch (error) {
    console.error('❌ Erro ao remover plano:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: error.message 
    });
  }
});

// ============================================
// ROTAS ADMIN CRUD
// ============================================

// GET - Listar todos os gestores (admin)
router.get("/admin/gestores", verifyToken, verificarAdmin, async (req, res) => {
  try {
    const gestores = await Gestor.find()
      .select('-senha')
      .populate('empresas', 'nome nif')
      .sort({ createdAt: -1 });
    
    res.json({
      sucesso: true,
      total: gestores.length,
      gestores
    });
  } catch (error) {
    console.error('Erro ao listar gestores:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// GET - Listar todas as empresas (admin)
router.get("/admin/empresas", verifyToken, verificarAdmin, async (req, res) => {
  try {
    const empresas = await Empresa.find().sort({ createdAt: -1 });
    
    res.json({
      sucesso: true,
      total: empresas.length,
      empresas
    });
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// GET - Listar todas as licenças (admin)
router.get("/admin/licencas", verifyToken, verificarAdmin, async (req, res) => {
  try {
    const licencas = await Licenca.find().sort({ createdAt: -1 });
    
    res.json({
      sucesso: true,
      total: licencas.length,
      licencas
    });
  } catch (error) {
    console.error('Erro ao listar licenças:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// POST - Gerar chave de ativação (admin)
router.post("/admin/gerar-chave", verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { email, plano, diasValidade } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Email é obrigatório' 
      });
    }
    
    // Garantir que o plano existe
    await garantirPlanosExistentes();
    
    const chave = crypto.randomBytes(16).toString('hex').toUpperCase();
    
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + (diasValidade || 365));
    
    const planoData = await Plano.findOne({ nome: plano });
    
    if (!planoData) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Plano "${plano}" não encontrado. Planos disponíveis: FREE, BÁSICO, PROFISSIONAL, EMPRESARIAL, PLATINUM` 
      });
    }
    
    const licenca = new Licenca({
      chave,
      email,
      plano: plano || 'basico',
      modulos: planoData.modulos || {},
      limites: planoData.limites || {},
      dataExpiracao,
      status: 'ativa',
      ativadoPor: req.user.nome || req.user.email
    });
    
    await licenca.save();
    
    res.json({
      sucesso: true,
      chave,
      plano: plano || 'basico',
      dataExpiracao,
      mensagem: `Chave gerada com sucesso! Válida até ${dataExpiracao.toLocaleDateString()}`
    });
    
  } catch (error) {
    console.error('Erro ao gerar chave:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// PUT - Atualizar status de um gestor (admin)
router.put("/admin/gestores/:id", verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;
    
    const gestor = await Gestor.findByIdAndUpdate(
      id,
      { ativo },
      { new: true }
    ).select('-senha');
    
    if (!gestor) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Gestor não encontrado' 
      });
    }
    
    res.json({
      sucesso: true,
      mensagem: `Gestor ${gestor.nome} ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      gestor
    });
  } catch (error) {
    console.error('Erro ao atualizar gestor:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// DELETE - Revogar licença (admin)
router.delete("/admin/licencas/:chave", verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { chave } = req.params;
    
    const licenca = await Licenca.findOne({ chave });
    if (!licenca) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Licença não encontrada' 
      });
    }
    
    licenca.status = 'cancelada';
    await licenca.save();
    
    res.json({
      sucesso: true,
      mensagem: `Licença ${chave} cancelada com sucesso`
    });
  } catch (error) {
    console.error('Erro ao cancelar licença:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// ROTAS DE EMPRESA (MÓDULOS)
// ============================================

// GET - Obter módulos de uma empresa
router.get("/empresa/:id/modulos", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const empresa = await Empresa.findById(id);
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    const isGestor = req.user.role === 'gestor' && empresa.gestorId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin_sistema';
    const isTecnico = req.user.role === 'tecnico' && req.user.empresaId === id;
    
    if (!isGestor && !isAdmin && !isTecnico) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado' 
      });
    }
    
    res.json({
      sucesso: true,
      modulosAtivos: empresa.modulosAtivos || ['stock', 'fornecedores'],
      plano: empresa.plano || 'FREE'
    });
  } catch (error) {
    console.error('Erro ao buscar módulos:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// PUT - Atualizar módulos de uma empresa
router.put("/empresa/:id/modulos", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { modulosAtivos } = req.body;
    
    const empresa = await Empresa.findById(id);
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    const isGestor = req.user.role === 'gestor' && empresa.gestorId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin_sistema';
    
    if (!isGestor && !isAdmin) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado' 
      });
    }
    
    empresa.modulosAtivos = modulosAtivos;
    await empresa.save();
    
    res.json({
      sucesso: true,
      mensagem: 'Módulos atualizados com sucesso',
      modulosAtivos: empresa.modulosAtivos
    });
  } catch (error) {
    console.error('Erro ao atualizar módulos:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// EXPORTAR ROUTER
// ============================================
module.exports = router;