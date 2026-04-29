const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('☁️  MongoDB Atlas conectado com sucesso!');
    console.log('🌐 Banco: SIREXA (Nuvem - África do Sul)');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
