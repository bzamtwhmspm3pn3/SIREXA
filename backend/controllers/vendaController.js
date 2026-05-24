// Adicione estes métodos no final do seu arquivo vendaController.js, antes do module.exports

// ============================================
// GET - Detalhes financeiros da venda
// ============================================
exports.getDetalhesFinanceiros = async (req, res) => {
  try {
    const { id } = req.params;
    
    const venda = await Venda.findById(id).populate('clienteId', 'nome nif telefone email');
    
    if (!venda) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Venda não encontrada' 
      });
    }
    
    const resumoPagamentos = {
      total: venda.total,
      entrada: venda.entrada || 0,
      totalParcelas: venda.parcelas.reduce((sum, p) => sum + p.valor, 0),
      pago: venda.parcelas.reduce((sum, p) => sum + (p.valorPago || 0), 0) + (venda.entrada || 0),
      pendente: venda.valorParcelasRestante || 0,
      percentual: ((venda.parcelas.reduce((sum, p) => sum + (p.valorPago || 0), 0) + (venda.entrada || 0)) / venda.total * 100).toFixed(2)
    };
    
    const parcelasDetalhadas = venda.parcelas.map(p => ({
      numero: p.numero,
      valor: p.valor,
      valorPago: p.valorPago || 0,
      dataVencimento: p.dataVencimento,
      dataPagamento: p.dataPagamento,
      status: p.status,
      diasAtraso: p.status === 'pendente' && new Date(p.dataVencimento) < new Date() 
        ? Math.floor((new Date() - new Date(p.dataVencimento)) / (1000 * 60 * 60 * 24)) 
        : 0
    }));
    
    res.json({
      sucesso: true,
      dados: {
        venda: {
          _id: venda._id,
          numeroFactura: venda.numeroFactura,
          cliente: venda.cliente,
          data: venda.data,
          tipoVenda: venda.tipoVenda,
          status: venda.status
        },
        resumo: resumoPagamentos,
        parcelas: parcelasDetalhadas
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar detalhes financeiros:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar detalhes financeiros',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Serviços por status
// ============================================
exports.getServicosPorStatus = async (req, res) => {
  try {
    const { empresaId, status } = req.params;
    
    const query = {
      empresaId,
      'itens.tipo': 'servico',
      'itens.agendamento': { $exists: true }
    };
    
    if (status && status !== 'todos') {
      query['itens.agendamento.status'] = status;
    }
    
    const vendas = await Venda.find(query).populate('clienteId', 'nome nif telefone');
    
    const servicos = [];
    for (const venda of vendas) {
      for (let idx = 0; idx < venda.itens.length; idx++) {
        const item = venda.itens[idx];
        if (item.tipo === 'servico' && item.agendamento) {
          servicos.push({
            vendaId: venda._id,
            itemIndex: idx,
            numeroFactura: venda.numeroFactura,
            cliente: venda.cliente,
            servico: item.produtoOuServico,
            valor: item.total,
            agendamento: item.agendamento,
            dataVenda: venda.data
          });
        }
      }
    }
    
    // Estatísticas por status
    const stats = {
      agendado: servicos.filter(s => s.agendamento.status === 'agendado').length,
      em_andamento: servicos.filter(s => s.agendamento.status === 'em_andamento').length,
      concluido: servicos.filter(s => s.agendamento.status === 'concluido').length,
      cancelado: servicos.filter(s => s.agendamento.status === 'cancelado').length
    };
    
    res.json({
      sucesso: true,
      dados: servicos,
      estatisticas: stats,
      total: servicos.length
    });
    
  } catch (error) {
    console.error('Erro ao buscar serviços por status:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar serviços',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Resumo financeiro por período
// ============================================
exports.getResumoFinanceiro = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { dataInicio, dataFim, periodo = 'mensal' } = req.query;
    
    const matchQuery = { empresaId: new mongoose.Types.ObjectId(empresaId) };
    
    if (dataInicio && dataFim) {
      matchQuery.data = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }
    
    let groupBy;
    if (periodo === 'diario') {
      groupBy = {
        ano: { $year: '$data' },
        mes: { $month: '$data' },
        dia: { $dayOfMonth: '$data' }
      };
    } else if (periodo === 'anual') {
      groupBy = { ano: { $year: '$data' } };
    } else {
      groupBy = {
        ano: { $year: '$data' },
        mes: { $month: '$data' }
      };
    }
    
    const resultado = await Venda.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: groupBy,
          totalVendas: { $sum: 1 },
          totalFaturado: { $sum: '$total' },
          totalPago: { 
            $sum: { 
              $cond: [
                { $eq: ['$tipoVenda', 'avista'] },
                '$total',
                { $add: ['$entrada', { $sum: '$parcelas.valorPago' }] }
              ]
            }
          },
          totalPendente: { $sum: '$valorParcelasRestante' }
        }
      },
      { $sort: { '_id.ano': 1, '_id.mes': 1, '_id.dia': 1 } }
    ]);
    
    res.json({
      sucesso: true,
      dados: resultado,
      periodo: periodo
    });
    
  } catch (error) {
    console.error('Erro ao buscar resumo financeiro:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar resumo financeiro',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Vendas por período (agrupado)
// ============================================
exports.getVendasPorPeriodo = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { dataInicio, dataFim, grupo = 'dia' } = req.query;
    
    const matchQuery = { empresaId: new mongoose.Types.ObjectId(empresaId) };
    
    if (dataInicio && dataFim) {
      matchQuery.data = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }
    
    let groupBy;
    let format;
    
    if (grupo === 'mes') {
      groupBy = {
        ano: { $year: '$data' },
        mes: { $month: '$data' }
      };
      format = { $concat: [
        { $toString: '$_id.mes' }, '/', { $toString: '$_id.ano' }
      ] };
    } else if (grupo === 'ano') {
      groupBy = { ano: { $year: '$data' } };
      format = { $toString: '$_id.ano' };
    } else {
      groupBy = {
        ano: { $year: '$data' },
        mes: { $month: '$data' },
        dia: { $dayOfMonth: '$data' }
      };
      format = { $concat: [
        { $toString: '$_id.dia' }, '/', { $toString: '$_id.mes' }, '/', { $toString: '$_id.ano' }
      ] };
    }
    
    const resultado = await Venda.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          total: { $sum: '$total' },
          totalAvista: { 
            $sum: { 
              $cond: [{ $eq: ['$tipoVenda', 'avista'] }, '$total', 0] 
            } 
          },
          totalPrazo: { 
            $sum: { 
              $cond: [{ $eq: ['$tipoVenda', 'prazo'] }, '$total', 0] 
            } 
          }
        }
      },
      { $sort: { '_id.ano': 1, '_id.mes': 1, '_id.dia': 1 } },
      {
        $project: {
          periodo: format,
          count: 1,
          total: 1,
          totalAvista: 1,
          totalPrazo: 1
        }
      }
    ]);
    
    res.json({
      sucesso: true,
      dados: resultado
    });
    
  } catch (error) {
    console.error('Erro ao buscar vendas por período:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar vendas por período',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Top clientes
// ============================================
exports.getTopClientes = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { limit = 10 } = req.query;
    
    const resultado = await Venda.aggregate([
      { $match: { empresaId: new mongoose.Types.ObjectId(empresaId) } },
      {
        $group: {
          _id: { clienteId: '$clienteId', nome: '$cliente', nif: '$nifCliente' },
          totalCompras: { $sum: 1 },
          totalGasto: { $sum: '$total' },
          totalPendente: { $sum: '$valorParcelasRestante' }
        }
      },
      { $sort: { totalGasto: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          cliente: '$_id.nome',
          nif: '$_id.nif',
          clienteId: '$_id.clienteId',
          totalCompras: 1,
          totalGasto: 1,
          totalPendente: 1,
          ticketMedio: { $divide: ['$totalGasto', '$totalCompras'] }
        }
      }
    ]);
    
    res.json({
      sucesso: true,
      dados: resultado
    });
    
  } catch (error) {
    console.error('Erro ao buscar top clientes:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar top clientes',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Top produtos/serviços mais vendidos
// ============================================
exports.getTopProdutos = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { limit = 10, tipo = 'todos' } = req.query;
    
    const matchQuery = { empresaId: new mongoose.Types.ObjectId(empresaId) };
    if (tipo !== 'todos') {
      matchQuery['itens.tipo'] = tipo;
    }
    
    const resultado = await Venda.aggregate([
      { $match: matchQuery },
      { $unwind: '$itens' },
      { $match: tipo !== 'todos' ? { 'itens.tipo': tipo } : {} },
      {
        $group: {
          _id: {
            produtoId: '$itens.produtoId',
            nome: '$itens.produtoOuServico',
            tipo: '$itens.tipo'
          },
          quantidadeTotal: { $sum: '$itens.quantidade' },
          valorTotal: { $sum: '$itens.total' },
          numeroVendas: { $sum: 1 }
        }
      },
      { $sort: { valorTotal: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          produto: '$_id.nome',
          produtoId: '$_id.produtoId',
          tipo: '$_id.tipo',
          quantidadeTotal: 1,
          valorTotal: 1,
          numeroVendas: 1,
          ticketMedio: { $divide: ['$valorTotal', '$numeroVendas'] }
        }
      }
    ]);
    
    res.json({
      sucesso: true,
      dados: resultado
    });
    
  } catch (error) {
    console.error('Erro ao buscar top produtos:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar top produtos',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Dashboard (cards com indicadores)
// ============================================
exports.getDashboard = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { ano = new Date().getFullYear(), mes = new Date().getMonth() + 1 } = req.query;
    
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0);
    
    const vendasMes = await Venda.aggregate([
      { 
        $match: { 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          data: { $gte: dataInicio, $lte: dataFim }
        } 
      },
      {
        $group: {
          _id: null,
          totalFaturado: { $sum: '$total' },
          totalVendas: { $sum: 1 },
          totalPago: { 
            $sum: { 
              $cond: [
                { $eq: ['$tipoVenda', 'avista'] },
                '$total',
                { $add: ['$entrada', { $sum: '$parcelas.valorPago' }] }
              ]
            }
          },
          vendasAvista: { $sum: { $cond: [{ $eq: ['$tipoVenda', 'avista'] }, 1, 0] } },
          vendasPrazo: { $sum: { $cond: [{ $eq: ['$tipoVenda', 'prazo'] }, 1, 0] } }
        }
      }
    ]);
    
    const parcelasAVencer = await Venda.aggregate([
      { 
        $match: { 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          tipoVenda: 'prazo',
          'parcelas.status': 'pendente'
        } 
      },
      { $unwind: '$parcelas' },
      { $match: { 'parcelas.status': 'pendente' } },
      {
        $group: {
          _id: null,
          totalPendente: { $sum: { $subtract: ['$parcelas.valor', '$parcelas.valorPago'] } },
          parcelasCount: { $sum: 1 },
          parcelasAtrasadas: { 
            $sum: { 
              $cond: [{ $lt: ['$parcelas.dataVencimento', new Date()] }, 1, 0] 
            } 
          }
        }
      }
    ]);
    
    const servicosPendentes = await Venda.countDocuments({
      empresaId: new mongoose.Types.ObjectId(empresaId),
      'itens.tipo': 'servico',
      'itens.agendamento.status': { $in: ['agendado', 'em_andamento'] }
    });
    
    res.json({
      sucesso: true,
      dados: {
        mesAtual: {
          faturamento: vendasMes[0]?.totalFaturado || 0,
          totalVendas: vendasMes[0]?.totalVendas || 0,
          totalRecebido: vendasMes[0]?.totalPago || 0,
          vendasAvista: vendasMes[0]?.vendasAvista || 0,
          vendasPrazo: vendasMes[0]?.vendasPrazo || 0
        },
        carteiraPendente: {
          totalPendente: parcelasAVencer[0]?.totalPendente || 0,
          parcelasCount: parcelasAVencer[0]?.parcelasCount || 0,
          parcelasAtrasadas: parcelasAVencer[0]?.parcelasAtrasadas || 0
        },
        servicosPendentes: servicosPendentes
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar dashboard',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Fluxo de caixa (previsão de recebimentos)
// ============================================
exports.getFluxoCaixa = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { meses = 6 } = req.query;
    
    const hoje = new Date();
    const dataFim = new Date();
    dataFim.setMonth(hoje.getMonth() + parseInt(meses));
    
    const parcelas = await Venda.aggregate([
      { 
        $match: { 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          tipoVenda: 'prazo',
          'parcelas.status': 'pendente'
        } 
      },
      { $unwind: '$parcelas' },
      { $match: { 'parcelas.status': 'pendente' } },
      {
        $project: {
          valorPendente: { $subtract: ['$parcelas.valor', '$parcelas.valorPago'] },
          dataVencimento: '$parcelas.dataVencimento',
          cliente: '$cliente',
          numeroFactura: '$numeroFactura'
        }
      }
    ]);
    
    // Agrupar por mês
    const previsao = {};
    for (const parcela of parcelas) {
      const data = new Date(parcela.dataVencimento);
      if (data <= dataFim) {
        const key = `${data.getFullYear()}-${data.getMonth() + 1}`;
        if (!previsao[key]) {
          previsao[key] = {
            ano: data.getFullYear(),
            mes: data.getMonth() + 1,
            valorTotal: 0,
            parcelas: []
          };
        }
        previsao[key].valorTotal += parcela.valorPendente;
        previsao[key].parcelas.push(parcela);
      }
    }
    
    const resultado = Object.values(previsao).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    });
    
    res.json({
      sucesso: true,
      dados: resultado,
      totalPrevisao: parcelas.reduce((sum, p) => sum + p.valorPendente, 0)
    });
    
  } catch (error) {
    console.error('Erro ao buscar fluxo de caixa:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar fluxo de caixa',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Previsão de recebimento
// ============================================
exports.getPrevisaoRecebimento = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { dias = 30 } = req.query;
    
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + parseInt(dias));
    
    const parcelas = await Venda.aggregate([
      { 
        $match: { 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          tipoVenda: 'prazo',
          'parcelas.status': 'pendente'
        } 
      },
      { $unwind: '$parcelas' },
      { 
        $match: { 
          'parcelas.status': 'pendente',
          'parcelas.dataVencimento': { $lte: dataLimite }
        } 
      },
      {
        $project: {
          valorPendente: { $subtract: ['$parcelas.valor', '$parcelas.valorPago'] },
          dataVencimento: '$parcelas.dataVencimento',
          cliente: '$cliente',
          numeroFactura: '$numeroFactura',
          parcelaNumero: '$parcelas.numero'
        }
      },
      { $sort: { dataVencimento: 1 } }
    ]);
    
    const totalProximo = parcelas
      .filter(p => new Date(p.dataVencimento) <= dataLimite)
      .reduce((sum, p) => sum + p.valorPendente, 0);
    
    const totalAtrasado = parcelas
      .filter(p => new Date(p.dataVencimento) < hoje)
      .reduce((sum, p) => sum + p.valorPendente, 0);
    
    res.json({
      sucesso: true,
      dados: parcelas,
      resumo: {
        totalProximo: totalProximo,
        totalAtrasado: totalAtrasado,
        quantidadeParcelas: parcelas.length,
        periodoDias: parseInt(dias)
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar previsão de recebimento:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar previsão de recebimento',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Relatório de inadimplência
// ============================================
exports.getRelatorioInadimplencia = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { diasAtraso = 30 } = req.query;
    
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() - parseInt(diasAtraso));
    
    const vendas = await Venda.find({
      empresaId,
      tipoVenda: 'prazo',
      status: { $in: ['parcialmente_paga', 'pendente'] }
    }).populate('clienteId', 'nome nif telefone email');
    
    const inadimplentes = [];
    for (const venda of vendas) {
      const parcelasAtrasadas = venda.parcelas.filter(p => 
        p.status === 'pendente' && new Date(p.dataVencimento) < dataLimite
      );
      
      if (parcelasAtrasadas.length > 0) {
        const valorAtrasado = parcelasAtrasadas.reduce((sum, p) => sum + (p.valor - (p.valorPago || 0)), 0);
        const diasMaiorAtraso = Math.max(...parcelasAtrasadas.map(p => 
          Math.floor((hoje - new Date(p.dataVencimento)) / (1000 * 60 * 60 * 24))
        ));
        
        inadimplentes.push({
          vendaId: venda._id,
          numeroFactura: venda.numeroFactura,
          cliente: venda.cliente,
          clienteDetalhes: venda.clienteId,
          totalVenda: venda.total,
          valorAtrasado,
          parcelasAtrasadas: parcelasAtrasadas.length,
          diasMaiorAtraso,
          parcelas: parcelasAtrasadas.map(p => ({
            numero: p.numero,
            valor: p.valor,
            valorPago: p.valorPago || 0,
            dataVencimento: p.dataVencimento,
            diasAtraso: Math.floor((hoje - new Date(p.dataVencimento)) / (1000 * 60 * 60 * 24))
          }))
        });
      }
    }
    
    inadimplentes.sort((a, b) => b.diasMaiorAtraso - a.diasMaiorAtraso);
    
    res.json({
      sucesso: true,
      dados: inadimplentes,
      resumo: {
        totalInadimplentes: inadimplentes.length,
        valorTotalAtrasado: inadimplentes.reduce((sum, i) => sum + i.valorAtrasado, 0),
        mediaDiasAtraso: inadimplentes.length > 0 
          ? Math.round(inadimplentes.reduce((sum, i) => sum + i.diasMaiorAtraso, 0) / inadimplentes.length)
          : 0
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar relatório de inadimplência:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar relatório de inadimplência',
      erro: error.message 
    });
  }
};

// ============================================
// POST - Renegociar parcelas
// ============================================
exports.renegociarParcelas = async (req, res) => {
  try {
    const { id } = req.params;
    const { novasParcelas, novaEntrada, novaDataPrimeiraParcela, justificativa } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    const venda = await Venda.findById(id);
    
    if (!venda) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Venda não encontrada' 
      });
    }
    
    if (venda.tipoVenda !== 'prazo') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Esta venda não é a prazo' 
      });
    }
    
    const saldoRestante = venda.getValorPendente ? venda.getValorPendente() : venda.valorParcelasRestante;
    
    // Registrar renegociação
    venda.historicoRenegociacoes = venda.historicoRenegociacoes || [];
    venda.historicoRenegociacoes.push({
      data: new Date(),
      usuario,
      justificativa,
      parcelasAnteriores: [...venda.parcelas],
      novaEntrada: novaEntrada || venda.entrada,
      novasParcelas: novasParcelas
    });
    
    // Atualizar parcelas
    if (novaEntrada !== undefined) {
      venda.entrada = novaEntrada;
    }
    
    if (novasParcelas && novasParcelas.length > 0) {
      const novasParcelasFormatadas = novasParcelas.map((p, idx) => ({
        numero: idx + 1,
        valor: p.valor,
        dataVencimento: new Date(p.dataVencimento),
        status: 'pendente',
        valorPago: 0,
        juros: p.juros || 0
      }));
      
      venda.parcelas = novasParcelasFormatadas;
      venda.valorParcelasRestante = novasParcelasFormatadas.reduce((sum, p) => sum + p.valor, 0);
      venda.numeroParcelas = novasParcelasFormatadas.length;
    }
    
    if (novaDataPrimeiraParcela) {
      venda.dataPrimeiraParcela = new Date(novaDataPrimeiraParcela);
    }
    
    venda.status = 'pendente';
    await venda.save();
    
    res.json({
      sucesso: true,
      mensagem: 'Parcelas renegociadas com sucesso',
      dados: {
        venda,
        saldoRestanteAnterior: saldoRestante,
        novoSaldo: venda.valorParcelasRestante
      }
    });
    
  } catch (error) {
    console.error('Erro ao renegociar parcelas:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao renegociar parcelas',
      erro: error.message 
    });
  }
};

// ============================================
// POST - Pagar múltiplas parcelas
// ============================================
exports.pagarMultiplasParcelas = async (req, res) => {
  try {
    const { id } = req.params;
    const { parcelasNumeros, valorTotal, formaPagamento, contaBancaria } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    const venda = await Venda.findById(id);
    
    if (!venda) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Venda não encontrada' 
      });
    }
    
    if (venda.tipoVenda !== 'prazo') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Esta venda não é a prazo' 
      });
    }
    
    const parcelasPagas = [];
    let totalPago = 0;
    
    for (const parcelaNum of parcelasNumeros) {
      const parcela = venda.parcelas.find(p => p.numero === parcelaNum);
      
      if (!parcela) {
        return res.status(404).json({ 
          sucesso: false, 
          mensagem: `Parcela ${parcelaNum} não encontrada` 
        });
      }
      
      if (parcela.status === 'pago') {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: `Parcela ${parcelaNum} já foi paga` 
        });
      }
      
      const valorDevido = parcela.valor - (parcela.valorPago || 0);
      totalPago += valorDevido;
      
      parcela.valorPago = parcela.valor;
      parcela.dataPagamento = new Date();
      parcela.formaPagamento = formaPagamento || parcela.formaPagamento;
      parcela.contaBancaria = contaBancaria || parcela.contaBancaria;
      parcela.usuario = usuario;
      parcela.status = 'pago';
      
      parcelasPagas.push(parcelaNum);
    }
    
    venda.valorParcelasRestante = venda.parcelas
      .filter(p => p.status === 'pendente')
      .reduce((sum, p) => sum + (p.valor - (p.valorPago || 0)), 0);
    
    const todasPagas = venda.parcelas.every(p => p.status === 'pago');
    if (todasPagas) {
      venda.status = 'finalizada';
    } else if (venda.parcelas.some(p => p.status === 'pago')) {
      venda.status = 'parcialmente_paga';
    }
    
    await venda.save();
    
    // Criar registo bancário do pagamento múltiplo
    const empresa = await Empresa.findById(venda.empresaId);
    if (empresa && formaPagamento !== 'Dinheiro' && contaBancaria) {
      const registo = new RegistoBancario({
        data: new Date(),
        conta: contaBancaria,
        descricao: `PAGAMENTO MÚLTIPLO - ${parcelasPagas.length} parcelas - Factura Nº ${venda.numeroFactura} - ${venda.cliente}`,
        tipo: 'Receita - Parcelas',
        valor: totalPago,
        entradaSaida: 'entrada',
        ano: new Date().getFullYear(),
        mes: meses[new Date().getMonth()],
        documentoReferencia: venda._id.toString(),
        reconcilado: false,
        empresaId: empresa._id
      });
      await registo.save();
    }
    
    res.json({
      sucesso: true,
      mensagem: `${parcelasPagas.length} parcela(s) paga(s) com sucesso!`,
      dados: {
        venda,
        parcelasPagas,
        totalPago
      }
    });
    
  } catch (error) {
    console.error('Erro ao pagar múltiplas parcelas:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao pagar múltiplas parcelas',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Extrato do cliente
// ============================================
exports.getExtratoCliente = async (req, res) => {
  try {
    const { empresaId, clienteId } = req.params;
    
    const vendas = await Venda.find({
      empresaId,
      clienteId: new mongoose.Types.ObjectId(clienteId)
    }).sort({ data: -1 });
    
    const extrato = [];
    
    for (const venda of vendas) {
      // Adicionar entrada da venda
      extrato.push({
        data: venda.data,
        tipo: 'VENDA',
        descricao: `Factura Nº ${venda.numeroFactura}`,
        valor: venda.total,
        tipoVenda: venda.tipoVenda,
        saldo: 0
      });
      
      // Adicionar pagamentos de parcelas
      if (venda.tipoVenda === 'prazo') {
        for (const parcela of venda.parcelas) {
          if (parcela.status === 'pago' && parcela.valorPago > 0) {
            extrato.push({
              data: parcela.dataPagamento || parcela.dataVencimento,
              tipo: 'PAGAMENTO',
              descricao: `Pagamento Parcela ${parcela.numero} - Factura Nº ${venda.numeroFactura}`,
              valor: -parcela.valorPago,
              tipoVenda: venda.tipoVenda,
              saldo: 0
            });
          }
        }
      }
    }
    
    // Ordenar por data
    extrato.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    // Calcular saldo corrente
    let saldo = 0;
    for (const item of extrato) {
      saldo += item.valor;
      item.saldo = saldo;
    }
    
    // Calcular resumo
    const resumo = {
      totalCompras: vendas.reduce((sum, v) => sum + v.total, 0),
      totalPago: vendas.reduce((sum, v) => {
        if (v.tipoVenda === 'avista') return sum + v.total;
        const pagoParcelas = v.parcelas.reduce((s, p) => s + (p.valorPago || 0), 0);
        return sum + (v.entrada || 0) + pagoParcelas;
      }, 0),
      saldoDevedor: vendas.reduce((sum, v) => {
        if (v.tipoVenda === 'avista') return sum;
        return sum + (v.valorParcelasRestante || 0);
      }, 0),
      totalVendas: vendas.length
    };
    
    res.json({
      sucesso: true,
      dados: extrato,
      resumo
    });
    
  } catch (error) {
    console.error('Erro ao buscar extrato do cliente:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar extrato do cliente',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Exportar vendas a prazo
// ============================================
exports.exportarVendasPrazo = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { formato = 'csv' } = req.query;
    
    const vendas = await Venda.find({
      empresaId,
      tipoVenda: 'prazo'
    }).populate('clienteId', 'nome nif telefone');
    
    if (formato === 'csv') {
      let csv = 'Factura,Cliente,NIF,Total,Entrada,ValorParcelas,ParcelasPagas,ParcelasPendentes,Status\n';
      
      for (const venda of vendas) {
        const parcelasPagas = venda.parcelas.filter(p => p.status === 'pago').length;
        const parcelasPendentes = venda.parcelas.filter(p => p.status === 'pendente').length;
        
        csv += `"${venda.numeroFactura}","${venda.cliente}","${venda.nifCliente}",${venda.total},${venda.entrada || 0},${venda.valorParcelasRestante},${parcelasPagas},${parcelasPendentes},"${venda.status}"\n`;
      }
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=vendas_prazo_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }
    
    res.json({
      sucesso: true,
      dados: vendas
    });
    
  } catch (error) {
    console.error('Erro ao exportar vendas a prazo:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao exportar vendas a prazo',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Exportar serviços agendados
// ============================================
exports.exportarServicosAgendados = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { formato = 'csv' } = req.query;
    
    const vendas = await Venda.find({
      empresaId,
      'itens.tipo': 'servico',
      'itens.agendamento': { $exists: true }
    });
    
    const servicos = [];
    for (const venda of vendas) {
      for (const item of venda.itens) {
        if (item.tipo === 'servico' && item.agendamento) {
          servicos.push({
            factura: venda.numeroFactura,
            cliente: venda.cliente,
            servico: item.produtoOuServico,
            valor: item.total,
            dataAgendamento: item.agendamento.dataInicio,
            status: item.agendamento.status,
            tecnico: item.agendamento.tecnicoResponsavel,
            endereco: item.agendamento.enderecoServico
          });
        }
      }
    }
    
    if (formato === 'csv') {
      let csv = 'Factura,Cliente,Serviço,Valor,Data Agendamento,Status,Técnico,Endereço\n';
      
      for (const servico of servicos) {
        csv += `"${servico.factura}","${servico.cliente}","${servico.servico}",${servico.valor},"${new Date(servico.dataAgendamento).toLocaleString()}","${servico.status}","${servico.tecnico || ''}","${servico.endereco || ''}"\n`;
      }
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=servicos_agendados_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }
    
    res.json({
      sucesso: true,
      dados: servicos
    });
    
  } catch (error) {
    console.error('Erro ao exportar serviços agendados:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao exportar serviços agendados',
      erro: error.message 
    });
  }
};

// ============================================
// GET - Exportar extrato do cliente
// ============================================
exports.exportarExtratoCliente = async (req, res) => {
  try {
    const { empresaId, clienteId } = req.params;
    const { formato = 'csv' } = req.query;
    
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Cliente não encontrado' 
      });
    }
    
    const vendas = await Venda.find({
      empresaId,
      clienteId: new mongoose.Types.ObjectId(clienteId)
    }).sort({ data: 1 });
    
    const extrato = [];
    for (const venda of vendas) {
      extrato.push({
        data: venda.data,
        tipo: 'VENDA',
        descricao: `Factura Nº ${venda.numeroFactura}`,
        valor: venda.total,
        tipoVenda: venda.tipoVenda
      });
      
      if (venda.tipoVenda === 'prazo') {
        for (const parcela of venda.parcelas) {
          if (parcela.status === 'pago' && parcela.valorPago > 0) {
            extrato.push({
              data: parcela.dataPagamento || parcela.dataVencimento,
              tipo: 'PAGAMENTO',
              descricao: `Pagamento Parcela ${parcela.numero}`,
              valor: -parcela.valorPago,
              tipoVenda: venda.tipoVenda
            });
          }
        }
      }
    }
    
    extrato.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    let saldo = 0;
    for (const item of extrato) {
      saldo += item.valor;
      item.saldo = saldo;
    }
    
    if (formato === 'csv') {
      let csv = 'Data,Tipo,Descrição,Valor,Saldo\n';
      
      for (const item of extrato) {
        csv += `"${new Date(item.data).toLocaleDateString()}","${item.tipo}","${item.descricao}",${item.valor},${item.saldo}\n`;
      }
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=extrato_${cliente.nome}_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }
    
    res.json({
      sucesso: true,
      dados: extrato,
      cliente: {
        nome: cliente.nome,
        nif: cliente.nif
      }
    });
    
  } catch (error) {
    console.error('Erro ao exportar extrato do cliente:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao exportar extrato do cliente',
      erro: error.message 
    });
  }
};