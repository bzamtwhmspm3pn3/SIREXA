// backend/config/email.js
const nodemailer = require('nodemailer');

// 🔥 REMETENTE VERIFICADO (use a variável de ambiente)
const EMAIL_FROM = process.env.EMAIL_FROM || 'venanciomartinse@gmail.com';

// Configuração para Brevo (Sendinblue)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true para 465, false para 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verificar conexão
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro na configuração do email Brevo:', error);
  } else {
    console.log('✅ Email Brevo configurado com sucesso!');
  }
});

// Enviar email de validação de cadastro
const enviarEmailValidacao = async (email, nome, token) => {
  const url = `${process.env.FRONTEND_URL || 'https://sirexa.vercel.app'}/confirmar-email?token=${token}`;
  
  console.log(`📧 [VALIDACAO] Enviando para: ${email}`);
  console.log(`🔗 Link: ${url}`);
  
  const html = `
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
    const info = await transporter.sendMail({
      from: `"SIREXA" <${EMAIL_FROM}>`,  // 🔥 REMETENTE VERIFICADO
      to: email,
      subject: '🐘 SIREXA - Confirme seu cadastro',
      html
    });
    console.log(`✅ Email de validação enviado para ${email}`);
    console.log(`📬 MessageId: ${info.messageId}`);
    return { sucesso: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email de validação:', error.message);
    return { sucesso: false, erro: error.message };
  }
};

// Enviar email de recuperação de senha
const enviarEmailRecuperacao = async (email, nome, token, codigo) => {
  const url = `${process.env.FRONTEND_URL || 'https://sirexa.vercel.app'}/redefinir-senha?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #d9534f, #c9302c); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .code-box { background: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
        .code { font-size: 28px; letter-spacing: 5px; font-weight: bold; color: #d9534f; }
        .button { display: inline-block; background: #d9534f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🐘 SIREXA</h1>
          <p>Recuperação de Senha</p>
        </div>
        <div class="content">
          <h2>Olá ${nome}!</h2>
          <p>Recebemos uma solicitação para redefinir sua senha. Se você não fez essa solicitação, ignore este email.</p>
          
          <div class="code-box">
            <p>Seu código de verificação é:</p>
            <div class="code">${codigo}</div>
          </div>
          
          <div style="text-align: center;">
            <a href="${url}" class="button">Redefinir Senha</a>
          </div>
          
          <p>Este link é válido por 1 hora.</p>
          <p><strong>Não compartilhe este código com ninguém.</strong></p>
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
    const info = await transporter.sendMail({
      from: `"SIREXA" <${EMAIL_FROM}>`,  // 🔥 REMETENTE VERIFICADO
      to: email,
      subject: '🔐 SIREXA - Recuperação de Senha',
      html
    });
    console.log(`✅ Email de recuperação enviado para ${email}`);
    console.log(`📬 MessageId: ${info.messageId}`);
    return { sucesso: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email de recuperação:', error.message);
    return { sucesso: false, erro: error.message };
  }
};

// Enviar email de boas-vindas
const enviarEmailBoasVindas = async (email, nome, empresaNome) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e3c72, #2a5298); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
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
          <h2>Bem-vindo ao SIREXA, ${nome}!</h2>
          <p>Sua empresa <strong>${empresaNome}</strong> foi cadastrada com sucesso.</p>
          <p>Agora você pode começar a gerenciar:</p>
          <ul>
            <li>📦 Stock e Inventário</li>
            <li>🏭 Fornecedores e Compras</li>
            <li>💰 Finanças e Pagamentos</li>
            <li>👥 Recursos Humanos</li>
            <li>📊 Contabilidade (PGCA Angola)</li>
          </ul>
          <p>Qualquer dúvida, entre em contato com nosso suporte.</p>
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
    const info = await transporter.sendMail({
      from: `"SIREXA" <${EMAIL_FROM}>`,  // 🔥 REMETENTE VERIFICADO
      to: email,
      subject: '🎉 Bem-vindo ao SIREXA!',
      html
    });
    console.log(`✅ Email de boas-vindas enviado para ${email}`);
    console.log(`📬 MessageId: ${info.messageId}`);
    return { sucesso: true };
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