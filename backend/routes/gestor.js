// backend/routes/gestor.js
const express = require("express");
const router = express.Router();
const Gestor = require("../models/Gestor");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { verifyToken } = require("../middlewares/auth");
const { enviarEmailRecuperacao } = require("../services/emailService"); // 🆕 Email

// 🔒 DEFINIR JWT_SECRET COM FALLBACK
const JWT_SECRET = process.env.JWT_SECRET || "segredo-super-seguro-para-desenvolvimento";

// 🆕 Armazenamento temporário de códigos de recuperação
// Em produção, use MongoDB ou Redis
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

// 👉 REGISTO de gestor
router.post("/", async (req, res) => {
  try {
    const { nome, email, senha, telefone } = req.body;
    console.log('📝 Tentativa de registo:', email);

    if (!nome || !email || !senha) {
      return res.status(400).json({ mensagem: "Nome, email e senha são obrigatórios." });
    }

    const gestorExistente = await Gestor.findOne({ email });
    if (gestorExistente) {
      return res.status(400).json({ mensagem: "Este email já está registado." });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const gestor = new Gestor({
      nome,
      email,
      senha: senhaHash,
      telefone: telefone || "",
      empresas: [],
      role: "gestor",
      ativo: true
    });

    await gestor.save();
    console.log('✅ Gestor registado com sucesso:', email);

    const token = jwt.sign(
      { id: gestor._id, email: gestor.email, nome: gestor.nome, role: gestor.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      sucesso: true,
      mensagem: "Gestor registado com sucesso!",
      token,
      gestor: { id: gestor._id, nome: gestor.nome, email: gestor.email, telefone: gestor.telefone, role: gestor.role, empresas: [] }
    });
  } catch (erro) {
    console.error('❌ Erro no registo:', erro);
    res.status(500).json({ mensagem: "Erro ao registar gestor.", erro: erro.message });
  }
});

// 👉 LOGIN de gestor
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    console.log(`🔐 Tentativa de login: ${email}`);
    
    const gestor = await Gestor.findOne({ email }).populate('empresas');
    
    if (!gestor) {
      console.log(`❌ Gestor não encontrado: ${email}`);
      return res.status(401).json({ mensagem: "Email ou senha incorrectos." });
    }
    
    console.log(`✅ Gestor encontrado: ${gestor.nome}`);
    
    const senhaCorreta = await bcrypt.compare(senha, gestor.senha);
    if (!senhaCorreta) {
      console.log(`❌ Senha incorrecta para: ${email}`);
      return res.status(401).json({ mensagem: "Email ou senha incorrectos." });
    }
    
    console.log(`✅ Senha correta!`);
    
    const empresasIds = gestor.empresas.map(emp => emp._id.toString());
    const primeiraEmpresaId = empresasIds.length > 0 ? empresasIds[0] : null;
    
    const token = jwt.sign(
      { 
        id: gestor._id, 
        email: gestor.email, 
        nome: gestor.nome, 
        role: gestor.role,
        empresaId: primeiraEmpresaId,
        empresasPermitidas: empresasIds
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    console.log(`✅ Login realizado: ${gestor.nome}`);
    
    res.json({
      sucesso: true,
      token,
      gestor: {
        id: gestor._id,
        nome: gestor.nome,
        email: gestor.email,
        empresas: gestor.empresas,
        empresaAtual: primeiraEmpresaId
      }
    });
  } catch (erro) {
    console.error('❌ Erro no login:', erro);
    res.status(500).json({ mensagem: "Erro ao fazer login.", erro: erro.message });
  }
});

// ============================================
// 🆕 RECUPERAÇÃO DE SENHA (público)
// ============================================

// 🔑 Solicitar código de recuperação
router.post("/recuperar-senha", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ mensagem: "Email é obrigatório." });
    }

    const emailNormalizado = email.toLowerCase().trim();
    console.log(`📧 Solicitação de recuperação: ${emailNormalizado}`);

    // Verificar se o gestor existe
    const gestor = await Gestor.findOne({ email: emailNormalizado });
    
    if (!gestor) {
      console.log(`❌ Email não encontrado: ${emailNormalizado}`);
      return res.status(404).json({ 
        mensagem: "Email não encontrado. Verifique se digitou corretamente." 
      });
    }

    // Verificar se já existe um código válido
    const existente = codigosRecuperacao.get(emailNormalizado);
    if (existente && Date.now() < existente.expiraEm) {
      const minutosRestantes = Math.ceil((existente.expiraEm - Date.now()) / 60000);
      return res.status(429).json({ 
        mensagem: `Já enviamos um código. Aguarde ${minutosRestantes} minuto(s) ou verifique seu email.` 
      });
    }

    // Gerar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Guardar código (15 minutos de validade)
    codigosRecuperacao.set(emailNormalizado, {
      codigo,
      expiraEm: Date.now() + 15 * 60 * 1000,
      tentativas: 0,
      criadoEm: new Date()
    });

    // Enviar email
    await enviarEmailRecuperacao(emailNormalizado, codigo);

    console.log(`✅ Código ${codigo} enviado para ${emailNormalizado}`);

    res.json({ 
      mensagem: "Código de verificação enviado para o seu email. Verifique a caixa de entrada e o spam.",
      // 🚨 REMOVER em produção:
      ...(process.env.NODE_ENV === 'development' && { debug_codigo: codigo })
    });

  } catch (error) {
    console.error('❌ Erro na recuperação:', error);
    res.status(500).json({ 
      mensagem: "Erro ao enviar email de recuperação. Tente novamente mais tarde." 
    });
  }
});

// 🔑 Redefinir senha com código
router.post("/redefinir-senha", async (req, res) => {
  try {
    const { email, codigo, novaSenha } = req.body;

    // Validações básicas
    if (!email || !codigo || !novaSenha) {
      return res.status(400).json({ mensagem: "Email, código e nova senha são obrigatórios." });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ mensagem: "A nova senha deve ter no mínimo 6 caracteres." });
    }

    const emailNormalizado = email.toLowerCase().trim();
    console.log(`🔐 Tentativa de redefinição: ${emailNormalizado}`);

    // Buscar dados da recuperação
    const dadosRecuperacao = codigosRecuperacao.get(emailNormalizado);

    if (!dadosRecuperacao) {
      return res.status(400).json({ 
        mensagem: "Nenhum código solicitado. Clique em 'Esqueceu a senha?' para receber um código." 
      });
    }

    // Verificar expiração
    if (Date.now() > dadosRecuperacao.expiraEm) {
      codigosRecuperacao.delete(emailNormalizado);
      return res.status(400).json({ 
        mensagem: "Código expirado. Solicite um novo código de recuperação." 
      });
    }

    // Verificar tentativas (máximo 5)
    if (dadosRecuperacao.tentativas >= 5) {
      codigosRecuperacao.delete(emailNormalizado);
      return res.status(400).json({ 
        mensagem: "Muitas tentativas inválidas. Por segurança, solicite um novo código." 
      });
    }

    // Verificar código
    if (dadosRecuperacao.codigo !== codigo.trim()) {
      dadosRecuperacao.tentativas++;
      codigosRecuperacao.set(emailNormalizado, dadosRecuperacao);
      const restantes = 5 - dadosRecuperacao.tentativas;
      console.log(`❌ Código inválido. Tentativas restantes: ${restantes}`);
      return res.status(400).json({ 
        mensagem: `Código inválido. ${restantes} tentativa(s) restante(s).` 
      });
    }

    // CÓDIGO VÁLIDO ✅ - Atualizar senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(novaSenha, salt);

    await Gestor.findOneAndUpdate(
      { email: emailNormalizado },
      { senha: senhaHash }
    );

    // Remover código usado
    codigosRecuperacao.delete(emailNormalizado);

    console.log(`✅ Senha redefinida com sucesso: ${emailNormalizado}`);

    res.json({ 
      mensagem: "Senha redefinida com sucesso! Já pode fazer login com a nova senha." 
    });

  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error);
    res.status(500).json({ 
      mensagem: "Erro ao redefinir senha. Tente novamente mais tarde." 
    });
  }
});

// ============================================
// ROTAS PROTEGIDAS (com token)
// ============================================

router.get("/me", verifyToken, async (req, res) => {
  try {
    console.log("=== ROTA /me CHAMADA ===");
    
    const userId = req.user.id;
    
    if (!userId) {
      return res.status(401).json({ mensagem: "Token inválido - userId não encontrado" });
    }
    
    const gestor = await Gestor.findById(userId)
      .select('-senha')
      .populate('empresas', 'nome nif');
    
    if (!gestor) {
      return res.status(404).json({ mensagem: "Gestor não encontrado" });
    }
    
    console.log("✅ Gestor encontrado:", gestor.nome);
    
    res.json(gestor);
  } catch (error) {
    console.error('❌ Erro ao buscar gestor:', error);
    res.status(500).json({ mensagem: "Erro ao buscar gestor" });
  }
});

module.exports = router;