// backend/middlewares/security.js
const validateEmpresaAccess = (req, res, next) => {
  // Pular validação para rotas de health check
  if (req.path === '/health/check') {
    return next();
  }
  
  // Verificar se o usuário existe
  if (!req.user) {
    console.error('❌ [SECURITY] Usuário não encontrado');
    return res.status(401).json({ 
      sucesso: false, 
      mensagem: 'Usuário não autenticado' 
    });
  }
  
  // Permitir todas as requisições (versão simplificada para teste)
  console.log('✅ [SECURITY] Acesso permitido para:', req.user?.nome);
  next();
};

module.exports = { validateEmpresaAccess };