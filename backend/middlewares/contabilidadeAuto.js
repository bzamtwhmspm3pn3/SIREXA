// backend/middlewares/contabilidadeAuto.js
const IntegracaoContabilistica = require('../services/IntegracaoContabilistica');

/**
 * Integra automaticamente vendas na contabilidade
 * (pagamentos são integrados pelos próprios controllers)
 */
async function integrarAutomaticamente(req, res, next) {
    const originalJson = res.json;
    
    res.json = async function(data) {
        if (data && data.sucesso && data.dados) {
            try {
                if (req.originalUrl.includes('/vendas') && req.method === 'POST') {
                    const venda = data.dados;
                    await IntegracaoContabilistica.integrarVenda(
                        venda, 
                        venda.empresaId, 
                        req.usuarioId
                    );
                    console.log(`🔄 Venda ${venda.numeroFactura} integrada automaticamente`);
                }
            } catch (error) {
                if (error.code !== 11000) {
                    console.error('❌ Erro na integração automática:', error.message);
                }
            }
        }
        return originalJson.call(this, data);
    };
    
    next();
}

module.exports = { integrarAutomaticamente };