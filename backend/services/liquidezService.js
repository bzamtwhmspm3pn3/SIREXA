const mongoose = require('mongoose');
const Venda = require('../models/Venda');
const Resultado = require('../models/Resultado');
const Pagamento = require('../models/Pagamento');

class LiquidezService {
  
  // Calcular saldo disponível real
  async getSaldoDisponivel(empresaId, dataReferencia = new Date()) {
    try {
      // 1. Total de vendas realizadas (à vista + recebidas)
      const vendas = await Venda.aggregate([
        { 
          $match: { 
            empresaId: new mongoose.Types.ObjectId(empresaId),
            data: { $lte: dataReferencia }
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$total' } 
          } 
        }
      ]);
      const totalVendas = vendas[0]?.total || 0;
      
      // 2. Total de pagamentos já efetuados
      const pagamentos = await Pagamento.aggregate([
        {
          $match: {
            empresaId: new mongoose.Types.ObjectId(empresaId),
            status: 'Pago',
            dataPagamento: { $lte: dataReferencia }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$valor' }
          }
        }
      ]);
      const totalPagamentos = pagamentos[0]?.total || 0;
      
      // 3. Resultado de exercícios anteriores (saldo acumulado)
      const resultadosAnteriores = await Resultado.aggregate([
        {
          $match: {
            empresaId: new mongoose.Types.ObjectId(empresaId),
            $or: [
              { ano: { $lt: dataReferencia.getFullYear() } },
              { 
                ano: dataReferencia.getFullYear(),
                mes: { $lt: dataReferencia.getMonth() + 1 }
              }
            ]
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$resultadoLiquido' }
          }
        }
      ]);
      const saldoAnterior = resultadosAnteriores[0]?.total || 0;
      
      // 4. Saldo disponível = vendas - pagamentos + saldo anterior
      const saldoDisponivel = totalVendas - totalPagamentos + saldoAnterior;
      
      return {
        saldo: saldoDisponivel,
        totalVendas,
        totalPagamentos,
        saldoAnterior,
        dataCalculo: dataReferencia
      };
    } catch (error) {
      console.error('Erro ao calcular liquidez:', error);
      return {
        saldo: 0,
        totalVendas: 0,
        totalPagamentos: 0,
        saldoAnterior: 0,
        erro: error.message
      };
    }
  }
  
  // Verificar liquidez para um pagamento
  async verificarLiquidez(empresaId, valorPagamento, dataReferencia = new Date()) {
    const { saldo, totalVendas, totalPagamentos, saldoAnterior } = await this.getSaldoDisponivel(empresaId, dataReferencia);
    
    return {
      suficiente: saldo >= valorPagamento,
      saldoDisponivel: saldo,
      deficit: saldo < valorPagamento ? valorPagamento - saldo : 0,
      detalhes: {
        totalVendas,
        totalPagamentos,
        saldoAnterior
      }
    };
  }
  
  // Gerar nota informativa
  gerarNotaInformativa(pagamento, liquidez) {
    const { saldoDisponivel, deficit, detalhes } = liquidez;
    
    if (liquidez.suficiente) {
      return `Pagamento aprovado. Saldo disponível: ${saldoDisponivel.toLocaleString('pt-AO')} Kz. 
Vendas realizadas: ${detalhes.totalVendas.toLocaleString('pt-AO')} Kz.
Pagamentos efetuados: ${detalhes.totalPagamentos.toLocaleString('pt-AO')} Kz.
Resultado anterior: ${detalhes.saldoAnterior.toLocaleString('pt-AO')} Kz.`;
    } else {
      return `Pagamento pendente por falta de liquidez. Necessário: ${deficit.toLocaleString('pt-AO')} Kz. 
Saldo atual: ${saldoDisponivel.toLocaleString('pt-AO')} Kz.
Vendas realizadas: ${detalhes.totalVendas.toLocaleString('pt-AO')} Kz.
Pagamentos efetuados: ${detalhes.totalPagamentos.toLocaleString('pt-AO')} Kz.
Resultado anterior: ${detalhes.saldoAnterior.toLocaleString('pt-AO')} Kz.`;
    }
  }
  
  // Calcular e atualizar resultado mensal
  async atualizarResultadoMensal(empresaId, ano, mes) {
    try {
      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0);
      
      // Vendas do mês
      const vendas = await Venda.aggregate([
        {
          $match: {
            empresaId: new mongoose.Types.ObjectId(empresaId),
            data: { $gte: dataInicio, $lte: dataFim }
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const totalVendas = vendas[0]?.total || 0;
      
      // Pagamentos do mês
      const pagamentos = await Pagamento.aggregate([
        {
          $match: {
            empresaId: new mongoose.Types.ObjectId(empresaId),
            dataPagamento: { $gte: dataInicio, $lte: dataFim },
            status: 'Pago'
          }
        },
        { $group: { _id: null, total: { $sum: '$valor' } } }
      ]);
      const totalPagamentos = pagamentos[0]?.total || 0;
      
      // Resultado do mês
      const resultadoLiquido = totalVendas - totalPagamentos;
      
      // Buscar resultado anterior acumulado
      const resultadoAnterior = await Resultado.findOne({
        empresaId,
        $or: [
          { ano: ano, mes: { $lt: mes } },
          { ano: { $lt: ano } }
        ]
      }).sort({ ano: -1, mes: -1 });
      
      const saldoAcumulado = (resultadoAnterior?.saldoAcumulado || 0) + resultadoLiquido;
      
      // Atualizar ou criar resultado
      const resultado = await Resultado.findOneAndUpdate(
        { empresaId, ano, mes },
        {
          $set: {
            receitas: { vendas: totalVendas, prestacaoServicos: 0, outros: 0 },
            custos: { mercadorias: 0, pessoal: totalPagamentos, manutencao: 0, abastecimento: 0, outros: 0 },
            resultadoOperacional: resultadoLiquido,
            resultadoLiquido,
            saldoAcumulado,
            updatedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );
      
      return resultado;
    } catch (error) {
      console.error('Erro ao atualizar resultado:', error);
      throw error;
    }
  }
}

module.exports = new LiquidezService();