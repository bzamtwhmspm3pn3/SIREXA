// backend/middlewares/contabilidadeAuto.js
const IntegracaoContabilistica = require('../services/IntegracaoContabilistica');

/**
 * Middleware reservado para integrações futuras
 * Vendas e Pagamentos são integrados pelos próprios controllers
 * para garantir contabilizado=true e evitar duplicação
 */
async function integrarAutomaticamente(req, res, next) {
    next();
}

module.exports = { integrarAutomaticamente };