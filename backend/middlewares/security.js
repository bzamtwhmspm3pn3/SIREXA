// backend/middlewares/security.js
const validateEmpresaAccess = (req, res, next) => {
  // Verificar se o usuário existe
  if (!req.user) {
    console.error('❌ [SECURITY] Usuário não autenticado');
    return res.status(401).json({ 
      sucesso: false, 
      mensagem: 'Usuário não autenticado' 
    });
  }
  
  // Obter a empresa do token do usuário
  const empresaDoToken = req.user.empresaId;
  const empresaRequisicao = req.params.empresaId || req.query.empresaId || req.body.empresaId;
  
  // Se o usuário tem empresa definida no token
  if (empresaDoToken) {
    req.empresaAtual = empresaDoToken;
    
    // Se a requisição pede uma empresa diferente, verificar permissão
    if (empresaRequisicao && empresaRequisicao.toString() !== empresaDoToken.toString()) {
      console.error(`❌ Acesso negado: usuário ${req.user.nome} tentou acessar empresa ${empresaRequisicao}`);
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado. Você não tem permissão para esta empresa.' 
      });
    }
    
    console.log(`✅ Acesso permitido: ${req.user.nome} -> empresa ${req.empresaAtual}`);
    return next();
  }
  
  // Se o usuário não tem empresa no token (admin ou caso especial)
  if (req.user.role === 'admin') {
    console.log(`✅ Admin ${req.user.nome} - acesso livre`);
    return next();
  }
  
  // Se chegou aqui, permitir mas com aviso
  console.warn(`⚠️ Usuário ${req.user.nome} sem empresa definida no token`);
  next();
};

module.exports = { validateEmpresaAccess };