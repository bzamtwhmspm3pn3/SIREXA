require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Host:', process.env.EMAIL_HOST);
console.log('User:', process.env.EMAIL_USER);
console.log('');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

console.log('📧 A enviar email de teste...');

transporter.sendMail({
  from: 'SIREXA <no-reply@sirexa.ao>',
  to: 'venanciomartinse@gmail.com',
  subject: '✅ SIREXA - Teste de Recuperacao de Senha',
  html: '<div style="font-family:Arial;padding:20px;"><h2 style="color:#003366;">Funcionou! 🎉</h2><p>Se recebeste este email, a <strong>recuperacao de senha</strong> do SIREXA esta pronta!</p><p style="color:#999;">SIREXA - One Platform</p></div>'
})
.then(function(info) {
  console.log('✅ SUCESSO!');
  console.log('ID:', info.messageId);
  console.log('');
  console.log('📬 VERIFICA O TEU EMAIL: venanciomartinse@gmail.com');
  console.log('   (Caixa de entrada, Spam e Promocoes)');
})
.catch(function(err) {
  console.error('❌ ERRO:', err.message);
});
