// backend/middlewares/security.js
const validateEmpresaAccess = (req, res, next) => {
  // 🔥 VERIFICAÇÃO CRÍTICA - Garantir que req.user existe
  if (!req.user) {
    console.error('❌ [SECURITY] validateEmpresaAccess chamado sem req.user!');
    console.error('   Headers:', req.headers);
    console.error('   URL:', req.url);
    return res.status(401).json({ 
      sucesso: false, 
      mensagem: 'Usuário não autenticado. Faça login novamente.' 
    });
  }
  
  const empresaId = req.params.empresaId || req.query.empresaId || req.body.empresaId;
  const usuarioEmpresaId = req.user?.empresaId;
  const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
  const usuarioTipo = req.user?.role;
  
  console.log('🔒 [SECURITY] Validando acesso:', {
    empresaId,
    usuarioEmpresaId,
    empresasPermitidas: usuarioEmpresasPermitidas,
    usuarioTipo,
    url: req.url,
    method: req.method
  });
  
  // 🔥 REGRA ESPECIAL PARA TÉCNICO
  if (usuarioTipo === 'tecnico') {
    // Técnico usa a empresa do token
    if (usuarioEmpresaId) {
      req.empresaAtual = usuarioEmpresaId;
      console.log('✅ Técnico - Usando empresa do token:', req.empresaAtual);
      return next();
    }
    
    // Se não tem empresaId no token, tentar buscar do banco (fallback)
    console.error('❌ Técnico sem empresaId no token');
    return res.status(403).json({ 
      sucesso: false, 
      mensagem: 'Técnico não associado a nenhuma empresa. Contate o administrador.' 
    });
  }
  
  // Admin pode acessar qualquer empresa
  if (usuarioTipo === 'admin') {
    if (empresaId) req.empresaAtual = empresaId;
    return next();
  }
  
  // Se não tem empresaId na requisição
  if (!empresaId) {
    // Usa a primeira empresa permitida
    if (usuarioEmpresasPermitidas.length > 0) {
      req.empresaAtual = usuarioEmpresasPermitidas[0];
      console.log('🔒 Usando primeira empresa permitida:', req.empresaAtual);
      return next();
    }
    if (usuarioEmpresaId) {
      req.empresaAtual = usuarioEmpresaId;
      console.log('🔒 Usando empresa do token:', req.empresaAtual);
      return next();
    }
    
    return res.status(400).json({ 
      sucesso: false, 
      mensagem: 'Nenhuma empresa selecionada. Selecione uma empresa para continuar.' 
    });
  }
  
  // Verificar acesso para gestor
  let temAcesso = false;
  
  // Caso 1: empresaId é igual ao empresaId do token
  if (usuarioEmpresaId && empresaId.toString() === usuarioEmpresaId.toString()) {
    temAcesso = true;
  }
  // Caso 2: empresaId está na lista de empresas permitidas
  else if (usuarioEmpresasPermitidas.some(id => id.toString() === empresaId.toString())) {
    temAcesso = true;
  }
  // Caso 3: Primeiro acesso (gestor sem empresas)
  else if ((!usuarioEmpresaId || usuarioEmpresasPermitidas.length === 0) && usuarioTipo === 'gestor') {
    console.log('⚠️ Gestor sem empresas, permitindo primeiro acesso');
    temAcesso = true;
  }
  
  if (!temAcesso) {
    console.error(`❌ ACESSO NEGADO: ${req.user?.nome} tentou acessar empresa ${empresaId}`);
    console.error(`   Permitidas: ${JSON.stringify(usuarioEmpresasPermitidas)}`);
    return res.status(403).json({ 
      sucesso: false, 
      mensagem: 'Acesso negado. Você não tem permissão para aceder a esta empresa.' 
    });
  }
  
  req.empresaAtual = empresaId;
  console.log('✅ [SECURITY] Acesso permitido para empresa:', req.empresaAtual);
  next();
};

module.exports = { validateEmpresaAccess };