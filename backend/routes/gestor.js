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

    // ============================================
    // 1. VALIDAÇÕES BÁSICAS
    // ============================================
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

    // ============================================
    // 2. VALIDAR CHAVE DE ATIVAÇÃO (OBRIGATÓRIA)
    // ============================================
    if (!chaveAtivacao) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Chave de ativação é obrigatória. Adquira uma licença para acessar o sistema." 
      });
    }

    const chaveNormalizada = chaveAtivacao.replace(/-/g, '').toUpperCase();
    const licenca = await Licenca.findOne({ chave: chaveNormalizada });

    if (!licenca) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Chave de ativação inválida. Verifique e tente novamente." 
      });
    }

    if (licenca.status !== 'ativa' && licenca.status !== 'trial') {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: `Licença ${licenca.status}. Contacte o suporte para ativação.` 
      });
    }

    if (licenca.dataExpiracao && new Date() > licenca.dataExpiracao) {
      licenca.status = 'expirada';
      await licenca.save();
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: `Licença expirada em ${new Date(licenca.dataExpiracao).toLocaleDateString()}. Faça a renovação.` 
      });
    }

    if (licenca.empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Esta chave já foi utilizada por outra empresa." 
      });
    }

    // ============================================
    // 3. VALIDAR DADOS DA EMPRESA
    // ============================================
    if (!empresaNome || !empresaNif) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Nome da empresa e NIF são obrigatórios para ativação." 
      });
    }

    const empresaExistente = await Empresa.findOne({ nif: empresaNif });
    if (empresaExistente) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Já existe uma empresa cadastrada com este NIF." 
      });
    }

    // ============================================
    // 4. VERIFICAR SE GESTOR JÁ EXISTE
    // ============================================
    const gestorExistente = await Gestor.findOne({ email });
    if (gestorExistente) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Este email já está registado. Faça login ou recupere sua senha." 
      });
    }

    // ============================================
    // 5. CRIAR EMPRESA
    // ============================================
    const empresa = new Empresa({
      nome: empresaNome,
      nif: empresaNif,
      status: 'Ativa',
      licencaId: licenca._id,
      plano: licenca.plano,
      dataAtivacao: new Date()
    });

    await empresa.save();

    // Vincular licença à empresa
    licenca.empresaId = empresa._id;
    licenca.empresaNome = empresa.nome;
    licenca.ipAtivacao = req.ip;
    licenca.status = 'ativa';
    await licenca.save();

    // ============================================
    // 6. CRIAR GESTOR
    // ============================================
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    // Gerar token de validação de email
    const tokenValidacao = crypto.randomBytes(32).toString('hex');

    const gestor = new Gestor({
      nome,
      email,
      senha: senhaHash,
      telefone: telefone || "",
      empresas: [empresa._id],
      role: "gestor",
      ativo: false, // ⚠️ Inativo até confirmar email
      chaveAtivacao: chaveNormalizada,
      licencaId: licenca._id,
      tokenValidacao,
      tokenValidacaoExpira: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    });

    await gestor.save();

    // Adicionar gestor à empresa
    empresa.gestorId = gestor._id;
    await empresa.save();

    console.log(`✅ Gestor registado: ${email} (aguardando validação)`);

    // ============================================
    // 7. ENVIAR EMAIL DE VALIDAÇÃO (OBRIGATÓRIO)
    // ============================================
    const emailEnviado = await enviarEmailValidacao(email, nome, tokenValidacao);

    if (!emailEnviado.sucesso) {
      console.error(`❌ Falha ao enviar email de validação para ${email}`);
      // Não impedir o cadastro, mas logar o erro
    }

    // ============================================
    // 8. RESPOSTA (NÃO GERAR TOKEN AINDA - AGUARDAR VALIDAÇÃO)
    // ============================================
    res.status(201).json({
      sucesso: true,
      mensagem: "Cadastro realizado com sucesso! Enviamos um link de confirmação para seu email. Por favor, confirme seu email antes de fazer login.",
      aguardarConfirmacao: true,
      emailConfirmacaoEnviado: emailEnviado.sucesso,
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
// 🆕 CONFIRMAR EMAIL (validação obrigatória)
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

    // Buscar gestor pelo token
    const gestor = await Gestor.findOne({ 
      tokenValidacao: token,
      tokenValidacaoExpira: { $gt: new Date() }
    });

    if (!gestor) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Token inválido ou expirado. Solicite um novo link de validação." 
      });
    }

    // Ativar gestor
    gestor.ativo = true;
    gestor.tokenValidacao = null;
    gestor.tokenValidacaoExpira = null;
    gestor.dataConfirmacaoEmail = new Date();
    await gestor.save();

    // Enviar email de boas-vindas
    const empresa = await Empresa.findById(gestor.empresas[0]);
    await enviarEmailBoasVindas(gestor.email, gestor.nome, empresa?.nome || 'Sua empresa');

    console.log(`✅ Email confirmado para: ${gestor.email}`);

    // Redirecionar para o frontend (login)
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
// 🆕 REENVIAR LINK DE VALIDAÇÃO
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
        mensagem: "Este email já foi confirmado. Pode fazer login normalmente." 
      });
    }

    // Gerar novo token
    const tokenValidacao = crypto.randomBytes(32).toString('hex');
    gestor.tokenValidacao = tokenValidacao;
    gestor.tokenValidacaoExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await gestor.save();

    // Reenviar email
    await enviarEmailValidacao(email, gestor.nome, tokenValidacao);

    res.json({ 
      sucesso: true, 
      mensagem: "Novo link de validação enviado para seu email." 
    });

  } catch (error) {
    console.error('❌ Erro ao reenviar validação:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro ao reenviar link de validação." 
    });
  }
});

// ============================================
// LOGIN de gestor (apenas se email confirmado)
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
    
    // ⚠️ VERIFICAR SE EMAIL FOI CONFIRMADO
    if (!gestor.ativo) {
      console.log(`⚠️ Email não confirmado: ${email}`);
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: "Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada ou spam.", 
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
    
    console.log(`✅ Login realizado: ${gestor.nome}`);
    
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

// Solicitar código de recuperação
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
    const token = crypto.randomBytes(32).toString('hex');
    
    // Guardar código (15 minutos de validade)
    codigosRecuperacao.set(emailNormalizado, {
      codigo,
      token,
      expiraEm: Date.now() + 15 * 60 * 1000,
      tentativas: 0
    });

    // Enviar email
    await enviarEmailRecuperacao(emailNormalizado, gestor.nome, token, codigo);

    console.log(`✅ Código enviado para ${emailNormalizado}`);

    res.json({ 
      sucesso: true,
      mensagem: "Código de verificação enviado para o seu email.",
      ...(process.env.NODE_ENV === 'development' && { debug_codigo: codigo, debug_token: token })
    });

  } catch (error) {
    console.error('❌ Erro na recuperação:', error);
    res.status(500).json({ 
      mensagem: "Erro ao enviar email de recuperação." 
    });
  }
});

// Redefinir senha com código
router.post("/redefinir-senha", async (req, res) => {
  try {
    const { email, codigo, novaSenha } = req.body;

    if (!email || !codigo || !novaSenha) {
      return res.status(400).json({ mensagem: "Email, código e nova senha são obrigatórios." });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ mensagem: "A nova senha deve ter no mínimo 6 caracteres." });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const dadosRecuperacao = codigosRecuperacao.get(emailNormalizado);

    if (!dadosRecuperacao) {
      return res.status(400).json({ 
        mensagem: "Nenhum código solicitado. Clique em 'Esqueceu a senha?' para receber um código." 
      });
    }

    if (Date.now() > dadosRecuperacao.expiraEm) {
      codigosRecuperacao.delete(emailNormalizado);
      return res.status(400).json({ 
        mensagem: "Código expirado. Solicite um novo código." 
      });
    }

    if (dadosRecuperacao.tentativas >= 5) {
      codigosRecuperacao.delete(emailNormalizado);
      return res.status(400).json({ 
        mensagem: "Muitas tentativas inválidas. Solicite um novo código." 
      });
    }

    if (dadosRecuperacao.codigo !== codigo.trim()) {
      dadosRecuperacao.tentativas++;
      codigosRecuperacao.set(emailNormalizado, dadosRecuperacao);
      const restantes = 5 - dadosRecuperacao.tentativas;
      return res.status(400).json({ 
        mensagem: `Código inválido. ${restantes} tentativa(s) restante(s).` 
      });
    }

    // Código válido - atualizar senha
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
      mensagem: "Senha redefinida com sucesso! Já pode fazer login." 
    });

  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error);
    res.status(500).json({ 
      mensagem: "Erro ao redefinir senha." 
    });
  }
});

// ============================================
// ROTAS PROTEGIDAS (com token)
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
    
    // Verificar se email foi confirmado
    if (!gestor.ativo) {
      return res.status(403).json({ 
        mensagem: "Email não confirmado. Verifique sua caixa de entrada.",
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