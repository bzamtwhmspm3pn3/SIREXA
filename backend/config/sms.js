// backend/config/sms.js
const axios = require('axios');

const enviarSMSBravo = async (telefone, mensagem) => {
  try {
    // Se não tem API key configurada, apenas log
    if (!process.env.BRAVO_API_KEY && !process.env.BRAVO_USERNAME) {
      console.log(`📱 [SMS SIMULADO] Para: ${telefone} - Mensagem: ${mensagem}`);
      return { sucesso: true, simulado: true };
    }
    
    let numeroLimpo = telefone.toString().replace(/\s/g, '');
    if (numeroLimpo.startsWith('+244')) numeroLimpo = numeroLimpo.substring(3);
    if (numeroLimpo.startsWith('00244')) numeroLimpo = numeroLimpo.substring(4);
    if (!numeroLimpo.startsWith('9')) numeroLimpo = '9' + numeroLimpo;
    
    const payload = { to: numeroLimpo, message: mensagem };
    
    const response = await axios.post(process.env.SMS_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BRAVO_API_KEY}`
      },
      timeout: 10000
    });
    
    if (response.data?.success) {
      console.log(`✅ SMS enviado para ${telefone}`);
      return { sucesso: true };
    }
    return { sucesso: false };
    
  } catch (error) {
    console.error('❌ Erro SMS:', error.message);
    return { sucesso: false, erro: error.message };
  }
};

const enviarCodigoVerificacao = async (telefone, codigo) => {
  const mensagem = `🐘 SIREXA: Seu código é: ${codigo}. Válido por 10 min.`;
  return enviarSMSBravo(telefone, mensagem);
};

module.exports = { enviarSMSBravo, enviarCodigoVerificacao };