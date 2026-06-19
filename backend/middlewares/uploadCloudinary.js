const multer = require('multer');
const path = require('path');
const fs = require('fs');

const cloudinaryDisponivel = process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

let storage;

if (cloudinaryDisponivel) {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const cloudinary = require('../config/cloudinary');
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'sirexa',
      allowed_formats: ['png', 'jpg', 'jpeg', 'webp'],
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    },
  });
} else {
  const pastaUploads = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(pastaUploads)) {
    fs.mkdirSync(pastaUploads, { recursive: true });
  }
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, pastaUploads),
    filename: (req, file, cb) => {
      const nomeUnico = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
      cb(null, nomeUnico);
    },
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const tiposPermitidos = ['.png', '.jpg', '.jpeg', '.webp'];
    if (!tiposPermitidos.includes(ext)) {
      return cb(new Error('Formato inválido. Apenas PNG, JPG, JPEG ou WEBP.'));
    }
    cb(null, true);
  },
});

module.exports = upload;
