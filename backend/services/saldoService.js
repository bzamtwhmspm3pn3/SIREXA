const Banco = require('../models/Banco');
const RegistoBancario = require('../models/RegistoBancario');

const saldoService = {
  async calcularSaldoConta(codNome, empresaId, ateData = null) {
    const filtro = { empresaId, conta: codNome };
    if (ateData) {
      const dataLimite = new Date(ateData);
      dataLimite.setHours(23, 59, 59, 999);
      filtro.data = { $lte: dataLimite };
    }

    const entradas = await RegistoBancario.find({ ...filtro, entradaSaida: 'entrada' });
    const saidas = await RegistoBancario.find({ ...filtro, entradaSaida: 'saida' });

    const totalEntradas = entradas.reduce((sum, r) => sum + (r.valor || 0), 0);
    const totalSaidas = saidas.reduce((sum, r) => sum + (r.valor || 0), 0);

    const banco = await Banco.findOne({ codNome, empresaId });
    const saldoInicial = banco?.saldoInicial || 0;

    return saldoInicial + totalEntradas - totalSaidas;
  },

  async calcularSaldoTotalEmpresa(empresaId, ateData = null) {
    const bancos = await Banco.find({ empresaId, ativo: true });
    let total = 0;
    for (const banco of bancos) {
      total += await this.calcularSaldoConta(banco.codNome, empresaId, ateData);
    }
    return total;
  },

  async calcularSaldoEmConta(empresaId, dataRef) {
    const dataLimite = dataRef ? new Date(dataRef) : new Date();
    dataLimite.setHours(23, 59, 59, 999);

    const bancos = await Banco.find({ empresaId, ativo: true });
    let saldoTotal = 0;
    const detalhes = [];

    for (const banco of bancos) {
      const saldo = await this.calcularSaldoConta(banco.codNome, empresaId, dataLimite);
      saldoTotal += saldo;
      detalhes.push({
        nome: banco.nome, codNome: banco.codNome, iban: banco.iban, saldo
      });
    }

    return { saldoTotal, detalhesContas: detalhes };
  }
};

module.exports = saldoService;
