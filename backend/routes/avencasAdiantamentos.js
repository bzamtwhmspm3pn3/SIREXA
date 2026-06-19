const express = require('express');
const router = express.Router();
const AvencaAdiantamento = require('../models/AvencaAdiantamento');
const Funcionario = require('../models/Funcionario');
const { verifyToken } = require('../middlewares/auth');
const { logMiddleware } = require('../middlewares/logger');

router.use(verifyToken);

router.get('/', logMiddleware('avencas-listar'), async (req, res) => {
  try {
    const { empresaId, funcionarioId, tipo, status, page = 1, limit = 50 } = req.query;

    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }

    const query = { empresaId };
    if (funcionarioId) query.funcionarioId = funcionarioId;
    if (tipo) query.tipo = tipo;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [registos, total] = await Promise.all([
      AvencaAdiantamento.find(query).sort({ dataSolicitacao: -1 }).skip(skip).limit(parseInt(limit)),
      AvencaAdiantamento.countDocuments(query)
    ]);

    res.json({
      sucesso: true,
      dados: registos,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Erro ao listar avenças/adiantamentos:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar registos', erro: error.message });
  }
});

router.post('/', logMiddleware('avencas-criar'), async (req, res) => {
  try {
    const {
      funcionarioId, tipo, valor, motivo, descricao,
      dataVencimento, numeroParcelas, valorParcela, periodicidade,
      status, empresaId
    } = req.body;

    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }
    if (!funcionarioId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID do funcionário é obrigatório' });
    }
    if (!tipo) {
      return res.status(400).json({ sucesso: false, mensagem: 'Tipo é obrigatório (AdiantamentoSalarial ou Avenca)' });
    }
    if (!valor || valor <= 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Valor deve ser maior que zero' });
    }

    const funcionario = await Funcionario.findById(funcionarioId);
    if (!funcionario) {
      return res.status(404).json({ sucesso: false, mensagem: 'Funcionário não encontrado' });
    }

    if (tipo === 'AdiantamentoSalarial' && valor > funcionario.salarioBase * 0.7) {
      return res.status(400).json({
        sucesso: false,
        mensagem: `Adiantamento não pode exceder 70% do salário base (${(funcionario.salarioBase * 0.7).toLocaleString()} Kz)`
      });
    }

    const registro = new AvencaAdiantamento({
      funcionarioId,
      funcionarioNome: funcionario.nome,
      funcionarioNif: funcionario.nif,
      departamento: funcionario.departamento,
      cargo: funcionario.funcao,
      salarioBase: funcionario.salarioBase,
      tipo,
      valor,
      valorPago: 0,
      saldoRestante: valor,
      dataSolicitacao: new Date(),
      dataVencimento: dataVencimento || null,
      numeroParcelas: parseInt(numeroParcelas) || 1,
      parcelaAtual: 0,
      valorParcela: parseFloat(valorParcela) || (parseFloat(valor) / (parseInt(numeroParcelas) || 1)),
      periodicidade: periodicidade || 'Unico',
      motivo: motivo || '',
      descricao: descricao || '',
      status: status || 'Pendente',
      empresaId,
      criadoPor: req.user?.nome,
      criadoPorId: req.user?.id
    });

    await registro.save();

    res.status(201).json({
      sucesso: true,
      mensagem: `${tipo === 'AdiantamentoSalarial' ? 'Adiantamento' : 'Avença'} registado com sucesso!`,
      dados: registro
    });
  } catch (error) {
    console.error('Erro ao criar registo:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar registo', erro: error.message });
  }
});

router.put('/:id', logMiddleware('avencas-atualizar'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updatedAt = new Date();

    if (updates.valorPago !== undefined || updates.valor !== undefined) {
      const registro = await AvencaAdiantamento.findById(id);
      if (registro) {
        const valorTotal = updates.valor || registro.valor;
        const valorPago = updates.valorPago !== undefined ? updates.valorPago : registro.valorPago;
        updates.saldoRestante = valorTotal - valorPago;
        if (updates.saldoRestante <= 0) {
          updates.status = 'Pago';
          updates.dataConclusao = new Date();
        } else if (registro.status === 'Pendente' && valorPago > 0) {
          updates.status = 'EmPagamento';
        }
      }
    }

    if (updates.parcelaAtual !== undefined) {
      const registro = await AvencaAdiantamento.findById(id);
      if (registro) {
        const novaParcela = parseInt(updates.parcelaAtual) || 0;
        if (novaParcela >= (updates.numeroParcelas || registro.numeroParcelas)) {
          updates.status = 'Pago';
          updates.dataConclusao = new Date();
        }
      }
    }

    const registro = await AvencaAdiantamento.findByIdAndUpdate(id, updates, { new: true });
    if (!registro) {
      return res.status(404).json({ sucesso: false, mensagem: 'Registo não encontrado' });
    }

    res.json({ sucesso: true, mensagem: 'Registo atualizado', dados: registro });
  } catch (error) {
    console.error('Erro ao atualizar registo:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar registo', erro: error.message });
  }
});

router.delete('/:id', logMiddleware('avencas-deletar'), async (req, res) => {
  try {
    const registro = await AvencaAdiantamento.findByIdAndDelete(req.params.id);
    if (!registro) {
      return res.status(404).json({ sucesso: false, mensagem: 'Registo não encontrado' });
    }
    res.json({ sucesso: true, mensagem: 'Registo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir registo:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir registo', erro: error.message });
  }
});

router.post('/:id/integrar', logMiddleware('avencas-integrar-folha'), async (req, res) => {
  try {
    const { id } = req.params;
    const { mesReferencia, anoReferencia, valorParcela } = req.body;

    const registro = await AvencaAdiantamento.findById(id);
    if (!registro) {
      return res.status(404).json({ sucesso: false, mensagem: 'Registo não encontrado' });
    }
    if (registro.status === 'Pago' || registro.status === 'Cancelado') {
      return res.status(400).json({ sucesso: false, mensagem: 'Registo já está pago ou cancelado' });
    }

    const valorIntegrar = valorParcela || registro.valorParcela || registro.saldoRestante;
    const novoValorPago = (registro.valorPago || 0) + parseFloat(valorIntegrar);
    const novaParcela = (registro.parcelaAtual || 0) + 1;

    registro.valorPago = novoValorPago;
    registro.saldoRestante = registro.valor - novoValorPago;
    registro.parcelaAtual = novaParcela;
    registro.integradoFolha = true;
    registro.folhaId = req.body.folhaId || null;
    registro.mesReferencia = mesReferencia;
    registro.anoReferencia = anoReferencia;

    if (registro.saldoRestante <= 0 || novaParcela >= registro.numeroParcelas) {
      registro.status = 'Pago';
      registro.dataConclusao = new Date();
    } else {
      registro.status = 'EmPagamento';
    }

    await registro.save();

    res.json({
      sucesso: true,
      mensagem: `${valorIntegrar.toLocaleString()} Kz integrado à folha salarial. Parcela ${novaParcela}/${registro.numeroParcelas}. Saldo restante: ${registro.saldoRestante.toLocaleString()} Kz`,
      dados: registro
    });
  } catch (error) {
    console.error('Erro ao integrar à folha:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao integrar à folha', erro: error.message });
  }
});

router.get('/resumo', logMiddleware('avencas-resumo'), async (req, res) => {
  try {
    const { empresaId } = req.query;
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }

    const [totalAdiantamentos, totalAvencas, resumoStatus, valorPendente] = await Promise.all([
      AvencaAdiantamento.aggregate([
        { $match: { empresaId, tipo: 'AdiantamentoSalarial' } },
        { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$valor' }, valorPago: { $sum: '$valorPago' } } }
      ]),
      AvencaAdiantamento.aggregate([
        { $match: { empresaId, tipo: 'Avenca' } },
        { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$valor' }, valorPago: { $sum: '$valorPago' } } }
      ]),
      AvencaAdiantamento.aggregate([
        { $match: { empresaId } },
        { $group: { _id: '$status', total: { $sum: 1 }, valor: { $sum: '$saldoRestante' } } }
      ]),
      AvencaAdiantamento.aggregate([
        { $match: { empresaId, status: { $in: ['Pendente', 'EmPagamento'] } } },
        { $group: { _id: null, total: { $sum: '$saldoRestante' } } }
      ])
    ]);

    res.json({
      sucesso: true,
      dados: {
        totalAdiantamentos: totalAdiantamentos[0]?.total || 0,
        valorAdiantamentos: totalAdiantamentos[0]?.valor || 0,
        valorAdiantamentosPago: totalAdiantamentos[0]?.valorPago || 0,
        totalAvencas: totalAvencas[0]?.total || 0,
        valorAvencas: totalAvencas[0]?.valor || 0,
        valorAvencasPago: totalAvencas[0]?.valorPago || 0,
        valorPendente: valorPendente[0]?.total || 0,
        porStatus: resumoStatus
      }
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar resumo', erro: error.message });
  }
});

module.exports = router;
