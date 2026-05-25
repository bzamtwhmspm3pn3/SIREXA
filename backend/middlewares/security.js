// backend/middlewares/security.js
const validateEmpresaAccess = (req, res, next) => {
  // ============================================
  // VERIFICAÇÃO 1: Usuário autenticado
  // ============================================
  if (!req.user) {
    console.error('❌ [SECURITY] Usuário não autenticado');
    return res.status(401).json({ 
      sucesso: false, 
      mensagem: 'Usuário não autenticado' 
    });
  }
  
  // ============================================
  // VERIFICAÇÃO 2: Obter empresa da requisição
  // ============================================
  const empresaRequisicao = req.params.empresaId || req.query.empresaId || req.body.empresaId;
  const empresaToken = req.user.empresaId;
  const empresasPermitidas = req.user.empresasPermitidas || [];
  const role = req.user.role || 'gestor';
  
  // ============================================
  // REGRA 1: ADMIN tem acesso total
  // ============================================
  if (role === 'admin') {
    console.log('✅ ADMIN - acesso total');
    return next();
  }
  
  // ============================================
  // REGRA 2: TÉCNICO - só vê a empresa dele
  // ============================================
  if (role === 'tecnico') {
    if (!empresaToken) {
      console.error('❌ Técnico sem empresa associada');
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Técnico não associado a nenhuma empresa' 
      });
    }
    
    // Se a requisição pede uma empresa específica, verifica se é a do técnico
    if (empresaRequisicao && empresaRequisicao.toString() !== empresaToken.toString()) {
      console.error(`❌ Técnico ${req.user.nome} tentou acessar empresa ${empresaRequisicao} (sua empresa é ${empresaToken})`);
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado: você só pode acessar sua própria empresa' 
      });
    }
    
    req.empresaAtual = empresaToken;
    console.log(`✅ TÉCNICO ${req.user.nome} - empresa: ${empresaToken}`);
    return next();
  }
  
  // ============================================
  // REGRA 3: GESTOR - só vê empresas permitidas
  // ============================================
  // Se o gestor não tem empresas permitidas, usa a do token
  let empresasValidas = empresasPermitidas;
  if (empresasValidas.length === 0 && empresaToken) {
    empresasValidas = [empresaToken];
  }
  
  // Se o gestor não tem nenhuma empresa (caso de primeiro acesso)
  if (empresasValidas.length === 0) {
    console.log(`⚠️ GESTOR ${req.user.nome} sem empresas - permitindo primeiro acesso`);
    return next();
  }
  
  // Se a requisição não pede empresa específica, usa a primeira permitida
  if (!empresaRequisicao) {
    req.empresaAtual = empresasValidas[0];
    console.log(`✅ GESTOR ${req.user.nome} - usando empresa padrão: ${req.empresaAtual}`);
    return next();
  }
  
  // Verificar se o gestor tem acesso à empresa solicitada
  const temAcesso = empresasValidas.some(id => id.toString() === empresaRequisicao.toString());
  
  if (!temAcesso) {
    console.error(`❌ GESTOR ${req.user.nome} tentou acessar empresa ${empresaRequisicao} (permitidas: ${empresasValidas.join(', ')})`);
    return res.status(403).json({ 
      sucesso: false, 
      mensagem: 'Acesso negado: você não tem permissão para esta empresa' 
    });
  }
  
  req.empresaAtual = empresaRequisicao;
  console.log(`✅ GESTOR ${req.user.nome} - empresa: ${req.empresaAtual}`);
  next();
};

module.exports = { validateEmpresaAccess };