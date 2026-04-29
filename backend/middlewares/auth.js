// backend/middlewares/auth.js
const jwt = require('jsonwebtoken');
const Gestor = require('../models/Gestor');
const Tecnico = require('../models/Tecnico');

const secret = process.env.JWT_SECRET || 'segredo-super-seguro';

async function generateToken(user) {
  // Buscar o usuário completo com suas empresas (se for gestor)
  let empresasIds = [];
  
  if (user.role === 'gestor' || !user.role) {
    const gestor = await Gestor.findById(user._id).populate('empresas');
    if (gestor && gestor.empresas) {
      empresasIds = gestor.empresas.map(emp => emp._id.toString());
    }
  }
  
  console.log(`🔑 Gerando token para ${user.nome}:`, {
    role: user.role,
    empresas: empresasIds
  });
  
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      nome: user.nome,
      role: user.role || 'gestor',
      empresaId: user.empresaId || (empresasIds[0] || null),
      empresasPermitidas: empresasIds  // ← NOME CORRETO para o security.js
    }, 
    secret, 
    { expiresIn: '7d' }
  );
}

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ mensagem: 'Acesso negado. Token ausente.' });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ mensagem: 'Token inválido.' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    
    // Garantir que empresasPermitidas seja sempre um array
    const empresasPermitidas = decoded.empresasPermitidas || decoded.empresas || [];
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      nome: decoded.nome,
      role: decoded.role,
      empresaId: decoded.empresaId,
      empresasPermitidas: empresasPermitidas  // ← CAMPO QUE O security.js espera
    };
    
    console.log('🔐 Token verificado:', {
      id: req.user.id,
      nome: req.user.nome,
      role: req.user.role,
      empresaId: req.user.empresaId,
      empresasPermitidas: req.user.empresasPermitidas
    });
    
    next();
  } catch (error) {
    console.error('Erro ao verificar token:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensagem: 'Token expirado. Faça login novamente.' });
    }
    
    return res.status(401).json({ mensagem: 'Token inválido.' });
  }
}

module.exports = { generateToken, verifyToken };