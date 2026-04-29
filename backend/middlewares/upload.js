const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 📁 Garante que a pasta 'uploads/' exista
const pastaUploads = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(pastaUploads)) {
  fs.mkdirSync(pastaUploads, { recursive: true });
}

// 🎯 Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pastaUploads);
  },
  filename: (req, file, cb) => {
    const nomeUnico = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, nomeUnico);
  },
});

// 🔒 Validação de extensão de arquivo (somente imagens)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const tiposPermitidos = ['.png', '.jpg', '.jpeg', '.webp'];

  if (!tiposPermitidos.includes(ext)) {
    return cb(new Error('❌ Formato inválido. Apenas imagens PNG, JPG, JPEG ou WEBP são permitidas.'));
  }
  cb(null, true);
};

// ⛔ Limites de segurança
const limites = {
  fileSize: 2 * 1024 * 1024, // 2MB
};

// 🚀 Exporta o middleware de upload
const upload = multer({
  storage,
  fileFilter,
  limits: limites,
});

module.exports = upload;
