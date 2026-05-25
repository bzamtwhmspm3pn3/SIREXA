// backend/middlewares/security.js
const validateEmpresaAccess = (req, res, next) => {
  // ============================================
  // 🔥 VERIFICAÇÃO INICIAL - GARANTIR req.user
  // ============================================
  if (!req.user) {
    console.error('❌ [SECURITY] validateEmpresaAccess chamado sem req.user!');
    return res.status(401).json({ 
      sucesso: false, 
      mensagem: 'Usuário não autenticado. Faça login novamente.' 
    });
  }
  
  // ============================================
  // 🔥 GARANTIR que user tem os campos necessários
  // ============================================
  const user = req.user;
  const empresaId = req.params.empresaId || req.query.empresaId || req.body.empresaId;
  const usuarioEmpresaId = user.empresaId || null;
  const usuarioEmpresasPermitidas = user.empresasPermitidas || [];
  const usuarioTipo = user.role || 'gestor';
  const usuarioNome = user.nome || user.email || 'Usuário';
  
  console.log('🔒 [SECURITY] Validando acesso:', {
    empresaId: empresaId || '(não informada)',
    usuarioEmpresaId,
    empresasPermitidas: usuarioEmpresasPermitidas.length,
    usuarioTipo,
    url: req.url,
    method: req.method,
    usuario: usuarioNome
  });
  
  // ============================================
  // 🛡️ REGRA 1: TÉCNICO
  // ============================================
  if (usuarioTipo === 'tecnico') {
    if (usuarioEmpresaId) {
      req.empresaAtual = usuarioEmpresaId;
      console.log('✅ Técnico - Empresa do token:', req.empresaAtual);
      return next();
    }
    console.error('❌ Técnico sem empresaId no token');
    return res.status(403).json({ 
      sucesso: false, 
      mensagem: 'Técnico não associado a nenhuma empresa.' 
    });
  }
  
  // ============================================
  // 🛡️ REGRA 2: ADMIN (acesso total)
  // ============================================
  if (usuarioTipo === 'admin') {
    if (empresaId) {
      req.empresaAtual = empresaId;
    }
    console.log('✅ Admin - Acesso total');
    return next();
  }
  
  // ============================================
  // 🛡️ REGRA 3: GESTOR - Sem empresaId na requisição
  // ============================================
  if (!empresaId) {
    // Usa a primeira empresa permitida
    if (usuarioEmpresasPermitidas.length > 0) {
      req.empresaAtual = usuarioEmpresasPermitidas[0];
      console.log('🔒 Gestor - Primeira empresa permitida:', req.empresaAtual);
      return next();
    }
    // Usa empresa do token
    if (usuarioEmpresaId) {
      req.empresaAtual = usuarioEmpresaId;
      console.log('🔒 Gestor - Empresa do token:', req.empresaAtual);
      return next();
    }
    // Gestor sem empresas (caso extremo)
    console.log('⚠️ Gestor sem empresas - acesso permitido para cadastro inicial');
    return next();
  }
  
  // ============================================
  // 🛡️ REGRA 4: GESTOR - Verificar acesso à empresa específica
  // ============================================
  let temAcesso = false;
  
  // Converter IDs para string para comparação segura
  const empresaIdStr = empresaId.toString();
  
  // Verifica se é a empresa do token
  if (usuarioEmpresaId && empresaIdStr === usuarioEmpresaId.toString()) {
    temAcesso = true;
  }
  // Verifica se está na lista de empresas permitidas
  else if (usuarioEmpresasPermitidas.some(id => id.toString() === empresaIdStr)) {
    temAcesso = true;
  }
  
  if (!temAcesso) {
    console.error(`❌ ACESSO NEGADO: ${usuarioNome} -> empresa ${empresaIdStr}`);
    console.error(`   Empresa do token: ${usuarioEmpresaId}`);
    console.error(`   Permitidas: ${JSON.stringify(usuarioEmpresasPermitidas)}`);
    return res.status(403).json({ 
      sucesso: false, 
      mensagem: 'Acesso negado. Você não tem permissão para aceder a esta empresa.' 
    });
  }
  
  req.empresaAtual = empresaIdStr;
  console.log('✅ Acesso permitido para empresa:', req.empresaAtual);
  next();
};

module.exports = { validateEmpresaAccess };