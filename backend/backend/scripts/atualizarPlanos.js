const mongoose = require('mongoose');
const Plano = require('../models/Plano');
require('dotenv').config();

const MODULOS_COMPLETOS = {
  vendas: true, stock: true, facturacao: true,
  funcionarios: true, folhaSalarial: true, gestaoFaltas: true,
  gestaoAbonos: true, avaliacao: true,
  viaturas: true, abastecimentos: true, manutencoes: true, inventario: true,
  fornecedores: true, fluxoCaixa: true, contaCorrente: true,
  controloPagamento: true, custosReceitas: true, orcamentos: true,
  dre: true, indicadores: true, transferencias: true, reconciliacao: true,
  relatorios: true, graficos: true, analise: true,
  contabilidade: true, planoContas: true, lancamentos: true,
  diarioGeral: true, razaoGeral: true, balancete: true,
  saldosContas: true, balancoPatrimonial: true, periodosFiscais: true,
  encerramento: true
};

const PLANOS_CONFIG = {
  'FREE': { modulos: { ...MODULOS_COMPLETOS }, limites: { maxEmpresas: 1, maxUsuarios: 1, maxFuncionarios: 3, maxProdutos: 50, maxFornecedores: 10, maxClientes: 20 } },
  'BÁSICO': { modulos: { ...MODULOS_COMPLETOS }, limites: { maxEmpresas: 1, maxUsuarios: 1, maxFuncionarios: 5, maxProdutos: 100, maxFornecedores: 20, maxClientes: 50 } },
  'PROFISSIONAL': { modulos: { ...MODULOS_COMPLETOS }, limites: { maxEmpresas: 3, maxUsuarios: 5, maxFuncionarios: 20, maxProdutos: 500, maxFornecedores: 100, maxClientes: 200 } },
  'EMPRESARIAL': { modulos: { ...MODULOS_COMPLETOS }, limites: { maxEmpresas: 10, maxUsuarios: 20, maxFuncionarios: 100, maxProdutos: 5000, maxFornecedores: 500, maxClientes: 1000 } },
  'PLATINUM': { modulos: { ...MODULOS_COMPLETOS }, limites: { maxEmpresas: -1, maxUsuarios: -1, maxFuncionarios: -1, maxProdutos: -1, maxFornecedores: -1, maxClientes: -1 } }
};

async function atualizarPlanos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');
    
    for (const [nome, config] of Object.entries(PLANOS_CONFIG)) {
      const result = await Plano.updateOne(
        { nome: nome },
        { $set: { modulos: config.modulos, limites: config.limites, updatedAt: new Date() } }
      );
      console.log(result.modifiedCount > 0 ? `✅ ${nome} atualizado` : `⚠️ ${nome} já atualizado`);
    }
    
    console.log('\n🎉 Planos atualizados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

atualizarPlanos();
