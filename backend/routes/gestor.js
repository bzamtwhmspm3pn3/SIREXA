// backend/routes/gestor.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Gestor = require("../models/Gestor");
const Empresa = require("../models/Empresa");
const Licenca = require("../models/Licenca");
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
// ROTAS PÚBLICAS (sem token)
// ============================================

// 👉 REGISTO de gestor (com validação de chave e email)
router.post("/", async (req, res) => {
  try {
    const { nome, email, senha, telefone, chaveAtivacao, empresaNome, empresaNif } = req.body;
    
    console.log('📝 Tentativa de registo:', email);

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

    // Criar empresa
    const empresa = new Empresa({
      nome: empresaNome,
      nif: empresaNif,
      status: 'Ativa',
      licencaId: licenca._id,
      plano: licenca.plano,
      dataAtivacao: new Date()
    });

    await empresa.save();

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

    const emailEnviado = await enviarEmailValidacao(email, nome, tokenValidacao);

    res.status(201).json({
      sucesso: true,
      mensagem: "Cadastro realizado! Enviamos um link de confirmação para seu email.",
      aguardarConfirmacao: true,
      empresa: { id: empresa._id, nome: empresa.nome, plano: licenca.plano }
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
// 🔥 LOGIN DE GESTOR (CORRIGIDO - COM ROLE)
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
    
    // 🔥 DETERMINAR O ROLE (admin_sistema para email específico)
    let role = gestor.role;
    if (email === "admin@sirexa.ao") {
      role = "admin_sistema";
      console.log("👑 ADMINISTRADOR DETECTADO! Role: admin_sistema");
    }
    
    console.log(`✅ Login realizado: ${gestor.nome} (${role})`);
    
    const empresasIds = gestor.empresas.map(emp => emp._id.toString());
    const primeiraEmpresaId = empresasIds.length > 0 ? empresasIds[0] : null;
    
    const token = jwt.sign(
      { 
        id: gestor._id, 
        email: gestor.email, 
        nome: gestor.nome, 
        role: role,
        empresaId: primeiraEmpresaId,
        empresasPermitidas: empresasIds
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    // 🔥 RETORNAR O ROLE NA RESPOSTA
    res.json({
      sucesso: true,
      token,
      gestor: {
        _id: gestor._id,
        id: gestor._id,
        nome: gestor.nome,
        email: gestor.email,
        role: role,  // 🔥 CAMPO CRÍTICO - ADICIONADO!
        empresas: gestor.empresas,
        empresaAtual: primeiraEmpresaId
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
// ROTAS PROTEGIDAS
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

module.exports = router;