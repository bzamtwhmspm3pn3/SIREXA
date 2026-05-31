const mongoose = require('mongoose');
const Empresa = require('../models/Empresa');
const Plano = require('../models/Plano');
require('dotenv').config();

async function atualizarEmpresas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');
    
    const empresas = await Empresa.find();
    console.log(`📊 ${empresas.length} empresas encontradas\n`);
    
    let atualizadas = 0;
    for (const empresa of empresas) {
      const plano = await Plano.findOne({ nome: empresa.plano });
      if (plano && plano.modulos) {
        const modulosDoPlano = Object.keys(plano.modulos).filter(key => plano.modulos[key] === true);
        
        await Empresa.updateOne(
          { _id: empresa._id },
          { $set: { modulosAtivos: modulosDoPlano } }
        );
        
        console.log(`✅ ${empresa.nome}: ${modulosDoPlano.length} módulos`);
        atualizadas++;
      } else {
        console.log(`⚠️ ${empresa.nome}: plano ${empresa.plano} não encontrado`);
      }
    }
    
    console.log(`\n🎉 ${atualizadas} empresas atualizadas com sucesso!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

atualizarEmpresas();
