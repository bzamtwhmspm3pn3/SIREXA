// backend/middlewares/logger.js
const LogAtividade = require('../models/LogAtividade');

const registrarLog = async (req, acao, modulo, descricao, detalhes = {}, sucesso = true, erro = null) => {
  try {
    // Ignorar logs de leitura se não quiser poluir
    if (acao === 'VIEW' && !process.env.LOG_VIEWS) return;
    
    const empresaId = req.empresaAtual || req.user?.empresaId || req.body?.empresaId;
    let empresaNome = '';
    
    if (empresaId) {
      const Empresa = require('../models/Empresa');
      const empresa = await Empresa.findById(empresaId);
      empresaNome = empresa?.nome || '';
    }
    
    const log = new LogAtividade({
      usuarioId: req.usuarioId,
      usuarioNome: req.user?.nome || 'Desconhecido',
      usuarioTipo: req.user?.role || 'tecnico',
      usuarioEmail: req.user?.email || '',
      empresaId: empresaId || req.user?.empresaId,
      empresaNome: empresaNome || req.user?.empresaNome || '',
      acao,
      modulo,
      descricao,
      detalhes: {
        ...detalhes,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent']
      },
      sucesso,
      mensagemErro: erro
    });
    
    await log.save();
    console.log(`📝 Log registrado: ${acao} - ${modulo} - ${descricao}`);
  } catch (error) {
    console.error('❌ Erro ao registrar log:', error);
  }
};

// Middleware para rotas
const logMiddleware = (modulo) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      const sucesso = data?.sucesso === true;
      const acao = `${req.method}`;
      
      let acaoTipo = 'VIEW';
      if (req.method === 'POST') acaoTipo = 'CREATE';
      else if (req.method === 'PUT') acaoTipo = 'UPDATE';
      else if (req.method === 'DELETE') acaoTipo = 'DELETE';
      
      registrarLog(
        req,
        acaoTipo,
        modulo,
        `${acaoTipo} em ${modulo} - ${req.originalUrl}`,
        { body: req.body, params: req.params, query: req.query },
        sucesso,
        sucesso ? null : data?.mensagem
      );
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = { registrarLog, logMiddleware };