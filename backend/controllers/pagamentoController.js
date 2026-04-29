// backend/controllers/pagamentoController.js - VERSÃO COMPLETA E CORRIGIDA
const mongoose = require('mongoose');
const Pagamento = require('../models/Pagamento');
const Banco = require('../models/Banco');
const Empresa = require('../models/Empresa');
const RegistoBancario = require('../models/RegistoBancario');
const Transferencia = require('../models/Transferencia');
const contaCorrenteController = require('./contaCorrenteController');

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// ==================== FUNÇÕES AUXILIARES ====================

// Função para criar registo bancário do pagamento (SAÍDA)
async function criarRegistoBancarioPagamento(pagamento, empresa, contaDebito) {
  try {
    const dataPagamento = new Date(pagamento.dataPagamento || pagamento.dataVencimento || new Date());
    const ano = dataPagamento.getFullYear();
    const mes = meses[dataPagamento.getMonth()];
    
    const banco = await Banco.findOne({ codNome: contaDebito, empresaId: empresa._id });
    
    let tipoRegisto = 'Despesa - Outros';
    const categoria = pagamento.categoria || pagamento.tipo || '';
    
    if (categoria === 'Fornecedor' || categoria === 'Fornecedores') {
      tipoRegisto = 'Despesa - Fornecedor';
    } else if (categoria === 'Folha Salarial') {
      tipoRegisto = 'Despesa - Salário';
    } else if (categoria === 'Imposto') {
      tipoRegisto = 'Despesa - Imposto';
    } else if (categoria === 'Manutenção') {
      tipoRegisto = 'Despesa - Manutenção';
    } else if (categoria === 'Abastecimento') {
      tipoRegisto = 'Despesa - Abastecimento';
    } else if (categoria === 'Investimento') {
      tipoRegisto = 'Despesa - Investimento';
    } else if (categoria === 'Financiamento') {
      tipoRegisto = 'Despesa - Financiamento';
    } else if (pagamento.formaPagamento === 'Transferência Bancária') {
      tipoRegisto = 'Despesa - Transferência';
    }
    
    const registo = new RegistoBancario({
      data: dataPagamento,
      conta: contaDebito,
      contaId: banco?._id,
      descricao: `PAGAMENTO: ${pagamento.referencia} - ${pagamento.beneficiario}`,
      tipo: tipoRegisto,
      valor: pagamento.valor,
      entradaSaida: 'saida',
      ano,
      mes,
      documentoReferencia: pagamento._id.toString(),
      reconcilado: false,
      empresaId: empresa._id
    });
    
    await registo.save();
    console.log(`✅ Registo bancário criado para pagamento ${pagamento._id}: ${pagamento.valor} Kz na conta ${contaDebito}`);
    return registo;
  } catch (error) {
    console.error('Erro ao criar registo bancário:', error);
    return null;
  }
}

// Função para calcular saldo disponível de uma conta específica
async function calcularSaldoConta(codNome, empresaId) {
  try {
    const entradasTransferencias = await Transferencia.find({ empresaId, contaCreditar: codNome });
    const entradasVendas = await RegistoBancario.find({ 
      empresaId, 
      conta: codNome,
      entradaSaida: 'entrada'
    });
    const saidasTransferencias = await Transferencia.find({ empresaId, contaDebitar: codNome });
    const saidasPagamentos = await RegistoBancario.find({ 
      empresaId, 
      conta: codNome,
      entradaSaida: 'saida'
    });
    
    const totalEntradas = entradasTransferencias.reduce((sum, t) => sum + (t.valorCreditar || 0), 0) +
                         entradasVendas.reduce((sum, r) => sum + (r.valor || 0), 0);
    
    const totalSaidas = saidasTransferencias.reduce((sum, t) => sum + (t.valorDebitar || 0), 0) +
                       saidasPagamentos.reduce((sum, r) => sum + (r.valor || 0), 0);
    
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

// Gerar referência única para pagamento
async function gerarReferenciaUnica(tipo, empresaId) {
  const ano = new Date().getFullYear();
  const mes = String(new Date().getMonth() + 1).padStart(2, '0');
  const prefixo = (tipo || 'OUT').substring(0, 3).toUpperCase();
  
  const ultimoPagamento = await Pagamento.findOne({ 
    empresaId,
    referencia: { $regex: `^${prefixo}-${ano}${mes}` }
  }).sort({ referencia: -1 });
  
  let sequencial = 1;
  if (ultimoPagamento && ultimoPagamento.referencia) {
    const partes = ultimoPagamento.referencia.split('-');
    if (partes.length >= 3) {
      sequencial = parseInt(partes[2]) + 1;
    }
  }
  
  let referencia = `${prefixo}-${ano}${mes}-${String(sequencial).padStart(4, '0')}`;
  
  let existe = await Pagamento.findOne({ referencia, empresaId });
  while (existe) {
    sequencial++;
    referencia = `${prefixo}-${ano}${mes}-${String(sequencial).padStart(4, '0')}`;
    existe = await Pagamento.findOne({ referencia, empresaId });
  }
  
  return referencia;
}

// ==================== FUNÇÕES EXPORTADAS ====================

// Listar contas bancárias disponíveis para débito
exports.listarContasDebito = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const bancos = await Banco.find({ empresaId, ativo: true });
    
    const contasComSaldo = await Promise.all(bancos.map(async (banco) => {
      const saldo = await calcularSaldoConta(banco.codNome, empresaId);
      return {
        _id: banco._id,
        codNome: banco.codNome,
        nome: banco.nome,
        iban: banco.iban,
        saldoDisponivel: saldo,
        moeda: banco.moeda || 'AOA'
      };
    }));
    
    res.json({ sucesso: true, dados: contasComSaldo });
  } catch (error) {
    console.error('Erro ao listar contas débito:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Obter saldo de uma conta específica
exports.getSaldoConta = async (req, res) => {
  try {
    const { empresaId, codNome } = req.query;
    
    if (!empresaId || !codNome) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa e código da conta são obrigatórios' });
    }
    
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
    console.error('Erro ao obter saldo da conta:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Listar pagamentos com filtros
exports.listarPagamentos = async (req, res) => {
  try {
    const { empresaId, status, tipo, categoria, dataInicio, dataFim, busca, page = 1, limit = 20 } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const query = { empresaId };
    if (status && status !== 'Todos') query.status = status;
    if (tipo && tipo !== 'Todos') query.tipo = tipo;
    if (categoria && categoria !== 'Todos') query.categoria = categoria;
    if (busca && busca.trim() !== '') {
      query.$or = [
        { beneficiario: { $regex: busca, $options: 'i' } },
        { referencia: { $regex: busca, $options: 'i' } },
        { descricao: { $regex: busca, $options: 'i' } }
      ];
    }
    if (dataInicio && dataFim) {
      query.dataVencimento = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }
    
    const pagamentos = await Pagamento.find(query)
      .sort({ dataVencimento: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    const total = await Pagamento.countDocuments(query);
    
    const hoje = new Date();
    for (const pag of pagamentos) {
      if (pag.status === 'Pendente' && new Date(pag.dataVencimento) < hoje) {
        pag.status = 'Atrasado';
        await pag.save();
      }
    }
    
    const saldoTotal = await calcularSaldoTotalEmpresa(empresaId);
    
    res.json({
      sucesso: true,
      dados: pagamentos,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit)),
      saldoDisponivel: saldoTotal
    });
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const query = { empresaId };
    const saldoTotal = await calcularSaldoTotalEmpresa(empresaId);
    
    const totalPendente = await Pagamento.aggregate([
      { $match: { ...query, status: { $in: ['Pendente', 'Atrasado'] } } },
      { $group: { _id: null, total: { $sum: '$valor' } } }
    ]);
    
    const totalPago = await Pagamento.aggregate([
      { $match: { ...query, status: 'Pago' } },
      { $group: { _id: null, total: { $sum: '$valor' } } }
    ]);
    
    const hoje = new Date();
    const atrasados = await Pagamento.countDocuments({
      ...query,
      status: { $in: ['Pendente', 'Aguardando Aprovação'] },
      dataVencimento: { $lt: hoje }
    });
    
    const totalPagamentos = await Pagamento.countDocuments(query);
    
    const pagamentosPorCategoria = await Pagamento.aggregate([
      { $match: query },
      { $group: { _id: '$categoria', total: { $sum: 1 }, valor: { $sum: '$valor' } } }
    ]);
    
    const pagamentosPorTipo = await Pagamento.aggregate([
      { $match: query },
      { $group: { _id: '$tipo', total: { $sum: 1 }, valor: { $sum: '$valor' } } }
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        saldoDisponivel: saldoTotal,
        totalPendente: totalPendente[0]?.total || 0,
        totalPago: totalPago[0]?.total || 0,
        atrasados,
        totalPagamentos,
        pagamentosPorCategoria: pagamentosPorCategoria.map(p => ({
          categoria: p._id,
          quantidade: p.total,
          valor: p.valor
        })),
        pagamentosPorTipo: pagamentosPorTipo.map(p => ({
          tipo: p._id,
          quantidade: p.total,
          valor: p.valor
        }))
      }
    });
  } catch (error) {
    console.error('Erro ao obter dashboard:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Buscar pagamentos de folha salarial
exports.buscarPagamentosFolha = async (req, res) => {
  try {
    const { empresaId, mes, ano } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const query = { 
      empresaId, 
      tipo: 'Folha Salarial',
      status: 'Pago'
    };
    
    if (mes && ano) {
      const dataInicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      const dataFim = new Date(parseInt(ano), parseInt(mes), 0);
      query.dataPagamento = { $gte: dataInicio, $lte: dataFim };
    }
    
    const pagamentos = await Pagamento.find(query).sort({ dataPagamento: -1 });
    
    const totalFolha = pagamentos.reduce((sum, p) => sum + (p.valor || 0), 0);
    
    res.json({
      sucesso: true,
      dados: pagamentos,
      totalFolha,
      quantidade: pagamentos.length
    });
  } catch (error) {
    console.error('Erro ao buscar pagamentos de folha:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Obter próximos pagamentos
exports.getProximosPagamentos = async (req, res) => {
  try {
    const { empresaId, dias = 30 } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + parseInt(dias));
    
    const query = {
      empresaId,
      status: { $in: ['Pendente', 'Aguardando Aprovação'] },
      dataVencimento: { $gte: hoje, $lte: dataLimite }
    };
    
    const pagamentos = await Pagamento.find(query).sort({ dataVencimento: 1 }).limit(50);
    const totalValor = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    
    res.json({
      sucesso: true,
      dados: {
        pagamentos,
        total: pagamentos.length,
        totalValor,
        dias: parseInt(dias)
      }
    });
  } catch (error) {
    console.error('Erro ao obter próximos pagamentos:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Criar pagamento manual - VERSÃO CORRIGIDA
exports.criarPagamentoManual = async (req, res) => {
  try {
    const { 
      beneficiario, valor, dataVencimento, tipo, categoria, subtipo, descricao, 
      empresaId, formaPagamento, observacao, comprovativo, referenciaBancaria,
      contaDebito, contaDebitoId, ibanDebito,
      parcelas, parcelaAtual, juros, taxaJuros, garantia, contrato, dataPagamento,
      status, retencaoFonte, valorLiquido
    } = req.body;
    
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    if (!beneficiario || !valor || !dataVencimento || !empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Campos obrigatórios: beneficiário, valor, data de vencimento e empresa' 
      });
    }
    
    if (!contaDebito) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Selecione a conta bancária para débito' 
      });
    }
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    const saldoConta = await calcularSaldoConta(contaDebito, empresaId);
    if (saldoConta < parseFloat(valor)) {
      const banco = await Banco.findOne({ codNome: contaDebito, empresaId });
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Saldo insuficiente na conta ${banco?.nome || contaDebito}. Disponível: ${saldoConta.toLocaleString()} Kz` 
      });
    }
    
    const referencia = await gerarReferenciaUnica(tipo, empresaId);
    
    const pagamentoData = {
      referencia,
      tipo: tipo || 'Outro',
      categoria: categoria || tipo || 'Operacional',
      subtipo: subtipo || '',
      empresaId,
      beneficiario,
      valor: parseFloat(valor),
      valorBruto: parseFloat(valor),
      saldo: parseFloat(valor),
      dataVencimento: new Date(dataVencimento),
      descricao: descricao || '',
      observacao: observacao || '',
      formaPagamento: formaPagamento || 'Transferência Bancária',
      contaDebito,
      contaDebitoId,
      ibanDebito,
      criadoPor: usuario,
      status: status || 'Pendente'
    };
    
    if (tipo === 'Fornecedor' && retencaoFonte) {
      pagamentoData.retencaoFonte = parseFloat(retencaoFonte);
      pagamentoData.valorLiquido = parseFloat(valorLiquido) || parseFloat(valor) - parseFloat(retencaoFonte);
    }
    
    if (dataPagamento) pagamentoData.dataPagamento = new Date(dataPagamento);
    if (comprovativo) pagamentoData.comprovativo = comprovativo;
    if (referenciaBancaria) pagamentoData.referenciaBancaria = referenciaBancaria;
    
    if (parcelas) pagamentoData.parcelas = parseInt(parcelas);
    if (parcelaAtual) pagamentoData.parcelaAtual = parseInt(parcelaAtual);
    if (juros) pagamentoData.juros = parseFloat(juros);
    if (taxaJuros) pagamentoData.taxaJuros = parseFloat(taxaJuros);
    if (garantia) pagamentoData.garantia = garantia;
    if (contrato) pagamentoData.contrato = contrato;
    
    const pagamento = new Pagamento(pagamentoData);
    await pagamento.save();
    
    console.log(`✅ Pagamento criado: ${pagamento.referencia} - Conta Débito: ${contaDebito}`);
    
    // Só processa se for pagamento imediato
    if (status === 'Pago') {
      await criarRegistoBancarioPagamento(pagamento, empresa, contaDebito);
      // 🔥 ATUALIZA CONTA CORRENTE
      await contaCorrenteController.atualizarContaAposPagamento(pagamento, empresaId);
    }
    
    res.status(201).json({
      sucesso: true,
      mensagem: `Pagamento ${referencia} criado com sucesso`,
      dados: pagamento
    });
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        sucesso: false, 
        mensagem: 'Erro de referência duplicada. Tente novamente.' 
      });
    }
    
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Atualizar status do pagamento (rota principal)
exports.atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, dataPagamento, comprovativo, motivoStatus } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    const pagamento = await Pagamento.findById(id);
    if (!pagamento) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pagamento não encontrado' });
    }
    
    const empresa = await Empresa.findById(pagamento.empresaId);
    if (!empresa) {
      return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
    }
    
    if (!pagamento.contaDebito && status === 'Pago') {
      const bancoPadrao = await Banco.findOne({ empresaId: pagamento.empresaId, ativo: true });
      if (bancoPadrao) {
        pagamento.contaDebito = bancoPadrao.codNome;
        pagamento.contaDebitoId = bancoPadrao._id;
        pagamento.ibanDebito = bancoPadrao.iban || '';
        console.log(`⚠️ Conta débito não definida, usando padrão: ${bancoPadrao.codNome}`);
      } else {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: 'Não é possível processar o pagamento. Nenhuma conta bancária cadastrada para débito.' 
        });
      }
    }
    
    const statusAnterior = pagamento.status;
    
    pagamento.status = status;
    pagamento.atualizadoPor = usuario;
    pagamento.updatedAt = new Date();
    
    if (motivoStatus) pagamento.motivoStatus = motivoStatus;
    
    if (status === 'Pago') {
      pagamento.dataPagamento = dataPagamento ? new Date(dataPagamento) : new Date();
      pagamento.valorPago = pagamento.valor;
      pagamento.saldo = 0;
      if (comprovativo) pagamento.comprovativo = comprovativo;
      await criarRegistoBancarioPagamento(pagamento, empresa, pagamento.contaDebito);
      // 🔥 ATUALIZA CONTA CORRENTE
      await contaCorrenteController.atualizarContaAposPagamento(pagamento, pagamento.empresaId);
    } else if (status === 'Cancelado') {
      pagamento.dataCancelamento = new Date();
    } else if (status === 'Aguardando Aprovação') {
      pagamento.dataAprovacao = null;
    }
    
    await pagamento.save();
    
    console.log(`✅ Pagamento ${pagamento.referencia}: ${statusAnterior} → ${status}`);
    
    const novosaldoConta = await calcularSaldoConta(pagamento.contaDebito, pagamento.empresaId);
    const saldoTotal = await calcularSaldoTotalEmpresa(pagamento.empresaId);
    
    res.json({
      sucesso: true,
      mensagem: `Pagamento ${pagamento.referencia} atualizado para ${status}`,
      dados: pagamento,
      saldoConta: novosaldoConta,
      saldoDisponivel: saldoTotal
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Atualizar status do pagamento (rota específica)
exports.atualizarStatusPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, dataPagamento, comprovativo, motivoStatus } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    const pagamento = await Pagamento.findById(id);
    if (!pagamento) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pagamento não encontrado' });
    }
    
    const empresa = await Empresa.findById(pagamento.empresaId);
    if (!empresa) {
      return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
    }
    
    const statusAnterior = pagamento.status;
    
    pagamento.status = status;
    pagamento.atualizadoPor = usuario;
    pagamento.updatedAt = new Date();
    
    if (motivoStatus) pagamento.motivoStatus = motivoStatus;
    
    if (status === 'Pago') {
      pagamento.dataPagamento = dataPagamento ? new Date(dataPagamento) : new Date();
      pagamento.valorPago = pagamento.valor;
      pagamento.saldo = 0;
      if (comprovativo) pagamento.comprovativo = comprovativo;
      await criarRegistoBancarioPagamento(pagamento, empresa, pagamento.contaDebito);
      // 🔥 ATUALIZA CONTA CORRENTE
      await contaCorrenteController.atualizarContaAposPagamento(pagamento, pagamento.empresaId);
    } else if (status === 'Cancelado') {
      pagamento.dataCancelamento = new Date();
    }
    
    await pagamento.save();
    
    console.log(`✅ Pagamento ${pagamento.referencia}: ${statusAnterior} → ${status}`);
    
    const novosaldoConta = await calcularSaldoConta(pagamento.contaDebito, pagamento.empresaId);
    const saldoTotal = await calcularSaldoTotalEmpresa(pagamento.empresaId);
    
    res.json({
      sucesso: true,
      mensagem: `Pagamento ${pagamento.referencia} atualizado para ${status}`,
      dados: pagamento,
      saldoConta: novosaldoConta,
      saldoDisponivel: saldoTotal
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Cancelar pagamento
exports.cancelarPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.query;
    
    const pagamento = await Pagamento.findOne({ _id: id, empresaId });
    if (!pagamento) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pagamento não encontrado' });
    }
    
    if (pagamento.status === 'Pago') {
      return res.status(400).json({ sucesso: false, mensagem: 'Pagamento já foi pago, não pode ser cancelado' });
    }
    
    pagamento.status = 'Cancelado';
    pagamento.dataCancelamento = new Date();
    pagamento.updatedAt = new Date();
    await pagamento.save();
    
    res.json({
      sucesso: true,
      mensagem: `Pagamento ${pagamento.referencia} cancelado com sucesso`
    });
  } catch (error) {
    console.error('Erro ao cancelar pagamento:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Obter estatísticas por categoria
exports.getEstatisticasPorCategoria = async (req, res) => {
  try {
    const { empresaId, ano, mes } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const query = { empresaId };
    
    if (ano) {
      const inicio = new Date(parseInt(ano), 0, 1);
      const fim = new Date(parseInt(ano), 11, 31);
      query.dataVencimento = { $gte: inicio, $lte: fim };
    }
    
    if (mes && ano) {
      const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      const fim = new Date(parseInt(ano), parseInt(mes), 0);
      query.dataVencimento = { $gte: inicio, $lte: fim };
    }
    
    const estatisticas = await Pagamento.aggregate([
      { $match: query },
      {
        $group: {
          _id: { categoria: '$categoria', status: '$status' },
          total: { $sum: '$valor' },
          quantidade: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.categoria',
          categorias: {
            $push: {
              status: '$_id.status',
              total: '$total',
              quantidade: '$quantidade'
            }
          },
          totalGeral: { $sum: '$total' }
        }
      }
    ]);
    
    res.json({
      sucesso: true,
      dados: estatisticas
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ==================== NOVAS FUNÇÕES PARA PAGAMENTO COM SELEÇÃO DE CONTA ====================

// Preparar pagamento - mostra todas as contas disponíveis antes de pagar
exports.prepararPagamento = async (req, res) => {
  try {
    const { id, empresaId } = req.query;
    
    if (!id || !empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'ID do pagamento e empresa são obrigatórios' 
      });
    }
    
    const pagamento = await Pagamento.findOne({ _id: id, empresaId });
    if (!pagamento) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pagamento não encontrado' });
    }
    
    if (pagamento.status === 'Pago') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Este pagamento já foi efetuado' 
      });
    }
    
    const bancos = await Banco.find({ empresaId, ativo: true });
    
    if (bancos.length === 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Nenhuma conta bancária cadastrada. Cadastre uma conta antes de pagar.' 
      });
    }
    
    const contasDisponiveis = await Promise.all(bancos.map(async (banco) => {
      const saldo = await calcularSaldoConta(banco.codNome, empresaId);
      const temSaldoSuficiente = saldo >= pagamento.valor;
      
      return {
        _id: banco._id,
        codNome: banco.codNome,
        nome: banco.nome,
        iban: banco.iban,
        saldoDisponivel: saldo,
        saldoFormatado: saldo.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }),
        temSaldoSuficiente,
        moeda: banco.moeda || 'AOA'
      };
    }));
    
    contasDisponiveis.sort((a, b) => {
      if (a.temSaldoSuficiente && !b.temSaldoSuficiente) return -1;
      if (!a.temSaldoSuficiente && b.temSaldoSuficiente) return 1;
      return b.saldoDisponivel - a.saldoDisponivel;
    });
    
    res.json({
      sucesso: true,
      dados: {
        pagamento: {
          _id: pagamento._id,
          referencia: pagamento.referencia,
          beneficiario: pagamento.beneficiario,
          valor: pagamento.valor,
          valorFormatado: pagamento.valor.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }),
          descricao: pagamento.descricao,
          dataVencimento: pagamento.dataVencimento,
          tipo: pagamento.tipo,
          categoria: pagamento.categoria
        },
        contasDisponiveis,
        totalContas: contasDisponiveis.length
      }
    });
  } catch (error) {
    console.error('Erro ao preparar pagamento:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Processar pagamento com conta débito específica
exports.processarPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      contaDebito, 
      contaDebitoId, 
      ibanDebito,
      dataPagamento, 
      comprovativo, 
      observacao,
      empresaId 
    } = req.body;
    
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    if (!empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Empresa é obrigatória' 
      });
    }
    
    if (!contaDebito) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Selecione a conta bancária para débito' 
      });
    }
    
    const pagamento = await Pagamento.findOne({ _id: id, empresaId });
    if (!pagamento) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pagamento não encontrado' });
    }
    
    if (pagamento.status === 'Pago') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Este pagamento já foi efetuado' 
      });
    }
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
    }
    
    const saldoConta = await calcularSaldoConta(contaDebito, empresaId);
    if (saldoConta < pagamento.valor) {
      const banco = await Banco.findOne({ codNome: contaDebito, empresaId });
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Saldo insuficiente na conta ${banco?.nome || contaDebito}. Disponível: ${saldoConta.toLocaleString()} Kz, Necessário: ${pagamento.valor.toLocaleString()} Kz`,
        saldoDisponivel: saldoConta,
        valorNecessario: pagamento.valor
      });
    }
    
    const statusAnterior = pagamento.status;
    
    pagamento.status = 'Pago';
    pagamento.dataPagamento = dataPagamento ? new Date(dataPagamento) : new Date();
    pagamento.valorPago = pagamento.valor;
    pagamento.saldo = 0;
    pagamento.contaDebito = contaDebito;
    pagamento.contaDebitoId = contaDebitoId;
    pagamento.ibanDebito = ibanDebito || '';
    pagamento.atualizadoPor = usuario;
    pagamento.updatedAt = new Date();
    
    if (comprovativo) pagamento.comprovativo = comprovativo;
    if (observacao) pagamento.observacao = observacao;
    
    await pagamento.save();
    
    await criarRegistoBancarioPagamento(pagamento, empresa, contaDebito);
    
    // 🔥 ATUALIZA CONTA CORRENTE
    await contaCorrenteController.atualizarContaAposPagamento(pagamento, empresaId);
    
    console.log(`✅ Pagamento ${pagamento.referencia} processado: ${statusAnterior} → Pago via conta ${contaDebito}`);
    
    const novosaldoConta = await calcularSaldoConta(contaDebito, empresaId);
    const saldoTotal = await calcularSaldoTotalEmpresa(empresaId);
    
    res.json({
      sucesso: true,
      mensagem: `Pagamento ${pagamento.referencia} efetuado com sucesso!`,
      dados: pagamento,
      saldoConta: novosaldoConta,
      saldoContaFormatado: novosaldoConta.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }),
      saldoDisponivel: saldoTotal
    });
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};