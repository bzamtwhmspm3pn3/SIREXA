// backend/scripts/inicializarPlanos.js
const mongoose = require('mongoose');
require('dotenv').config();

// DEFINIR O MODELO PLANO DENTRO DO SCRIPT (para evitar problemas de importação)
const planoSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  descricao: { type: String, default: '' },
  preco: { type: Number, default: 0 },
  duracaoDias: { type: Number, default: 365 },
  ordem: { type: Number, default: 0 },
  limites: {
    maxEmpresas: { type: Number, default: 1 },
    maxUsuarios: { type: Number, default: 1 },
    maxFuncionarios: { type: Number, default: 5 },
    maxProdutos: { type: Number, default: 100 },
    maxFornecedores: { type: Number, default: 20 },
    maxClientes: { type: Number, default: 50 }
  },
  modulos: {
    stock: { type: Boolean, default: true },
    fornecedores: { type: Boolean, default: true },
    gestaoCompras: { type: Boolean, default: true },
    vendas: { type: Boolean, default: false },
    rh: { type: Boolean, default: false },
    contabilidade: { type: Boolean, default: false },
    financas: { type: Boolean, default: false },
    relatorios: { type: Boolean, default: true },
    dashboard: { type: Boolean, default: true },
    config: { type: Boolean, default: true }
  },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

const Plano = mongoose.model('Plano', planoSchema);

const planosPadrao = [
  {
    nome: 'FREE',
    descricao: 'Teste gratuito por 7 dias',
    preco: 0,
    duracaoDias: 7,
    ordem: 1,
    limites: {
      maxEmpresas: 1,
      maxUsuarios: 1,
      maxProdutos: 50,
      maxFornecedores: 10,
      maxClientes: 20,
      maxFuncionarios: 3
    },
    modulos: {
      stock: true, fornecedores: true, gestaoCompras: true,
      vendas: true, rh: true, contabilidade: true,
      financas: true, relatorios: true, dashboard: true, config: true
    },
    ativo: true
  },
  {
    nome: 'BÁSICO',
    descricao: 'Para pequenas empresas',
    preco: 29900,
    duracaoDias: 365,
    ordem: 2,
    limites: {
      maxEmpresas: 1,
      maxUsuarios: 1,
      maxProdutos: 100,
      maxFornecedores: 20,
      maxClientes: 50,
      maxFuncionarios: 5
    },
    modulos: {
      stock: true, fornecedores: true, gestaoCompras: true,
      vendas: true, rh: false, contabilidade: false,
      financas: false, relatorios: true, dashboard: true, config: true
    },
    ativo: true
  },
  {
    nome: 'PROFISSIONAL',
    descricao: 'Para empresas em crescimento',
    preco: 79900,
    duracaoDias: 365,
    ordem: 3,
    limites: {
      maxEmpresas: 3,
      maxUsuarios: 5,
      maxProdutos: 500,
      maxFornecedores: 100,
      maxClientes: 200,
      maxFuncionarios: 20
    },
    modulos: {
      stock: true, fornecedores: true, gestaoCompras: true,
      vendas: true, rh: true, contabilidade: false,
      financas: false, relatorios: true, dashboard: true, config: true
    },
    ativo: true
  },
  {
    nome: 'EMPRESARIAL',
    descricao: 'Solução completa',
    preco: 149900,
    duracaoDias: 365,
    ordem: 4,
    limites: {
      maxEmpresas: 10,
      maxUsuarios: 20,
      maxProdutos: 5000,
      maxFornecedores: 500,
      maxClientes: 1000,
      maxFuncionarios: 100
    },
    modulos: {
      stock: true, fornecedores: true, gestaoCompras: true,
      vendas: true, rh: true, contabilidade: true,
      financas: true, relatorios: true, dashboard: true, config: true
    },
    ativo: true
  },
  {
    nome: 'PLATINUM',
    descricao: 'Ilimitado + Suporte prioritário',
    preco: 299900,
    duracaoDias: 365,
    ordem: 5,
    limites: {
      maxEmpresas: -1,
      maxUsuarios: -1,
      maxProdutos: -1,
      maxFornecedores: -1,
      maxClientes: -1,
      maxFuncionarios: -1
    },
    modulos: {
      stock: true, fornecedores: true, gestaoCompras: true,
      vendas: true, rh: true, contabilidade: true,
      financas: true, relatorios: true, dashboard: true, config: true
    },
    ativo: true
  }
];

async function inicializar() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sirexa_db';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado ao MongoDB');
    
    // Limpar planos existentes (opcional - comentar se não quiser)
    // await Plano.deleteMany({});
    // console.log('🗑️ Planos antigos removidos');
    
    for (const plano of planosPadrao) {
      const existe = await Plano.findOne({ nome: plano.nome });
      if (!existe) {
        await Plano.create(plano);
        console.log(`✅ Plano ${plano.nome} criado`);
      } else {
        console.log(`⚠️ Plano ${plano.nome} já existe`);
      }
    }
    
    const total = await Plano.countDocuments();
    console.log(`\n📊 Total de planos no banco: ${total}`);
    console.log('🎉 Planos inicializados com sucesso!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

inicializar();