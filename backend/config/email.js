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
// FUNÇÃO AUXILIAR PARA TEMPLATE BASE
// ============================================
const getTemplateBase = (content, title) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SIREXA - ${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background-color: #f0f2f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 550px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 35px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #003366 0%, #0055a5 100%);
      padding: 35px 30px;
      text-align: center;
    }
    .logo {
      width: 60px;
      height: 60px;
      margin: 0 auto 15px;
    }
    .header h1 {
      color: white;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      margin: 0;
    }
    .header p {
      color: rgba(255,255,255,0.8);
      font-size: 14px;
      margin-top: 8px;
    }
    .content {
      padding: 40px 35px;
    }
    .footer {
      background: #f8f9fc;
      padding: 25px 35px;
      text-align: center;
      border-top: 1px solid #e0e4e8;
    }
    .footer p {
      color: #888;
      font-size: 12px;
      margin: 5px 0;
    }
    @media (max-width: 600px) {
      .content { padding: 25px 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="https://sirexa.vercel.app/sirexa-logo.ico" alt="SIREXA" style="width: 60px; height: 60px;">
      </div>
      <h1>SIREXA</h1>
      <p>Plataforma Integrada</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>SIREXA - Plataforma Integrada</strong></p>
      <p>📍 Angola | 📞 +244 928 565 837 | 📧 andiotechinovacoes@gmail.com</p>
      <p>© ${new Date().getFullYear()} SIREXA - Todos os direitos reservados.</p>
      <p style="font-size: 11px;">Este é um email automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>
`;

// ============================================
// ENVIAR EMAIL DE VALIDAÇÃO DE CADASTRO
// ============================================
const enviarEmailValidacao = async (email, nome, token) => {
  const url = `${process.env.FRONTEND_URL || 'https://sirexa.vercel.app'}/confirmar-email?token=${token}`;
  
  console.log(`📧 [VALIDACAO] Enviando para: ${email}`);
  console.log(`🔗 Link: ${url}`);
  
  const content = `
    <h2 style="color: #003366; font-size: 22px; margin-bottom: 20px;">Olá ${nome || 'Usuário'}!</h2>
    <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
      Obrigado por se cadastrar no <strong>SIREXA</strong>. Para começar a usar o sistema, 
      por favor confirme seu endereço de email.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #003366 0%, #0055a5 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,51,102,0.3);">Confirmar Email</a>
    </div>
    <p style="color: #555; font-size: 13px; margin-top: 20px;">
      Ou copie o link: <a href="${url}" style="color: #003366;">${url}</a>
    </p>
    <p style="color: #888; font-size: 12px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e4e8;">
      ⏰ Este link é válido por <strong>24 horas</strong>.
    </p>
  `;
  
  try {
    const result = await apiInstance.sendTransacEmail({
      subject: '🐘 SIREXA - Confirme seu cadastro',
      to: [{ email: email, name: nome }],
      sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
      htmlContent: getTemplateBase(content, 'Confirme seu cadastro')
    });
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
  const url = `${process.env.FRONTEND_URL || 'https://sirexa.vercel.app'}/redefinir-senha?token=${token}&email=${encodeURIComponent(email)}`;
  
  console.log(`📧 [RECUPERACAO] Enviando para: ${email}`);
  
  const content = `
    <h2 style="color: #003366; font-size: 22px; margin-bottom: 20px;">Olá ${nome || 'Usuário'}!</h2>
    <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
      Recebemos uma solicitação para redefinir a senha da sua conta no <strong>SIREXA</strong>.
      Se você não fez essa solicitação, ignore este email. Sua senha permanecerá inalterada.
    </p>
    <div style="background: linear-gradient(135deg, #f8f9fc 0%, #f0f2f5 100%); border: 1px solid #e0e4e8; border-radius: 16px; padding: 25px; text-align: center; margin: 25px 0;">
      <div style="color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">CÓDIGO DE VERIFICAÇÃO</div>
      <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #003366; font-family: 'Courier New', monospace; background: white; display: inline-block; padding: 12px 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">${codigo}</div>
      <p style="font-size: 12px; color: #888; margin-top: 12px;">Código válido por 1 hora</p>
    </div>
    <div style="text-align: center; margin: 25px 0;">
      <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #003366 0%, #0055a5 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,51,102,0.3);">Redefinir Senha</a>
    </div>
    <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 14px 18px; margin: 25px 0; font-size: 13px; color: #856404; border-radius: 8px;">
      ⚠️ <strong>Importante:</strong> Não compartilhe este código com ninguém. A equipe SIREXA nunca solicitará este código por telefone ou mensagem.
    </div>
  `;
  
  try {
    const result = await apiInstance.sendTransacEmail({
      subject: '🔐 SIREXA - Recuperação de Senha',
      to: [{ email: email, name: nome }],
      sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
      htmlContent: getTemplateBase(content, 'Recuperação de Senha')
    });
    console.log(`✅ Email de recuperação enviado para ${email}`);
    console.log(`📬 MessageId: ${result.messageId}`);
    return { sucesso: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email de recuperação:', error.message);
    if (error.response) {
      console.error('📋 Detalhes:', error.response.body);
    }
    return { sucesso: false, erro: error.message };
  }
};

// ============================================
// ENVIAR EMAIL DE BOAS-VINDAS
// ============================================
const enviarEmailBoasVindas = async (email, nome, empresaNome) => {
  console.log(`📧 [BOAS-VINDAS] Enviando para: ${email}`);
  
  const content = `
  <h2 style="color: #003366; font-size: 22px; margin-bottom: 20px;">Bem-vindo ao SIREXA, ${nome || 'Usuário'}!</h2>
  
  <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
    A sua empresa <strong style="color: #003366;">${empresaNome || 'Sua empresa'}</strong> foi cadastrada com sucesso na plataforma 
    <strong>SIREXA - Plataforma Integrada de Gestão Empresarial</strong>.
  </p>
  
  <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
    Agora você tem acesso a um ecossistema completo de ferramentas para gerir o seu negócio de forma eficiente, 
    integrada e inteligente.
  </p>
  
  <div style="background: linear-gradient(135deg, #f8f9fc 0%, #f0f2f5 100%); border-radius: 16px; padding: 25px; margin: 25px 0;">
    <h3 style="color: #003366; font-size: 18px; margin-bottom: 15px; text-align: center;">✨ O que pode fazer no SIREXA</h3>
    <p style="color: #555; font-size: 14px; line-height: 1.6; text-align: center;">
      Gerir a sua empresa de forma tranquila, intuitiva e em qualquer lugar, 
      com todas as ferramentas necessárias para o sucesso do seu negócio.
    </p>
  </div>
  
  <div style="background: #e8f4f8; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
    <p style="color: #003366; font-size: 14px; margin-bottom: 10px;">
      💡 <strong>Precisa de ajuda?</strong>
    </p>
    <p style="color: #555; font-size: 13px;">
      Aceda à nossa documentação ou contacte o suporte através do email 
      <a href="mailto:andiotechinovacoes@gmail.com" style="color: #003366;">andiotechinovacoes@gmail.com</a>
    </p>
  </div>
  
  <p style="color: #888; font-size: 12px; text-align: center; padding-top: 15px; border-top: 1px solid #e0e4e8;">
    Estamos felizes por ter a sua empresa a bordo. 🚀
  </p>
`;
  
  try {
    const result = await apiInstance.sendTransacEmail({
      subject: '🎉 Bem-vindo ao SIREXA!',
      to: [{ email: email, name: nome }],
      sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
      htmlContent: getTemplateBase(content, 'Bem-vindo')
    });
    console.log(`✅ Email de boas-vindas enviado para ${email}`);
    console.log(`📬 MessageId: ${result.messageId}`);
    return { sucesso: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email de boas-vindas:', error.message);
    if (error.response) {
      console.error('📋 Detalhes:', error.response.body);
    }
    return { sucesso: false, erro: error.message };
  }
};

module.exports = {
  enviarEmailValidacao,
  enviarEmailRecuperacao,
  enviarEmailBoasVindas
};