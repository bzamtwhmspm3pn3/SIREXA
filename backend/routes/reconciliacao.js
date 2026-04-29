// backend/routes/reconciliacao.js - VERSÃO COMPLETA CORRIGIDA
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const RegistoBancario = require('../models/RegistoBancario');
const Banco = require('../models/Banco');
const Transferencia = require('../models/Transferencia');
const Venda = require('../models/Venda');
const Pagamento = require('../models/Pagamento');
const Custo = require('../models/Custo');
const Receita = require('../models/Receita');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/extratos';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = file.originalname.replace(/\s/g, '_');
    cb(null, `extrato-${uniqueSuffix}-${originalName}`);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
  }
});

// ============================================
// FUNÇÃO PARA CALCULAR SALDO ATUAL
// ============================================
async function calcularSaldoAtual(codNome, empresaId, dataLimite = null) {
  try {
    const filtroEntradas = { empresaId, conta: codNome, entradaSaida: 'entrada' };
    const filtroSaidas = { empresaId, conta: codNome, entradaSaida: 'saida' };
    
    if (dataLimite) {
      const data = new Date(dataLimite);
      data.setHours(23, 59, 59, 999);
      filtroEntradas.data = { $lte: data };
      filtroSaidas.data = { $lte: data };
    }
    
    const entradas = await RegistoBancario.find(filtroEntradas);
    const saidas = await RegistoBancario.find(filtroSaidas);
    
    const totalEntradas = entradas.reduce((sum, r) => sum + (r.valor || 0), 0);
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
// FUNÇÃO PARA VALIDAR SE UM REGISTO JÁ EXISTE
// ============================================
async function registoJaExiste(data, conta, valor, empresaId) {
  const dataInicio = new Date(data);
  dataInicio.setHours(0, 0, 0, 0);
  const dataFim = new Date(data);
  dataFim.setHours(23, 59, 59, 999);
  
  const existente = await RegistoBancario.findOne({
    empresaId,
    conta,
    valor,
    data: { $gte: dataInicio, $lte: dataFim }
  });
  
  return !!existente;
}

// ============================================
// ENDPOINTS PRINCIPAIS
// ============================================

// GET - Listar registos bancários
router.get('/registos', async (req, res) => {
  try {
    const empresaId = req.user?.empresaId || req.query.empresaId;
    const { contaId, ano, mes, reconcilado, tipo, entradaSaida } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const filtro = { empresaId };
    if (contaId) filtro.contaId = contaId;
    if (ano) filtro.ano = parseInt(ano);
    if (mes) filtro.mes = mes;
    if (reconcilado !== undefined && reconcilado !== '') {
      filtro.reconcilado = reconcilado === 'true';
    }
    if (tipo) filtro.tipo = tipo;
    if (entradaSaida) filtro.entradaSaida = entradaSaida;
    
    const registos = await RegistoBancario.find(filtro).sort({ data: -1 });
    res.json(registos);
  } catch (error) {
    console.error('Erro ao buscar registos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar registos' });
  }
});

// GET - Estatísticas
router.get('/estatisticas', async (req, res) => {
  try {
    const empresaId = req.user?.empresaId || req.query.empresaId;
    const { contaId, ano, mes } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const filtro = { empresaId };
    if (contaId) filtro.contaId = contaId;
    if (ano) filtro.ano = parseInt(ano);
    if (mes) filtro.mes = mes;
    
    const registos = await RegistoBancario.find(filtro);
    
    const reconciliados = registos.filter(r => r.reconcilado).length;
    const pendentes = registos.filter(r => !r.reconcilado).length;
    const totalEntradas = registos.filter(r => r.entradaSaida === 'entrada').reduce((sum, r) => sum + r.valor, 0);
    const totalSaidas = registos.filter(r => r.entradaSaida === 'saida').reduce((sum, r) => sum + r.valor, 0);
    
    let saldoAtual = 0;
    if (contaId) {
      const banco = await Banco.findById(contaId);
      if (banco) {
        saldoAtual = await calcularSaldoAtual(banco.codNome, empresaId);
      }
    }
    
    res.json({
      totalRegistos: registos.length,
      reconciliados,
      pendentes,
      percentualReconciliado: registos.length > 0 ? ((reconciliados / registos.length) * 100).toFixed(2) : 0,
      totalEntradas,
      totalSaidas,
      saldoLiquido: totalEntradas - totalSaidas,
      saldoAtual
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar estatísticas' });
  }
});

// POST - Importar PDF
router.post('/importar-pdf', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nenhum arquivo enviado' });
    }
    
    const { contaId, empresaId } = req.body;
    const empresaFinal = empresaId || req.user?.empresaId;
    
    if (!empresaFinal) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não identificada' });
    }
    
    if (!contaId) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ sucesso: false, mensagem: 'Selecione uma conta bancária' });
    }
    
    const banco = await Banco.findOne({ _id: contaId, empresaId: empresaFinal });
    if (!banco) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ sucesso: false, mensagem: 'Conta bancária não encontrada' });
    }
    
    // Processar PDF - versão simplificada
    const pdfParse = require('pdf-parse');
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const texto = pdfData.text;
    
    const linhas = texto.split('\n');
    const transacoes = [];
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                   "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    for (const linha of linhas) {
      const dataMatch = linha.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const valorMatch = linha.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/);
      
      if (dataMatch && valorMatch) {
        const dia = dataMatch[1];
        const mesNum = dataMatch[2];
        const anoNum = dataMatch[3];
        const data = new Date(`${anoNum}-${mesNum}-${dia}`);
        
        if (isNaN(data.getTime())) continue;
        
        let valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
        if (isNaN(valor)) continue;
        
        const isSaida = linha.includes('-') || linha.toLowerCase().includes('debito');
        
        const existe = await registoJaExiste(data, banco.codNome, valor, empresaFinal);
        
        if (!existe) {
          transacoes.push({
            data,
            descricao: linha.substring(0, 200),
            valor,
            entradaSaida: isSaida ? 'saida' : 'entrada',
            tipo: isSaida ? 'Despesa - Outros' : 'Receita - Venda',
            ano: anoNum,
            mes: meses[data.getMonth()]
          });
        }
      }
    }
    
    const registosSalvos = [];
    for (const transacao of transacoes) {
      const novoRegisto = new RegistoBancario({
        data: transacao.data,
        conta: banco.codNome,
        contaId,
        descricao: transacao.descricao,
        tipo: transacao.tipo,
        valor: transacao.valor,
        entradaSaida: transacao.entradaSaida,
        ano: transacao.ano,
        mes: transacao.mes,
        reconcilado: false,
        empresaId: empresaFinal
      });
      
      await novoRegisto.save();
      registosSalvos.push(novoRegisto);
    }
    
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    
    res.json({
      sucesso: true,
      mensagem: `${registosSalvos.length} transações importadas`,
      total: registosSalvos.length,
      transacoes: registosSalvos
    });
    
  } catch (error) {
    console.error('Erro ao importar PDF:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao processar arquivo: ' + error.message });
  }
});

// ============================================
// ✅ ROTA CORRIGIDA: Reconciliar lançamento
// ============================================
router.put('/registos/:id/reconciliar', async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.user?.empresaId || req.body.empresaId;
    const { reconciladoCom, tipoReconciliacao } = req.body;
    
    console.log(`🔍 Reconciliando registo: ${id}`);
    console.log(`   Empresa: ${empresaId}`);
    
    // Buscar o registo pelo ID
    const registo = await RegistoBancario.findById(id);
    
    if (!registo) {
      console.log(`❌ Registo não encontrado: ${id}`);
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Registo não encontrado' 
      });
    }
    
    // Verificar se o registo pertence à empresa
    if (registo.empresaId.toString() !== empresaId && empresaId) {
      console.log(`❌ Registo não pertence à empresa: ${registo.empresaId} vs ${empresaId}`);
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado a este registo' 
      });
    }
    
    // Atualizar o registo
    registo.reconcilado = true;
    registo.reconciladoCom = reconciladoCom;
    registo.tipoReconciliacao = tipoReconciliacao;
    registo.dataReconciliacao = new Date();
    
    await registo.save();
    
    console.log(`✅ Registo reconciliado com sucesso: ${id}`);
    
    res.json({ 
      sucesso: true, 
      mensagem: 'Lançamento reconciliado com sucesso',
      registo
    });
  } catch (error) {
    console.error('❌ Erro ao reconciliar:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao reconciliar lançamento: ' + error.message 
    });
  }
});

// ============================================
// ✅ ROTA CORRIGIDA: Desfazer reconciliação
// ============================================
router.put('/registos/:id/desfazer-reconciliacao', async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.user?.empresaId;
    
    console.log(`🔍 Desfazendo reconciliação do registo: ${id}`);
    
    const registo = await RegistoBancario.findById(id);
    
    if (!registo) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Registo não encontrado' 
      });
    }
    
    if (registo.empresaId.toString() !== empresaId && empresaId) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado a este registo' 
      });
    }
    
    registo.reconcilado = false;
    registo.reconciladoCom = null;
    registo.tipoReconciliacao = null;
    registo.dataReconciliacao = null;
    await registo.save();
    
    console.log(`✅ Reconciliação desfeita: ${id}`);
    
    res.json({ 
      sucesso: true, 
      mensagem: 'Reconciliação desfeita com sucesso',
      registo
    });
  } catch (error) {
    console.error('❌ Erro ao desfazer reconciliação:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao desfazer reconciliação: ' + error.message 
    });
  }
});

// POST - Reconciliação automática
router.post('/reconciliar-automatico', async (req, res) => {
  try {
    const empresaId = req.user?.empresaId || req.body.empresaId;
    const { contaId, ano, mes } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const filtro = { empresaId, reconcilado: false };
    if (contaId) filtro.contaId = contaId;
    if (ano) filtro.ano = parseInt(ano);
    if (mes) filtro.mes = mes;
    
    const registos = await RegistoBancario.find(filtro);
    
    if (registos.length === 0) {
      return res.json({
        sucesso: true,
        mensagem: 'Não há registos pendentes para reconciliar',
        reconciliacoes: []
      });
    }
    
    const vendas = await Venda.find({ empresaId, status: 'finalizada' });
    const pagamentos = await Pagamento.find({ empresaId, status: 'Pago' });
    
    const reconciliacoes = [];
    const margem = 100;
    const diasTolerancia = 5;
    
    for (const registo of registos) {
      let encontrado = false;
      const dataRegisto = new Date(registo.data);
      
      if (registo.entradaSaida === 'entrada') {
        for (const venda of vendas) {
          if (encontrado) break;
          const dataVenda = new Date(venda.data);
          const diffDias = Math.abs(dataVenda - dataRegisto) / (1000 * 60 * 60 * 24);
          const diffValor = Math.abs(venda.total - registo.valor) <= margem;
          
          if (diffDias <= diasTolerancia && diffValor && !venda.reconcilado) {
            registo.reconcilado = true;
            registo.reconciladoCom = venda._id;
            registo.tipoReconciliacao = 'Venda';
            registo.dataReconciliacao = new Date();
            await registo.save();
            
            reconciliacoes.push({ 
              tipo: 'Venda', 
              id: venda._id, 
              valor: venda.total
            });
            encontrado = true;
          }
        }
      } else {
        for (const pagamento of pagamentos) {
          if (encontrado) break;
          const dataPagamento = new Date(pagamento.dataPagamento);
          const diffDias = Math.abs(dataPagamento - dataRegisto) / (1000 * 60 * 60 * 24);
          const diffValor = Math.abs(pagamento.valor - registo.valor) <= margem;
          
          if (diffDias <= diasTolerancia && diffValor && !pagamento.reconcilado) {
            registo.reconcilado = true;
            registo.reconciladoCom = pagamento._id;
            registo.tipoReconciliacao = 'Pagamento';
            registo.dataReconciliacao = new Date();
            await registo.save();
            
            reconciliacoes.push({ 
              tipo: 'Pagamento', 
              id: pagamento._id, 
              valor: pagamento.valor
            });
            encontrado = true;
          }
        }
      }
    }
    
    res.json({
      sucesso: true,
      mensagem: `${reconciliacoes.length} transações reconciliadas automaticamente`,
      reconciliacoes,
      totalRegistos: registos.length,
      pendentes: registos.length - reconciliacoes.length
    });
    
  } catch (error) {
    console.error('Erro na reconciliação automática:', error);
    res.status(500).json({ mensagem: 'Erro ao reconciliar automaticamente: ' + error.message });
  }
});

// GET - Resumo financeiro
router.get('/resumo-financeiro', async (req, res) => {
  try {
    const empresaId = req.user?.empresaId || req.query.empresaId;
    const { ano, mes } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'Empresa não identificada' });
    }
    
    const filtro = { empresaId };
    if (ano) filtro.ano = parseInt(ano);
    if (mes) filtro.mes = mes;
    
    const registos = await RegistoBancario.find(filtro);
    
    const totaisPorMes = {};
    registos.forEach(r => {
      const key = `${r.mes}/${r.ano}`;
      if (!totaisPorMes[key]) {
        totaisPorMes[key] = { mes: r.mes, ano: r.ano, entradas: 0, saidas: 0 };
      }
      if (r.entradaSaida === 'entrada') {
        totaisPorMes[key].entradas += r.valor;
      } else {
        totaisPorMes[key].saidas += r.valor;
      }
    });
    
    const bancos = await Banco.find({ empresaId, ativo: true });
    const saldosContas = [];
    
    for (const banco of bancos) {
      const saldo = await calcularSaldoAtual(banco.codNome, empresaId);
      saldosContas.push({
        id: banco._id,
        nome: banco.nome,
        codNome: banco.codNome,
        saldo
      });
    }
    
    res.json({
      sucesso: true,
      dados: {
        totalEntradas: registos.filter(r => r.entradaSaida === 'entrada').reduce((sum, r) => sum + r.valor, 0),
        totalSaidas: registos.filter(r => r.entradaSaida === 'saida').reduce((sum, r) => sum + r.valor, 0),
        totaisPorMes: Object.values(totaisPorMes),
        quantidadeRegistos: registos.length,
        reconciliados: registos.filter(r => r.reconcilado).length,
        saldosContas
      }
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar resumo financeiro' });
  }
});

// DELETE - Excluir registo
router.delete('/registos/:id', async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const registo = await RegistoBancario.findOneAndDelete({ _id: req.params.id, empresaId });
    if (!registo) {
      return res.status(404).json({ mensagem: 'Registo não encontrado' });
    }
    res.json({ mensagem: 'Registo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir registo:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir registo' });
  }
});

module.exports = router;