// backend/controllers/contaCorrenteController.js - VERSÃO COMPLETA E CORRIGIDA (SEM DUPLICAÇÕES)
const ContaCorrente = require('../models/ContaCorrente');
const Pagamento = require('../models/Pagamento');
const Fornecedor = require('../models/Fornecedor');
const Funcionario = require('../models/Funcionario');
const Cliente = require('../models/Cliente');
const Venda = require('../models/Venda');
const integracaoPagamentos = require('../services/integracaoPagamentos');

// ============================================
// LISTAR TODAS AS CONTAS
// ============================================
exports.listarContas = async (req, res) => {
  try {
    const { empresaId, tipo, status, busca, page = 1, limit = 20 } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    }
    
    const query = { empresaId };
    if (tipo && tipo !== 'Todos') query.tipo = tipo;
    if (status && status !== 'Todos') query.status = status;
    if (busca && busca.trim() !== '') {
      query.$or = [
        { beneficiario: { $regex: busca, $options: 'i' } },
        { beneficiarioDocumento: { $regex: busca, $options: 'i' } },
        { contato: { $regex: busca, $options: 'i' } }
      ];
    }
    
    const total = await ContaCorrente.countDocuments(query);
    const contas = await ContaCorrente.find(query)
      .sort({ beneficiario: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    const contasComSaldo = contas.map(conta => {
      const saldo = conta.saldo || 0;
      
      return {
        ...conta.toObject(),
        saldoFormatado: Math.abs(saldo).toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        saldo: saldo,
        situacao: saldo > 0 ? 'Credor (empresa deve)' : saldo < 0 ? 'Devedor (fornecedor deve)' : 'Zerado'
      };
    });
    
    res.json({
      sucesso: true,
      dados: contasComSaldo,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Erro ao listar contas:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// SINCRONIZAR COM PAGAMENTOS - CORRIGIDA (SEM CRIAÇÃO AUTOMÁTICA)
// ============================================
exports.sincronizarComPagamentos = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    }
    
    console.log('\n🔄 VERIFICANDO sincronização de pagamentos com conta corrente...');
    console.log(`Empresa ID: ${empresaId}`);
    
    // Buscar pagamentos PAGOS
    const pagamentos = await Pagamento.find({
      empresaId,
      status: 'Pago'
    }).sort({ dataPagamento: 1 });
    
    console.log(`📋 Encontrados ${pagamentos.length} pagamentos PAGOS`);
    
    const fornecedores = await Fornecedor.find({ empresaId });
    console.log(`📋 Encontrados ${fornecedores.length} fornecedores`);
    
    let totalMovimentosSincronizados = 0;
    let totalMovimentosJaExistentes = 0;
    
    for (const fornecedor of fornecedores) {
      const pagamentosFornecedor = pagamentos.filter(p => 
        p.beneficiario && p.beneficiario.toLowerCase().trim() === fornecedor.nome.toLowerCase().trim()
      );
      
      if (pagamentosFornecedor.length === 0) continue;
      
      console.log(`\n📌 Fornecedor: ${fornecedor.nome} - ${pagamentosFornecedor.length} pagamentos`);
      
      let conta = await ContaCorrente.findOne({
        empresaId,
        beneficiario: fornecedor.nome,
        tipo: 'Fornecedor'
      });
      
      if (!conta) {
        console.log(`   ⚠️ Conta não encontrada para ${fornecedor.nome} - será criada quando houver pagamento`);
        continue;
      }
      
      // Apenas verificar se os movimentos já existem, NÃO CRIAR NOVOS
      const referenciasExistentes = new Set(conta.movimentos.map(m => m.referencia));
      
      for (const pag of pagamentosFornecedor) {
        const ref = pag.referencia || pag._id.toString();
        
        if (referenciasExistentes.has(ref)) {
          totalMovimentosJaExistentes++;
          console.log(`   ℹ️ Movimento ${ref} já existe`);
        } else {
          console.log(`   ⚠️ Movimento ${ref} NÃO encontrado - será ignorado (deve ser criado via transferência)`);
          totalMovimentosSincronizados++;
        }
      }
    }
    
    console.log(`\n✅ Verificação concluída!`);
    console.log(`   Movimentos existentes: ${totalMovimentosJaExistentes}`);
    console.log(`   Movimentos não encontrados (ignorados): ${totalMovimentosSincronizados}`);
    console.log(`   ℹ️ Para criar movimentos, utilize o processo de transferência ou pagamento manual.`);
    
    res.json({
      sucesso: true,
      mensagem: `${totalMovimentosJaExistentes} movimentos existentes. ${totalMovimentosSincronizados} não encontrados (ignorados).`,
      dados: {
        movimentosExistentes: totalMovimentosJaExistentes,
        movimentosIgnorados: totalMovimentosSincronizados
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};


// ============================================
// REGISTRAR CRÉDITO (FATURA)
// ============================================
exports.registrarCredito = async (req, res) => {
  try {
    const { empresaId, beneficiario, valor, descricao, data, referencia, documentoReferencia, contratoId, mesReferencia } = req.body;
    
    if (!empresaId || !beneficiario || !valor) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Empresa, beneficiário e valor são obrigatórios' 
      });
    }
    
    let conta = await ContaCorrente.findOne({
      empresaId,
      beneficiario: beneficiario,
      tipo: 'Fornecedor'
    });
    
    if (!conta) {
      const fornecedor = await Fornecedor.findOne({ nome: beneficiario, empresaId });
      if (!fornecedor) {
        return res.status(404).json({ 
          sucesso: false, 
          mensagem: `Fornecedor ${beneficiario} não encontrado` 
        });
      }
      
      conta = new ContaCorrente({
        empresaId,
        beneficiario: beneficiario,
        beneficiarioDocumento: fornecedor.nif,
        tipo: 'Fornecedor',
        contato: fornecedor.contato || '',
        email: fornecedor.email || '',
        telefone: fornecedor.telefone || '',
        saldo: 0,
        status: 'Ativo'
      });
      await conta.save();
    }
    
    const referenciaFatura = referencia || `FAT-${beneficiario.substring(0, 3).toUpperCase()}-${mesReferencia || new Date().toISOString().slice(0, 7)}`;
    
    const faturaExistente = conta.movimentos.some(m => 
      m.tipo === 'Crédito' && m.referencia === referenciaFatura
    );
    
    if (faturaExistente) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Fatura já registrada' 
      });
    }
    
    const saldoAnterior = conta.saldo;
    const novoSaldo = saldoAnterior + parseFloat(valor);
    
    const movimento = {
      tipo: 'Crédito',
      valor: parseFloat(valor),
      descricao: descricao || `Fatura ${referenciaFatura}`,
      data: data || new Date(),
      referencia: referenciaFatura,
      documentoReferencia: documentoReferencia || referenciaFatura,
      origemModel: 'Fatura',
      contratoId: contratoId,
      mesReferencia: mesReferencia,
      status: 'Pendente',
      saldoAnterior: saldoAnterior,
      saldoAtual: novoSaldo
    };
    
    conta.movimentos.push(movimento);
    conta.saldo = novoSaldo;
    conta.dataUltimaMovimentacao = new Date();
    await conta.save();
    
    console.log(`✅ CRÉDITO registrado: ${beneficiario} - ${valor} Kz`);
    
    res.json({
      sucesso: true,
      mensagem: 'Crédito registrado com sucesso',
      dados: { beneficiario, valor, saldoAtual: novoSaldo }
    });
    
  } catch (error) {
    console.error('❌ Erro ao registrar crédito:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// REGISTRAR DÉBITO (PAGAMENTO)
// ============================================
exports.registrarDebito = async (req, res) => {
  try {
    const { empresaId, pagamentoId } = req.body;
    
    if (!empresaId || !pagamentoId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Empresa e pagamento são obrigatórios' 
      });
    }
    
    const pagamento = await Pagamento.findById(pagamentoId);
    if (!pagamento) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pagamento não encontrado' });
    }
    
    const resultado = await exports.atualizarContaAposPagamento(pagamento, empresaId);
    
    if (resultado) {
      res.json({
        sucesso: true,
        mensagem: `Débito registrado para ${pagamento.referencia}`,
        dados: resultado
      });
    } else {
      res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Erro ao registrar débito' 
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao registrar débito:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// ATUALIZAR CONTA CORRENTE APÓS PAGAMENTO
// ============================================
exports.atualizarContaAposPagamento = async (pagamento, empresaId) => {
  try {
    console.log(`🔄 Registrando DÉBITO para pagamento: ${pagamento.referencia}`);
    console.log(`   Beneficiário: ${pagamento.beneficiario}`);
    console.log(`   Valor Pago: ${pagamento.valor} Kz`);
    
    let conta = await ContaCorrente.findOne({
      empresaId,
      beneficiario: pagamento.beneficiario,
      tipo: 'Fornecedor'
    });
    
    if (!conta) {
      const fornecedor = await Fornecedor.findOne({ nome: pagamento.beneficiario, empresaId });
      if (!fornecedor) {
        console.log(`⚠️ Fornecedor ${pagamento.beneficiario} não encontrado`);
        return false;
      }
      
      conta = new ContaCorrente({
        empresaId,
        beneficiario: pagamento.beneficiario,
        beneficiarioDocumento: fornecedor.nif,
        tipo: 'Fornecedor',
        contato: fornecedor.contato || '',
        email: fornecedor.email || '',
        telefone: fornecedor.telefone || '',
        saldo: 0,
        status: 'Ativo'
      });
      await conta.save();
      console.log(`✅ Conta criada para: ${pagamento.beneficiario}`);
    }
    
    const movimentoExistente = conta.movimentos.some(m => m.referencia === pagamento.referencia);
    if (movimentoExistente) {
      console.log(`⚠️ Movimento ${pagamento.referencia} já existe`);
      return true;
    }
    
    const mesReferencia = pagamento.detalhesPagamento?.mesReferencia;
    let creditoCorrespondente = null;
    
    if (mesReferencia) {
      const referenciaFatura = `FAT-${pagamento.beneficiario.substring(0, 3).toUpperCase()}-${mesReferencia}`;
      creditoCorrespondente = conta.movimentos.find(m => 
        m.tipo === 'Crédito' && m.referencia === referenciaFatura && m.status !== 'Pago'
      );
    }
    
    const saldoAnterior = conta.saldo;
    const valorPago = pagamento.valorLiquido || pagamento.valor;
    const novoSaldo = saldoAnterior - valorPago;
    
    const movimento = {
      tipo: 'Débito',
      valor: valorPago,
      valorBruto: pagamento.valor,
      retencaoFonte: pagamento.retencaoFonte || 0,
      descricao: pagamento.descricao || `Pagamento ${pagamento.referencia}`,
      data: pagamento.dataPagamento || pagamento.dataVencimento || new Date(),
      referencia: pagamento.referencia,
      documentoReferencia: pagamento.referenciaBancaria || '',
      formaPagamento: pagamento.formaPagamento || 'Transferência Bancária',
      origemId: pagamento._id,
      origemModel: 'Pagamento',
      mesReferencia: mesReferencia,
      creditoReferencia: creditoCorrespondente?.referencia,
      status: 'Pago',
      saldoAnterior: saldoAnterior,
      saldoAtual: novoSaldo
    };
    
    conta.movimentos.push(movimento);
    
    if (creditoCorrespondente) {
      creditoCorrespondente.status = 'Pago';
      creditoCorrespondente.dataPagamento = new Date();
      creditoCorrespondente.pagamentoReferencia = pagamento.referencia;
    }
    
    conta.saldo = novoSaldo;
    conta.dataUltimaMovimentacao = new Date();
    await conta.save();
    
    console.log(`✅ DÉBITO registrado: ${pagamento.beneficiario}`);
    console.log(`   Saldo anterior: ${saldoAnterior.toLocaleString()} Kz`);
    console.log(`   Pagamento: ${valorPago.toLocaleString()} Kz`);
    console.log(`   Novo saldo: ${novoSaldo.toLocaleString()} Kz`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao registrar débito:', error);
    return false;
  }
};

// ============================================
// OBTER MOVIMENTOS POR FORNECEDOR
// ============================================
exports.obterMovimentosPorFornecedor = async (req, res) => {
  try {
    const { empresaId, fornecedorId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    }
    
    if (!fornecedorId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Fornecedor não informado' });
    }
    
    const fornecedor = await Fornecedor.findById(fornecedorId);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    const conta = await ContaCorrente.findOne({
      empresaId,
      beneficiario: fornecedor.nome,
      tipo: 'Fornecedor'
    });
    
    if (!conta) {
      return res.json({ sucesso: true, dados: [], saldo: 0, beneficiario: fornecedor.nome });
    }
    
    const creditos = conta.movimentos.filter(m => m.tipo === 'Crédito').sort((a, b) => new Date(b.data) - new Date(a.data));
    const debitos = conta.movimentos.filter(m => m.tipo === 'Débito').sort((a, b) => new Date(b.data) - new Date(a.data));
    const todosMovimentos = [...creditos, ...debitos].sort((a, b) => new Date(b.data) - new Date(a.data));
    
    const creditosPendentes = creditos.filter(c => c.status !== 'Pago');
    const creditosPagos = creditos.filter(c => c.status === 'Pago');
    
    res.json({
      sucesso: true,
      dados: todosMovimentos,
      saldo: conta.saldo,
      beneficiario: conta.beneficiario,
      estatisticas: {
        totalCreditos: creditos.length,
        totalDebitos: debitos.length,
        creditosPendentes: creditosPendentes.length,
        creditosPagos: creditosPagos.length,
        valorTotalCreditos: creditos.reduce((sum, c) => sum + c.valor, 0),
        valorTotalPago: debitos.reduce((sum, d) => sum + d.valor, 0)
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar movimentos:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// OBTER RESUMO GERAL
// ============================================
exports.getResumoGeral = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    }
    
    const fornecedores = await Fornecedor.find({ empresaId });
    const contas = await ContaCorrente.find({ empresaId, tipo: 'Fornecedor' });
    
    let totalAPagar = 0;
    let totalAReceber = 0;
    let saldoTotal = 0;
    const fornecedoresComSaldo = [];
    
    for (const fornecedor of fornecedores) {
      const conta = contas.find(c => c.beneficiario === fornecedor.nome);
      const saldo = conta ? conta.saldo : 0;
      saldoTotal += saldo;
      
      if (saldo > 0) totalAPagar += saldo;
      else if (saldo < 0) totalAReceber += Math.abs(saldo);
      
      fornecedoresComSaldo.push({
        id: fornecedor._id,
        nome: fornecedor.nome,
        nif: fornecedor.nif,
        saldo: saldo,
        situacao: saldo > 0 ? 'Credor (empresa deve)' : saldo < 0 ? 'Devedor (fornecedor deve)' : 'Zerado'
      });
    }
    
    const totalMovimentos = contas.reduce((sum, c) => sum + c.movimentos.length, 0);
    
    res.json({
      sucesso: true,
      dados: {
        totalFornecedores: fornecedores.length,
        totalMovimentos,
        saldoTotal,
        totalAPagar,
        totalAReceber,
        saldoLiquido: totalAPagar - totalAReceber,
        fornecedores: fornecedoresComSaldo
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// GERAR CRÉDITOS ANTECIPADOS
// ============================================
exports.gerarCreditosAntecipados = async (req, res) => {
  try {
    const { empresaId } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    }
    
    const fornecedores = await Fornecedor.find({ empresaId, status: 'Ativo' });
    let totalCreditos = 0;
    
    for (const fornecedor of fornecedores) {
      if (!fornecedor.contratos || fornecedor.contratos.length === 0) continue;
      
      for (const contrato of fornecedor.contratos) {
        const hoje = new Date();
        const dataFim = new Date(contrato.dataFim);
        
        if (dataFim < hoje) continue;
        
        const creditos = await integracaoPagamentos.gerarCreditosAntecipados(fornecedor, contrato, 'Sistema');
        totalCreditos += creditos;
      }
    }
    
    res.json({
      sucesso: true,
      mensagem: `${totalCreditos} créditos gerados`,
      dados: { totalCreditos }
    });
    
  } catch (error) {
    console.error('❌ Erro ao gerar créditos antecipados:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// OBTER EXTRATO COMPLETO
// ============================================
exports.obterExtratoCompleto = async (req, res) => {
  try {
    const { empresaId, fornecedorId } = req.query;
    
    if (!empresaId || !fornecedorId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa e fornecedor são obrigatórios' });
    }
    
    const fornecedor = await Fornecedor.findById(fornecedorId);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    const conta = await ContaCorrente.findOne({
      empresaId,
      beneficiario: fornecedor.nome,
      tipo: 'Fornecedor'
    });
    
    if (!conta) {
      return res.json({
        sucesso: true,
        dados: {
          beneficiario: fornecedor.nome,
          nif: fornecedor.nif,
          saldo: 0,
          movimentos: [],
          creditosPendentes: [],
          creditosPagos: [],
          estatisticas: {
            totalCreditos: 0,
            totalDebitos: 0,
            valorTotalFaturas: 0,
            valorTotalPago: 0
          }
        }
      });
    }
    
    const creditos = conta.movimentos.filter(m => m.tipo === 'Crédito');
    const debitos = conta.movimentos.filter(m => m.tipo === 'Débito');
    const todosMovimentos = [...creditos, ...debitos].sort((a, b) => new Date(b.data) - new Date(a.data));
    
    const creditosPendentes = creditos.filter(c => c.status !== 'Pago');
    const creditosPagos = creditos.filter(c => c.status === 'Pago');
    
    res.json({
      sucesso: true,
      dados: {
        beneficiario: conta.beneficiario,
        nif: fornecedor.nif,
        saldo: conta.saldo,
        movimentos: todosMovimentos,
        creditosPendentes,
        creditosPagos,
        estatisticas: {
          totalCreditos: creditos.length,
          totalDebitos: debitos.length,
          valorTotalFaturas: creditos.reduce((sum, c) => sum + c.valor, 0),
          valorTotalPago: debitos.reduce((sum, d) => sum + d.valor, 0),
          creditosPendentes: creditosPendentes.length,
          creditosPagos: creditosPagos.length
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter extrato completo:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// OBTER MOVIMENTOS DETALHADOS
// ============================================
exports.obterMovimentosDetalhados = async (req, res) => {
  try {
    const { empresaId, fornecedorId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    }
    
    if (!fornecedorId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Fornecedor não informado' });
    }
    
    const fornecedor = await Fornecedor.findById(fornecedorId);
    if (!fornecedor) {
      return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado' });
    }
    
    const conta = await ContaCorrente.findOne({
      empresaId,
      beneficiario: fornecedor.nome,
      tipo: 'Fornecedor'
    });
    
    if (!conta) {
      return res.json({ 
        sucesso: true, 
        dados: [], 
        saldo: 0,
        beneficiario: fornecedor.nome,
        totalPago: 0,
        totalBruto: 0,
        totalRetencao: 0
      });
    }
    
    const movimentos = [...conta.movimentos].sort((a, b) => new Date(a.data) - new Date(b.data));
    
    const totalPago = movimentos.filter(m => m.tipo === 'Débito').reduce((sum, m) => sum + m.valor, 0);
    const totalBruto = movimentos.reduce((sum, m) => sum + (m.valorBruto || m.valor), 0);
    const totalRetencao = movimentos.reduce((sum, m) => sum + (m.retencaoFonte || 0), 0);
    
    res.json({
      sucesso: true,
      dados: movimentos,
      saldo: conta.saldo,
      beneficiario: conta.beneficiario,
      totalPago,
      totalBruto,
      totalRetencao,
      quantidadeMovimentos: movimentos.length
    });
    
  } catch (error) {
    console.error('Erro ao buscar movimentos detalhados:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// RECALCULAR CONTAS
// ============================================
exports.recalcularContas = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    }
    
    console.log('\n🔄 RECALCULANDO todas as contas...');
    
    const resultDelete = await ContaCorrente.deleteMany({ empresaId });
    console.log(`🗑️ ${resultDelete.deletedCount} contas removidas`);
    
    await exports.sincronizarComPagamentos(
      { query: { empresaId } }, 
      { json: () => {}, status: () => ({ json: () => {} }) }
    );
    
    const contas = await ContaCorrente.find({ empresaId });
    
    res.json({
      sucesso: true,
      mensagem: `Contas recalculadas com sucesso. ${contas.length} contas criadas.`,
      dados: {
        contasRemovidas: resultDelete.deletedCount,
        contasCriadas: contas.length,
        contas
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao recalcular:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// EXPORTAR FUNÇÕES
// ============================================
module.exports = exports;