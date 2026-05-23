// backend/middlewares/contabilidadeAuto.js
const IntegracaoContabilistica = require('../services/IntegracaoContabilistica');

/**
 * Integra automaticamente vendas e pagamentos na contabilidade
 */
async function integrarAutomaticamente(req, res, next) {
    // Guardar o método original
    const originalJson = res.json;
    
    // Sobrescrever o método json
    res.json = async function(data) {
        // Se for uma resposta de sucesso
        if (data && data.sucesso && data.dados) {
            try {
                // Verificar se é uma venda
                if (req.originalUrl.includes('/vendas') && req.method === 'POST') {
                    const venda = data.dados;
                    await IntegracaoContabilistica.integrarVenda(
                        venda, 
                        venda.empresaId, 
                        req.usuarioId
                    );
                    console.log(`🔄 Venda ${venda.numeroFactura} integrada automaticamente`);
                }
                
                // Verificar se é um pagamento
                if (req.originalUrl.includes('/pagamentos') && req.method === 'POST') {
                    const pagamento = data.dados;
                    await IntegracaoContabilistica.integrarPagamento(
                        pagamento,
                        pagamento.empresaId,
                        req.usuarioId
                    );
                    console.log(`🔄 Pagamento ${pagamento.referencia} integrado automaticamente`);
                }
            } catch (error) {
                console.error('❌ Erro na integração automática:', error);
                // Não impedir a resposta original
            }
        }
        
        // Chamar o método original
        return originalJson.call(this, data);
    };
    
    next();
}

module.exports = { integrarAutomaticamente };