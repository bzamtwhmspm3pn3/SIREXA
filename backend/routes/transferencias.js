// backend/routes/transferencias.js - ADICIONAR CRIAÇÃO DE PAGAMENTO
const express = require('express');
const router = express.Router();
const Transferencia = require('../models/Transferencia');
const Banco = require('../models/Banco');
const RegistoBancario = require('../models/RegistoBancario');
const ContaCorrente = require('../models/ContaCorrente');
const Pagamento = require('../models/Pagamento'); // 🔥 ADICIONADO
const Custo = require('../models/Custo');
const Receita = require('../models/Receita');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Função para calcular saldo atual
async function calcularSaldoAtual(codNome, empresaId) {
  try {
    const entradas = await RegistoBancario.find({ 
      empresaId, 
      conta: codNome,
      entradaSaida: 'entrada'
    });
    const totalEntradas = entradas.reduce((sum, r) => sum + (r.valor || 0), 0);
    
    const saidas = await RegistoBancario.find({ 
      empresaId, 
      conta: codNome,
      entradaSaida: 'saida'
    });
    const totalSaidas = saidas.reduce((sum, r) => sum + (r.valor || 0), 0);
    
    const banco = await Banco.findOne({ codNome, empresaId });
    const saldoInicial = banco?.saldoInicial || 0;
    const saldoAtual = saldoInicial + totalEntradas - totalSaidas;
    
    return saldoAtual;
  } catch (error) {
    console.error('Erro ao calcular saldo:', error);
    return 0;
  }
}

// ============================================
// FUNÇÃO PARA CRIAR PAGAMENTO
// ============================================
async function criarPagamento(transferencia, empresaId) {
  try {
    // Apenas transferências de SAÍDA (pagamentos) viram pagamentos
    if (transferencia.tipo !== 'Saída') {
      console.log(`   ⏭️ Não é saída - não criar pagamento`);
      return null;
    }
    
    // Verificar se já existe pagamento para esta transferência
    const pagamentoExistente = await Pagamento.findOne({
      origemId: transferencia._id,
      origemModel: 'Transferencia',
      empresaId
    });
    
    if (pagamentoExistente) {
      console.log(`   ⚠️ Pagamento já existe para transferência ${transferencia._id}`);
      return pagamentoExistente;
    }
    
    // Determinar o tipo de pagamento baseado na categoria
    let tipoPagamento = 'Operacional';
    let categoriaPagamento = transferencia.categoria;
    
    if (transferencia.destinoTipo === 'fornecedor') {
      tipoPagamento = 'Fornecedor';
    } else if (transferencia.destinoTipo === 'externo') {
      tipoPagamento = 'Outro';
    }
    
    // Gerar referência única para o pagamento
    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequencial = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const referencia = `TRF-${ano}${mes}-${sequencial}`;
    
    const pagamento = new Pagamento({
      referencia: transferencia.referencia || referencia,
      tipo: tipoPagamento,
      categoria: categoriaPagamento,
      subtipo: transferencia.subtipo,
      origemId: transferencia._id,
      origemModel: 'Transferencia',
      origemDescricao: `Transferência via ${transferencia.destinoTipo}`,
      empresaId: empresaId,
      beneficiario: transferencia.destinatario,
      valor: transferencia.valorDebitar,
      valorBruto: transferencia.valorDebitar,
      saldo: 0,
      dataVencimento: transferencia.data || new Date(),
      dataPagamento: transferencia.data || new Date(),
      status: 'Pago', // 🔥 Já vem como PAGO porque a transferência foi efetuada
      descricao: transferencia.designacao,
      observacao: transferencia.observacao,
      formaPagamento: 'Transferência Bancária',
      contaDebito: transferencia.contaDebitar,
      ibanDebito: transferencia.ibanDebitar,
      criadoPor: 'Sistema - Transferência'
    });
    
    await pagamento.save();
    console.log(`   ✅ Pagamento criado: ${pagamento.referencia} - ${transferencia.valorDebitar.toLocaleString()} Kz`);
    
    return pagamento;
    
  } catch (error) {
    console.error(`   ❌ Erro ao criar pagamento:`, error);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA REGISTAR NA CONTA CORRENTE
// ============================================
async function registarNaContaCorrente(transferencia, empresaId) {
  try {
    const isTransferenciaExterna = transferencia.contaCreditar.startsWith('EXT-') || 
                                    transferencia.destinoTipo === 'fornecedor' || 
                                    transferencia.destinoTipo === 'externo';
    
    if (!isTransferenciaExterna) {
      console.log(`   ⏭️ Transferência interna - não registar na conta corrente`);
      return;
    }
    
    console.log(`   💰 Registando na Conta Corrente para: ${transferencia.destinatario}`);
    
    let conta = await ContaCorrente.findOne({
      empresaId,
      beneficiario: transferencia.destinatario,
      tipo: 'Fornecedor'
    });
    
    if (!conta && transferencia.destinoTipo === 'externo') {
      conta = new ContaCorrente({
        empresaId,
        beneficiario: transferencia.destinatario,
        beneficiarioDocumento: '---',
        tipo: 'Fornecedor',
        contato: '',
        email: '',
        telefone: '',
        saldo: 0,
        status: 'Ativo'
      });
      await conta.save();
      console.log(`   ✅ Conta corrente criada para: ${transferencia.destinatario}`);
    }
    
    if (conta) {
      const saldoAnterior = conta.saldo;
      const valorMovimento = transferencia.valorDebitar;
      const novoSaldo = saldoAnterior - valorMovimento;
      
      const movimento = {
        tipo: 'Débito',
        valor: valorMovimento,
        valorBruto: valorMovimento,
        descricao: transferencia.designacao || `Transferência ${transferencia.referencia}`,
        data: transferencia.data || new Date(),
        referencia: transferencia.referencia,
        documentoReferencia: transferencia.referencia,
        formaPagamento: 'Transferência Bancária',
        origemId: transferencia._id,
        origemModel: 'Transferencia',
        status: 'Pago',
        saldoAnterior: saldoAnterior,
        saldoAtual: novoSaldo
      };
      
      conta.movimentos.push(movimento);
      conta.saldo = novoSaldo;
      conta.dataUltimaMovimentacao = new Date();
      await conta.save();
      
      console.log(`   ✅ Conta corrente atualizada: ${transferencia.destinatario} - Saldo: ${saldoAnterior.toLocaleString()} → ${novoSaldo.toLocaleString()} Kz`);
    }
    
  } catch (error) {
    console.error(`   ❌ Erro ao registar na conta corrente:`, error);
  }
}

// ============================================
// FUNÇÃO PARA REGISTAR EM CUSTOS
// ============================================
async function registarEmCustos(transferencia, empresaId) {
  try {
    if (transferencia.tipo !== 'Saída') {
      console.log(`   ⏭️ Não é saída - não registar em custos`);
      return;
    }
    
    let codigo = '6.1';
    switch (transferencia.categoria) {
      case 'Operacional': codigo = '6.1'; break;
      case 'Investimento': codigo = '6.2'; break;
      case 'Financiamento': codigo = '6.3'; break;
      default: codigo = '6.1';
    }
    
    const custo = new Custo({
      descricao: `${transferencia.designacao} - ${transferencia.destinatario}`,
      valor: transferencia.valorDebitar,
      categoria: transferencia.categoria,
      codigo: codigo,
      data: transferencia.data || new Date(),
      empresaId: empresaId,
      fornecedor: transferencia.destinatario,
      subtipo: transferencia.subtipo,
      origemId: transferencia._id,
      origemModel: 'Transferencia'
    });
    
    await custo.save();
    console.log(`   ✅ Registado em CUSTOS: ${transferencia.valorDebitar.toLocaleString()} Kz`);
    
  } catch (error) {
    console.error(`   ❌ Erro ao registar em custos:`, error);
  }
}

// ============================================
// FUNÇÃO PARA REGISTAR EM RECEITAS
// ============================================
async function registarEmReceitas(transferencia, empresaId) {
  try {
    if (transferencia.tipo !== 'Entrada') {
      console.log(`   ⏭️ Não é entrada - não registar em receitas`);
      return;
    }
    
    let codigo = '7.1';
    switch (transferencia.categoria) {
      case 'Operacional': codigo = '7.1'; break;
      case 'Investimento': codigo = '7.2'; break;
      case 'Financiamento': codigo = '7.3'; break;
      default: codigo = '7.1';
    }
    
    const receita = new Receita({
      descricao: `${transferencia.designacao} - ${transferencia.destinatario}`,
      valor: transferencia.valorCreditar,
      categoria: transferencia.categoria,
      codigo: codigo,
      data: transferencia.data || new Date(),
      empresaId: empresaId,
      cliente: transferencia.destinatario,
      subtipo: transferencia.subtipo,
      origemId: transferencia._id,
      origemModel: 'Transferencia'
    });
    
    await receita.save();
    console.log(`   ✅ Registado em RECEITAS: ${transferencia.valorCreditar.toLocaleString()} Kz`);
    
  } catch (error) {
    console.error(`   ❌ Erro ao registar em receitas:`, error);
  }
}

// Função para criar registo bancário
async function criarRegistoBancario(transferencia, empresaId) {
  try {
    const registosExistentes = await RegistoBancario.find({
      documentoReferencia: transferencia._id.toString(),
      empresaId: empresaId
    });
    
    if (registosExistentes.length >= 2) {
      console.log(`   ⚠️ Registos bancários já existem para transferência ${transferencia._id}. Pulando criação.`);
      return;
    }
    
    const data = new Date(transferencia.data || new Date());
    const ano = data.getFullYear();
    const mes = meses[data.getMonth()];
    
    const registoSaida = new RegistoBancario({
      data: data,
      conta: transferencia.contaDebitar,
      descricao: `TRANSFERÊNCIA: ${transferencia.designacao || 'Transferência'} - ${transferencia.destinatario}`,
      tipo: transferencia.categoria === 'Investimento' ? 'Despesa - Investimento' :
            transferencia.categoria === 'Financiamento' ? 'Despesa - Financiamento' : 'Despesa - Transferência',
      valor: transferencia.valorDebitar,
      entradaSaida: 'saida',
      ano: ano,
      mes: mes,
      documentoReferencia: transferencia._id.toString(),
      reconcilado: false,
      empresaId: empresaId
    });
    await registoSaida.save();
    console.log(`   ✅ Registo bancário de SAÍDA criado`);
    
    if (!transferencia.contaCreditar.startsWith('EXT-')) {
      const registroEntrada = new RegistoBancario({
        data: data,
        conta: transferencia.contaCreditar,
        descricao: `TRANSFERÊNCIA: ${transferencia.designacao || 'Transferência'} - ${transferencia.destinatario}`,
        tipo: transferencia.categoria === 'Investimento' ? 'Receita - Investimento' :
              transferencia.categoria === 'Financiamento' ? 'Receita - Financiamento' : 'Receita - Transferência',
        valor: transferencia.valorCreditar,
        entradaSaida: 'entrada',
        ano: ano,
        mes: mes,
        documentoReferencia: transferencia._id.toString(),
        reconcilado: false,
        empresaId: empresaId
      });
      await registroEntrada.save();
      console.log(`   ✅ Registo bancário de ENTRADA criado`);
    } else {
      console.log(`   ⏭️ Conta externa - sem registo de entrada`);
    }
    
  } catch (error) {
    console.error('   ❌ Erro ao criar registos bancários:', error);
  }
}

// GET - Listar transferências
router.get('/', async (req, res) => {
  try {
    const { empresaId } = req.query;
    const query = empresaId ? { empresaId } : {};
    const transferencias = await Transferencia.find(query).sort({ data: -1 });
    console.log(`📋 Buscando transferências: ${transferencias.length} encontradas`);
    res.json(transferencias);
  } catch (error) {
    console.error('Erro ao buscar transferências:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar transferências' });
  }
});

// POST - Criar transferência
router.post('/', async (req, res) => {
  try {
    const { 
      contaDebitar, 
      valorDebitar, 
      contaCreditar, 
      ibanCreditar,
      empresaId, 
      categoria, 
      subtipo,
      designacao,
      destinatario,
      ibanDebitar,
      observacao,
      referencia,
      destinoTipo,
      destinoOriginal
    } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    console.log('\n📝 NOVA TRANSFERÊNCIA:');
    console.log(`   De: ${contaDebitar}`);
    console.log(`   Para: ${contaCreditar}`);
    console.log(`   Valor: ${valorDebitar} Kz`);
    console.log(`   Tipo Destino: ${destinoTipo || 'conta_interna'}`);
    
    const bancoOrigem = await Banco.findOne({ codNome: contaDebitar, empresaId });
    if (!bancoOrigem) {
      return res.status(400).json({ mensagem: 'Conta de origem não encontrada' });
    }
    
    const isContaExterna = contaCreditar && contaCreditar.startsWith('EXT-');
    
    if (!isContaExterna) {
      const bancoDestino = await Banco.findOne({ codNome: contaCreditar, empresaId });
      if (!bancoDestino) {
        return res.status(400).json({ mensagem: 'Conta de destino não encontrada' });
      }
    }
    
    if (contaDebitar === contaCreditar && !isContaExterna) {
      return res.status(400).json({ mensagem: 'Não é possível transferir da mesma conta para ela mesma' });
    }
    
    const saldoAtualOrigem = await calcularSaldoAtual(contaDebitar, empresaId);
    console.log(`   💰 Saldo atual ${contaDebitar}: ${saldoAtualOrigem.toLocaleString()} Kz`);
    
    if (saldoAtualOrigem < valorDebitar) {
      return res.status(400).json({ 
        mensagem: `Saldo insuficiente na conta ${contaDebitar}. Disponível: ${saldoAtualOrigem.toLocaleString()} Kz` 
      });
    }
    
    let tipo = 'Saída';
    if (categoria === 'Investimento' && subtipo === 'Subsídios') tipo = 'Entrada';
    if (categoria === 'Financiamento' && (subtipo === 'Aumentos de Capital' || subtipo === 'Empréstimos')) tipo = 'Entrada';
    
    const transferencia = new Transferencia({
      designacao: designacao || 'Transferência',
      destinatario: destinatario || 'Transferência',
      contaDebitar,
      ibanDebitar: ibanDebitar || bancoOrigem.iban,
      valorDebitar,
      contaCreditar,
      ibanCreditar: ibanCreditar || '',
      valorCreditar: valorDebitar,
      observacao: observacao || '',
      categoria,
      subtipo,
      tipo,
      empresaId,
      status: 'Concluída',
      data: new Date(),
      referencia: referencia,
      destinoTipo: destinoTipo || 'conta_interna',
      destinoOriginal: destinoOriginal || destinatario
    });
    
    await transferencia.save();
    console.log(`   ✅ Transferência salva com ID: ${transferencia._id}`);
    
    // Criar registos bancários
    await criarRegistoBancario(transferencia, empresaId);
    
    // 🔥 CRIAR PAGAMENTO (para aparecer no Controlo de Pagamento)
    await criarPagamento(transferencia, empresaId);
    
    // 🔥 REGISTAR NA CONTA CORRENTE
    await registarNaContaCorrente(transferencia, empresaId);
    
    // 🔥 REGISTAR EM CUSTOS
    await registarEmCustos(transferencia, empresaId);
    
    // 🔥 REGISTAR EM RECEITAS
    await registarEmReceitas(transferencia, empresaId);
    
    const novoSaldoOrigem = await calcularSaldoAtual(contaDebitar, empresaId);
    
    console.log(`\n📊 NOVOS SALDOS:`);
    console.log(`   Origem (${contaDebitar}): ${novoSaldoOrigem.toLocaleString()} Kz`);
    
    const todasTransferencias = await Transferencia.find({ empresaId }).sort({ data: -1 });
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Transferência realizada com sucesso',
      transferencia: transferencia,
      saldosAtualizados: {
        origem: { codNome: contaDebitar, saldo: novoSaldoOrigem }
      },
      todasTransferencias: todasTransferencias
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar transferência:', error);
    res.status(500).json({ mensagem: 'Erro ao criar transferência: ' + error.message });
  }
});

// DELETE - Excluir transferência
router.delete('/:id', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const transferencia = await Transferencia.findOne({ 
      _id: req.params.id, 
      empresaId 
    });
    
    if (!transferencia) {
      return res.status(404).json({ mensagem: 'Transferência não encontrada' });
    }
    
    console.log(`\n🗑️ Excluindo transferência: ${transferencia._id}`);
    
    await RegistoBancario.deleteMany({ 
      documentoReferencia: transferencia._id.toString(),
      empresaId: empresaId
    });
    console.log(`   ✅ Registos bancários removidos`);
    
    await ContaCorrente.updateMany(
      { 
        empresaId: empresaId,
        'movimentos.origemId': transferencia._id,
        'movimentos.origemModel': 'Transferencia'
      },
      { $pull: { movimentos: { origemId: transferencia._id, origemModel: 'Transferencia' } } }
    );
    console.log(`   ✅ Registos da conta corrente removidos`);
    
    await Pagamento.deleteMany({ origemId: transferencia._id, origemModel: 'Transferencia', empresaId });
    console.log(`   ✅ Pagamentos removidos`);
    
    await Custo.deleteMany({ origemId: transferencia._id, origemModel: 'Transferencia', empresaId });
    console.log(`   ✅ Registos de custos removidos`);
    
    await Receita.deleteMany({ origemId: transferencia._id, origemModel: 'Transferencia', empresaId });
    console.log(`   ✅ Registos de receitas removidos`);
    
    await Transferencia.findByIdAndDelete(req.params.id);
    console.log(`   ✅ Transferência removida`);
    
    const novoSaldoOrigem = await calcularSaldoAtual(transferencia.contaDebitar, empresaId);
    
    res.json({ 
      sucesso: true,
      mensagem: 'Transferência excluída com sucesso',
      saldosAtualizados: {
        origem: { codNome: transferencia.contaDebitar, saldo: novoSaldoOrigem }
      }
    });
  } catch (error) {
    console.error('❌ Erro ao excluir transferência:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir transferência' });
  }
});

module.exports = router;