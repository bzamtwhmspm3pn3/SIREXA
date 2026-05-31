// backend/config/email.js
const brevo = require('@getbrevo/brevo');

// 🔥 CORREÇÃO: Inicializar a API corretamente
const defaultClient = brevo.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new brevo.TransactionalEmailsApi();

// Remetente verificado
const EMAIL_FROM = process.env.EMAIL_FROM || 'venanciomartinse@gmail.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'SIREXA';

console.log('✅ Brevo API configurado com sucesso!');

// ============================================
// ENVIAR EMAIL DE VALIDAÇÃO DE CADASTRO
// ============================================
const enviarEmailValidacao = async (email, nome, token) => {
  const url = `${process.env.FRONTEND_URL || 'https://sirexa.vercel.app'}/confirmar-email?token=${token}`;
  
  console.log(`📧 [VALIDACAO] Enviando para: ${email}`);
  console.log(`🔗 Link: ${url}`);
  
  let sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = '🐘 SIREXA - Confirme seu cadastro';
  sendSmtpEmail.to = [{ email: email, name: nome }];
  sendSmtpEmail.sender = { name: EMAIL_FROM_NAME, email: EMAIL_FROM };
  
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e3c72, #2a5298); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; background: #2a5298; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🐘 SIREXA</h1>
          <p>Sistema Integrado de Recursos Empresariais</p>
        </div>
        <div class="content">
          <h2>Olá ${nome}!</h2>
          <p>Obrigado por se cadastrar no SIREXA. Para começar a usar o sistema, por favor confirme seu endereço de email.</p>
          <div style="text-align: center;">
            <a href="${url}" class="button">Confirmar Email</a>
          </div>
          <p>Ou copie o link: <a href="${url}">${url}</a></p>
          <p>Este link é válido por 24 horas.</p>
        </div>
        <div class="footer">
          <p>SIREXA - Gestão Empresarial</p>
          <p>© ${new Date().getFullYear()} Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email de validação enviado para ${email}`);
    console.log(`📬 MessageId: ${result.messageId}`);
    return { sucesso: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email de validação:', error.message);
    if (error.response) {
      console.error('📋 Detalhes:', error.response.body);
    }
    return { sucesso: false, erro: error.message };
  }
};

// ============================================
// ENVIAR EMAIL DE RECUPERAÇÃO DE SENHA
// ============================================
const enviarEmailRecuperacao = async (email, nome, token, codigo) => {
  const url = `${process.env.FRONTEND_URL || 'https://sirexa.vercel.app'}/redefinir-senha?token=${token}`;
  
  let sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = '🔐 SIREXA - Recuperação de Senha';
  sendSmtpEmail.to = [{ email: email, name: nome }];
  sendSmtpEmail.sender = { name: EMAIL_FROM_NAME, email: EMAIL_FROM };
  
  sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Olá ${nome}!</h2>
      <p>Seu código de verificação é: <strong>${codigo}</strong></p>
      <a href="${url}">Redefinir Senha</a>
      <p>Este link é válido por 1 hora.</p>
    </div>
  `;
  
  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email de recuperação enviado para ${email}`);
    return { sucesso: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email de recuperação:', error.message);
    return { sucesso: false, erro: error.message };
  }
};

// ============================================
// ENVIAR EMAIL DE BOAS-VINDAS
// ============================================
const enviarEmailBoasVindas = async (email, nome, empresaNome) => {
  let sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = '🎉 Bem-vindo ao SIREXA!';
  sendSmtpEmail.to = [{ email: email, name: nome }];
  sendSmtpEmail.sender = { name: EMAIL_FROM_NAME, email: EMAIL_FROM };
  
  sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Bem-vindo ao SIREXA, ${nome}!</h2>
      <p>Sua empresa <strong>${empresaNome}</strong> foi cadastrada com sucesso.</p>
    </div>
  `;
  
  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email de boas-vindas enviado para ${email}`);
    return { sucesso: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email de boas-vindas:', error.message);
    return { sucesso: false, erro: error.message };
  }
};

module.exports = {
  enviarEmailValidacao,
  enviarEmailRecuperacao,
  enviarEmailBoasVindas
};