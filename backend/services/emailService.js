require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const enviarEmailRecuperacao = async (destinatario, codigo) => {
  const remetente = process.env.EMAIL_FROM || 'venanciomartinse@gmail.com';
  
  // Logo em base64 (para aparecer no email)
  const logoPath = path.join(__dirname, '..', 'public', 'sirexa-logo.ico');
  let logoBase64 = '';
  
  try {
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath);
      logoBase64 = 'data:image/x-icon;base64,' + logoData.toString('base64');
    }
  } catch (e) {
    console.log('Logo nao encontrado, usando fallback...');
  }
  
  const mailOptions = {
    from: 'SIREXA <' + remetente + '>',
    to: destinatario,
    subject: 'SIREXA - Codigo de Recuperacao de Senha',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">' +
      '<!-- Cabecalho -->' +
      '<div style="background:linear-gradient(135deg,#003366,#0055A5);padding:30px 25px;text-align:center;">' +
      (logoBase64 ? '<img src="' + logoBase64 + '" alt="SIREXA" style="width:64px;height:64px;margin-bottom:10px;border-radius:12px;background:white;padding:8px;" />' : '<div style="width:64px;height:64px;margin:0 auto 10px;background:white;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;color:#003366;">S</div>') +
      '<h1 style="color:white;margin:0;font-size:28px;letter-spacing:2px;">SIREXA</h1>' +
      '<p style="color:#90CAF9;margin:5px 0 0 0;font-size:14px;">Plataforma Integrada</p>' +
      '</div>' +
      '<!-- Corpo -->' +
      '<div style="padding:30px 25px;">' +
      '<h2 style="color:#003366;margin:0 0 15px 0;font-size:20px;">Recuperacao de Senha</h2>' +
      '<p style="color:#555555;font-size:15px;line-height:1.6;margin:0 0 10px 0;">Recebemos uma solicitacao para redefinir a senha da sua conta no <strong>SIREXA</strong>.</p>' +
      '<p style="color:#555555;font-size:15px;line-height:1.6;margin:0 0 20px 0;">Use o codigo abaixo para concluir a recuperacao:</p>' +
      '<!-- Codigo -->' +
      '<div style="background:#f0f4ff;padding:25px;text-align:center;margin:20px 0;border:2px dashed #003366;border-radius:12px;">' +
      '<p style="color:#666666;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:2px;">Codigo de Verificacao</p>' +
      '<div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#003366;font-family:\'Courier New\',monospace;">' + codigo + '</div>' +
      '</div>' +
      '<!-- Aviso -->' +
      '<div style="background:#fff3cd;border-left:4px solid #ffc107;border-radius:8px;padding:12px 15px;margin:20px 0;">' +
      '<p style="color:#856404;font-size:13px;margin:0;">' +
      '<strong>Importante:</strong> Este codigo expira em <strong>15 minutos</strong>. Nao compartilhe com ninguem.' +
      '</p>' +
      '</div>' +
      '<p style="color:#999999;font-size:13px;line-height:1.6;margin:0;">Se voce nao solicitou esta recuperacao, ignore este email. Sua conta permanece segura.</p>' +
      '</div>' +
      '<!-- Rodape -->' +
      '<div style="background:#003366;padding:20px 25px;text-align:center;">' +
      '<p style="color:rgba(255,255,255,0.8);font-size:12px;margin:0 0 5px 0;">' + new Date().getFullYear() + ' SIREXA - Plataforma Integrada</p>' +
      '<p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">Todos os direitos reservados. Este e um email automatico.</p>' +
      '</div>' +
      '</div>'
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Email enviado:', info.messageId);
  return { success: true };
};

const verificarConexao = async () => {
  try {
    await transporter.verify();
    console.log('Conectado ao Brevo SMTP');
    return true;
  } catch (error) {
    console.error('Falha:', error.message);
    return false;
  }
};

module.exports = { enviarEmailRecuperacao, verificarConexao };
