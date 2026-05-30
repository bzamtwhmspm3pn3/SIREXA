// backend/middlewares/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');

// ============================================
// RATE LIMITING POR USUÁRIO (não por IP) - CORRIGIDO
// ============================================

// Função para obter identificador único do usuário (com validação segura)
const getKey = (req) => {
  // Verificação SEGURA - só acessa req.user se existir
  if (req.user && typeof req.user === 'object' && req.user.email) {
    return `user:${req.user.email}`;
  }
  // Se tem email no body (login), usa o email
  if (req.body && req.body.email) {
    return `login:${req.body.email}`;
  }
  // Fallback: IP
  return `ip:${req.ip || 'unknown'}`;
};

// Limite geral para API (100 requisições por 15 minutos por usuário)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: getKey,
  skip: (req) => {
    // Pular rate limit para admins (só se existir req.user)
    if (req.user && req.user.role === 'admin_sistema') return true;
    return false;
  },
  message: {
    sucesso: false,
    mensagem: 'Muitas requisições. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limite para autenticação (5 tentativas por hora por EMAIL)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    return `auth:${email.toLowerCase()}`;
  },
  skipSuccessfulRequests: true,
  message: {
    sucesso: false,
    mensagem: 'Muitas tentativas de login. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limite para validação de chave (10 tentativas por hora)
const keyValidationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const chave = req.body?.chave || 'unknown';
    return `chave:${chave}`;
  },
  message: {
    sucesso: false,
    mensagem: 'Muitas tentativas de validação de chave. Tente novamente em 1 hora.'
  }
});

// Limite para registro (3 registros por hora por email)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    return `register:${email.toLowerCase()}`;
  },
  message: {
    sucesso: false,
    mensagem: 'Muitas tentativas de registro. Tente novamente em 1 hora.'
  }
});

// ============================================
// HEADERS DE SEGURANÇA
// ============================================

const securityHeaders = helmet({
  contentSecurityPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// ============================================
// SANITIZAÇÃO (DESABILITADA)
// ============================================

const sanitizeInput = (req, res, next) => next();
const protectXSS = (req, res, next) => next();
const preventHpp = hpp();

// ============================================
// LOG DE REQUISIÇÕES
// ============================================

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
    console.log(`${logLevel} [${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  next();
};

// ============================================
// VALIDAÇÃO DE ACESSO À EMPRESA
// ============================================

const validateEmpresaAccess = (req, res, next) => {
  if (!req.user) {
    console.error('❌ [SECURITY] validateEmpresaAccess chamado sem req.user!');
    return res.status(401).json({ 
      sucesso: false, 
      mensagem: 'Usuário não autenticado. Faça login novamente.' 
    });
  }
  
  const empresaId = req.params.empresaId || req.query.empresaId || req.body.empresaId;
  const usuarioEmpresaId = req.user?.empresaId;
  const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
  const usuarioTipo = req.user?.role;
  
  if (usuarioTipo === 'tecnico') {
    if (usuarioEmpresaId) {
      req.empresaAtual = usuarioEmpresaId;
      return next();
    }
    return res.status(403).json({ 
      sucesso: false, 
      mensagem: 'Técnico não associado a nenhuma empresa.' 
    });
  }
  
  if (usuarioTipo === 'admin') {
    if (empresaId) req.empresaAtual = empresaId;
    return next();
  }
  
  if (!empresaId) {
    if (usuarioEmpresasPermitidas.length > 0) {
      req.empresaAtual = usuarioEmpresasPermitidas[0];
      return next();
    }
    if (usuarioEmpresaId) {
      req.empresaAtual = usuarioEmpresaId;
      return next();
    }
    return res.status(400).json({ 
      sucesso: false, 
      mensagem: 'Nenhuma empresa selecionada.' 
    });
  }
  
  let temAcesso = false;
  if (usuarioEmpresaId && empresaId.toString() === usuarioEmpresaId.toString()) {
    temAcesso = true;
  } else if (usuarioEmpresasPermitidas.some(id => id.toString() === empresaId.toString())) {
    temAcesso = true;
  } else if ((!usuarioEmpresaId || usuarioEmpresasPermitidas.length === 0) && usuarioTipo === 'gestor') {
    temAcesso = true;
  }
  
  if (!temAcesso) {
    return res.status(403).json({ 
      sucesso: false, 
      mensagem: 'Acesso negado. Você não tem permissão para aceder a esta empresa.' 
    });
  }
  
  req.empresaAtual = empresaId;
  next();
};

// ============================================
// VERIFICAÇÃO DE LICENÇA
// ============================================

const verificarLicenca = async (req, res, next) => {
  try {
    const rotasPublicas = [
      '/api/licenca/validar',
      '/api/gestor',
      '/api/gestor/login',
      '/api/status',
      '/api/empresa/cadastrar'
    ];
    
    if (rotasPublicas.some(rota => req.path.startsWith(rota))) {
      return next();
    }
    
    const empresaId = req.empresaAtual || req.user?.empresaId || req.body.empresaId;
    
    if (!empresaId) {
      return next();
    }
    
    const Licenca = require('../models/Licenca');
    const licenca = await Licenca.findOne({ 
      empresaId, 
      status: { $in: ['ativa', 'trial'] }
    });
    
    if (!licenca) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Licença não encontrada ou inativa. Contacte o suporte.' 
      });
    }
    
    if (licenca.dataExpiracao && new Date() > licenca.dataExpiracao) {
      licenca.status = 'expirada';
      await licenca.save();
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: `Sua licença expirou em ${new Date(licenca.dataExpiracao).toLocaleDateString()}. Faça a renovação.` 
      });
    }
    
    req.licenca = licenca;
    next();
  } catch (error) {
    console.error('Erro ao verificar licença:', error);
    next();
  }
};

// ============================================
// VERIFICAÇÃO DE MÓDULO
// ============================================

const verificarModulo = (modulo) => {
  return async (req, res, next) => {
    try {
      const licenca = req.licenca;
      if (!licenca) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Licença não verificada.' 
        });
      }
      
      const modulosHabilitados = licenca.modulos || {};
      if (!modulosHabilitados[modulo]) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: `Módulo "${modulo}" não disponível no plano ${licenca.plano}.` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Erro ao verificar módulo:', error);
      res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
    }
  };
};

// ============================================
// VERIFICAÇÃO DE LIMITES
// ============================================

const verificarLimite = (tipo) => {
  return async (req, res, next) => {
    try {
      const licenca = req.licenca;
      if (!licenca) return next();
      
      const limites = licenca.limites || {};
      const empresaId = licenca.empresaId;
      
      if (tipo === 'produtos' && limites.maxProdutos !== -1) {
        const Stock = require('../models/Stock');
        const count = await Stock.countDocuments({ empresaId, tipo: 'produto' });
        if (count >= limites.maxProdutos) {
          return res.status(403).json({
            sucesso: false,
            mensagem: `Limite de produtos atingido (${count}/${limites.maxProdutos}).`
          });
        }
      }
      
      if (tipo === 'fornecedores' && limites.maxFornecedores !== -1) {
        const Fornecedor = require('../models/Fornecedor');
        const count = await Fornecedor.countDocuments({ empresaId });
        if (count >= limites.maxFornecedores) {
          return res.status(403).json({
            sucesso: false,
            mensagem: `Limite de fornecedores atingido (${count}/${limites.maxFornecedores}).`
          });
        }
      }
      
      next();
    } catch (error) {
      console.error('Erro ao verificar limite:', error);
      next();
    }
  };
};

module.exports = { 
  validateEmpresaAccess,
  apiLimiter,
  authLimiter,
  keyValidationLimiter,
  registerLimiter,
  securityHeaders,
  sanitizeInput,
  protectXSS,
  preventHpp,
  requestLogger,
  verificarLicenca,
  verificarModulo,
  verificarLimite
};