// backend/routes/liquidez.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // <-- ADICIONAR ESTA LINHA
const Banco = require('../models/Banco');
const RegistoBancario = require('../models/RegistoBancario');
const Transferencia = require('../models/Transferencia');
const Venda = require('../models/Venda');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// Função para calcular saldo disponível de uma conta específica
async function calcularSaldoConta(codNome, empresaId) {
  try {
    const saidasTransferencias = await Transferencia.find({ empresaId, contaDebitar: codNome });
    const entradasTransferencias = await Transferencia.find({ empresaId, contaCreditar: codNome });
    const entradasVendas = await RegistoBancario.find({ 
      empresaId, 
      conta: codNome,
      entradaSaida: 'entrada'
    });
    const saidasPagamentos = await RegistoBancario.find({ 
      empresaId, 
      conta: codNome,
      entradaSaida: 'saida'
    });
    
    const totalSaidasTransferencias = saidasTransferencias.reduce((sum, t) => sum + (t.valorDebitar || 0), 0);
    const totalEntradasTransferencias = entradasTransferencias.reduce((sum, t) => sum + (t.valorCreditar || 0), 0);
    const totalEntradasVendas = entradasVendas.reduce((sum, r) => sum + (r.valor || 0), 0);
    const totalSaidasPagamentos = saidasPagamentos.reduce((sum, r) => sum + (r.valor || 0), 0);
    
    const totalEntradas = totalEntradasTransferencias + totalEntradasVendas;
    const totalSaidas = totalSaidasTransferencias + totalSaidasPagamentos;
    
    const banco = await Banco.findOne({ codNome, empresaId });
    const saldoInicial = banco?.saldoInicial || 0;
    
    const saldoAtual = saldoInicial + totalEntradas - totalSaidas;
    
    console.log(`💰 Saldo ${codNome}: Inicial=${saldoInicial}, Entradas=${totalEntradas}, Saídas=${totalSaidas}, Atual=${saldoAtual}`);
    
    return saldoAtual;
  } catch (error) {
    console.error('Erro ao calcular saldo da conta:', error);
    return 0;
  }
}

// Função para calcular saldo total da empresa
async function calcularSaldoTotalEmpresa(empresaId) {
  try {
    const bancos = await Banco.find({ empresaId, ativo: true });
    let saldoTotal = 0;
    
    for (const banco of bancos) {
      const saldo = await calcularSaldoConta(banco.codNome, empresaId);
      saldoTotal += saldo;
    }
    
    return saldoTotal;
  } catch (error) {
    console.error('Erro ao calcular saldo total:', error);
    return 0;
  }
}

// Obter saldo disponível da empresa
router.get('/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { dataRef } = req.query;
    const dataReferencia = dataRef ? new Date(dataRef) : new Date();
    
    // Buscar todas as contas da empresa
    const bancos = await Banco.find({ empresaId, ativo: true });
    
    // Calcular saldo de cada conta
    const contasComSaldo = await Promise.all(bancos.map(async (banco) => {
      const saldo = await calcularSaldoConta(banco.codNome, empresaId);
      return {
        codNome: banco.codNome,
        nome: banco.nome,
        iban: banco.iban,
        saldoDisponivel: saldo,
        saldoInicial: banco.saldoInicial || 0
      };
    }));
    
    const saldoTotal = contasComSaldo.reduce((sum, c) => sum + c.saldoDisponivel, 0);
    
    // Buscar vendas do período para referência
    const inicioMes = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), 1);
    const vendasPeriodo = await Venda.aggregate([
      { 
        $match: { 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          data: { $gte: inicioMes, $lte: dataReferencia },
          status: 'finalizada'
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    // Buscar pagamentos do período
    const pagamentosPeriodo = await RegistoBancario.aggregate([
      { 
        $match: { 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          data: { $gte: inicioMes, $lte: dataReferencia },
          entradaSaida: 'saida'
        } 
      },
      { $group: { _id: null, total: { $sum: '$valor' } } }
    ]);
    
    res.json({ 
      sucesso: true, 
      dados: {
        saldoDisponivel: saldoTotal,
        contas: contasComSaldo,
        totalVendasPeriodo: vendasPeriodo[0]?.total || 0,
        totalPagamentosPeriodo: pagamentosPeriodo[0]?.total || 0,
        dataReferencia: dataReferencia,
        saldoAnterior: saldoTotal + (pagamentosPeriodo[0]?.total || 0) - (vendasPeriodo[0]?.total || 0)
      } 
    });
  } catch (error) {
    console.error('Erro ao buscar liquidez:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Obter saldo de uma conta específica
router.get('/conta/:empresaId/:codNome', async (req, res) => {
  try {
    const { empresaId, codNome } = req.params;
    
    const saldo = await calcularSaldoConta(codNome, empresaId);
    const banco = await Banco.findOne({ codNome, empresaId });
    
    res.json({ 
      sucesso: true, 
      dados: {
        codNome,
        nome: banco?.nome || codNome,
        iban: banco?.iban || '',
        saldoDisponivel: saldo
      } 
    });
  } catch (error) {
    console.error('Erro ao buscar saldo da conta:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Verificar liquidez de um pagamento
router.post('/verificar/:pagamentoId', async (req, res) => {
  try {
    const { pagamentoId } = req.params;
    const { dataReferencia } = req.body;
    
    const Pagamento = require('../models/Pagamento');
    const pagamento = await Pagamento.findById(pagamentoId);
    if (!pagamento) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pagamento não encontrado' });
    }
    
    const saldoConta = await calcularSaldoConta(pagamento.contaDebito, pagamento.empresaId);
    const saldoTotal = await calcularSaldoTotalEmpresa(pagamento.empresaId);
    
    const temLiquidez = saldoConta >= pagamento.valor;
    const deficit = temLiquidez ? 0 : pagamento.valor - saldoConta;
    
    const nota = {
      titulo: temLiquidez ? 'Pagamento Aprovado' : 'Pagamento Pendente por Falta de Liquidez',
      mensagem: temLiquidez 
        ? `Saldo suficiente na conta ${pagamento.contaDebito}. Disponível: ${saldoConta.toLocaleString()} Kz`
        : `Saldo insuficiente na conta ${pagamento.contaDebito}. Necessário: ${deficit.toLocaleString()} Kz adicionais. Saldo atual: ${saldoConta.toLocaleString()} Kz`,
      saldoConta,
      saldoTotal,
      deficit,
      temLiquidez
    };
    
    res.json({
      sucesso: true,
      liquidez: { temLiquidez, saldoDisponivel: saldoConta, deficit },
      nota
    });
  } catch (error) {
    console.error('Erro ao verificar liquidez:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Atualizar resultado mensal
router.post('/resultado/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { ano, mes } = req.body;
    
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0);
    
    const vendas = await Venda.aggregate([
      { 
        $match: { 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          data: { $gte: inicioMes, $lte: fimMes },
          status: 'finalizada'
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const pagamentos = await RegistoBancario.aggregate([
      { 
        $match: { 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          data: { $gte: inicioMes, $lte: fimMes },
          entradaSaida: 'saida'
        } 
      },
      { $group: { _id: null, total: { $sum: '$valor' } } }
    ]);
    
    const totalVendas = vendas[0]?.total || 0;
    const totalPagamentos = pagamentos[0]?.total || 0;
    const resultado = totalVendas - totalPagamentos;
    
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                   "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    res.json({ 
      sucesso: true, 
      dados: {
        ano,
        mes,
        periodo: `${meses[mes-1]} ${ano}`,
        totalVendas,
        totalPagamentos,
        resultado,
        saldoAtual: await calcularSaldoTotalEmpresa(empresaId)
      } 
    });
  } catch (error) {
    console.error('Erro ao atualizar resultado:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

module.exports = router;