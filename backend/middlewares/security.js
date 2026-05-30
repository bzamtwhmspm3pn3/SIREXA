// backend/middlewares/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// ============================================
// RATE LIMITING CONFIGURATIONS (NOVO)
// ============================================

// Limite geral para API (100 requisições por 15 minutos)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    sucesso: false,
    mensagem: 'Muitas requisições deste IP. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const whitelist = ['127.0.0.1', '::1'];
    return whitelist.includes(req.ip);
  }
});

// Limite para autenticação (5 tentativas por hora)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    sucesso: false,
    mensagem: 'Muitas tentativas de login. Tente novamente em 1 hora.'
  }
});

// Limite para validação de chave (10 tentativas por hora)
const keyValidationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    sucesso: false,
    mensagem: 'Muitas tentativas de validação de chave. Tente novamente em 1 hora.'
  }
});

// ============================================
// HEADERS DE SEGURANÇA (NOVO)
// ============================================

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://sirexa-api.onrender.com", "https://sirexa.vercel.app"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// ============================================
// SANITIZAÇÃO (NOVO)
// ============================================

const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.log(`⚠️ [SECURITY] Sanitizado: ${key}`);
  }
});

const protectXSS = xss();
const preventHpp = hpp();

// ============================================
// LOG DE REQUISIÇÕES (NOVO)
// ============================================

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
    console.log(`${logLevel} [${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
  });
  
  next();
};

// ============================================
// VALIDAÇÃO DE ACESSO À EMPRESA (JÁ EXISTENTE)
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
// VERIFICAÇÃO DE LICENÇA (NOVO)
// ============================================

const verificarLicenca = async (req, res, next) => {
  try {
    // Rotas que não precisam de licença
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
    
    // Verificar expiração
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
// VERIFICAÇÃO DE MÓDULO (NOVO)
// ============================================

const verificarModulo = (modulo) => {
  return async (req, res, next) => {
    try {
      const licenca = req.licenca;
      
      if (!licenca) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Licença não verificada. Contacte o suporte.' 
        });
      }
      
      const modulosHabilitados = licenca.modulos || {};
      
      if (!modulosHabilitados[modulo]) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: `O módulo "${modulo}" não está disponível no seu plano (${licenca.plano}). Faça upgrade para acessar.` 
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
// VERIFICAÇÃO DE LIMITES (NOVO)
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
            mensagem: `Limite de produtos atingido (${count}/${limites.maxProdutos}). Faça upgrade do plano.`
          });
        }
      }
      
      if (tipo === 'fornecedores' && limites.maxFornecedores !== -1) {
        const Fornecedor = require('../models/Fornecedor');
        const count = await Fornecedor.countDocuments({ empresaId });
        if (count >= limites.maxFornecedores) {
          return res.status(403).json({
            sucesso: false,
            mensagem: `Limite de fornecedores atingido (${count}/${limites.maxFornecedores}). Faça upgrade do plano.`
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
  securityHeaders,
  sanitizeInput,
  protectXSS,
  preventHpp,
  requestLogger,
  verificarLicenca,
  verificarModulo,
  verificarLimite
};