// backend/routes/folhaSalarial.js - VERSAO RESTAURADA (COM CORRECAO DAS FALTAS APENAS)
const express = require('express');
const router = express.Router();
const FolhaSalarial = require('../models/FolhaSalarial');
const Funcionario = require('../models/Funcionario');
const Abono = require('../models/Abono');
const Falta = require('../models/Falta');
const Empresa = require('../models/Empresa');
const Gestor = require('../models/Gestor');
const Pagamento = require('../models/Pagamento');
const FolhaService = require('../services/folhaService');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// ============================================
// FUNÇÃO PARA CRIAR PAGAMENTO DA FOLHA
// ============================================
async function criarPagamentosFolha(folha, empresa, contaDebito, usuarioNome, datasVencimento) {
  try {
    const pagamentosCriados = [];
    
    const diaSalario = datasVencimento?.salario || 15;
    const diaINSS = datasVencimento?.inss || 20;
    const diaIRT = datasVencimento?.irt || 25;
    
    const dataAtual = new Date();
    let anoVencimento = dataAtual.getFullYear();
    let mesVencimento = dataAtual.getMonth() + 1;
    let diaAtual = dataAtual.getDate();
    
    if (diaAtual > 25) {
      if (mesVencimento === 12) {
        mesVencimento = 1;
        anoVencimento++;
      } else {
        mesVencimento++;
      }
    }
    
    const dataVencimentoSalario = new Date(anoVencimento, mesVencimento - 1, diaSalario);
    const dataVencimentoINSS = new Date(anoVencimento, mesVencimento - 1, diaINSS);
    const dataVencimentoIRT = new Date(anoVencimento, mesVencimento - 1, diaIRT);
    
    if (dataVencimentoSalario.getMonth() !== mesVencimento - 1) dataVencimentoSalario.setDate(0);
    if (dataVencimentoINSS.getMonth() !== mesVencimento - 1) dataVencimentoINSS.setDate(0);
    if (dataVencimentoIRT.getMonth() !== mesVencimento - 1) dataVencimentoIRT.setDate(0);
    
    const ultimoPagamento = await Pagamento.findOne().sort({ referencia: -1 });
    let sequencial = 1;
    if (ultimoPagamento?.referencia) {
      const partes = ultimoPagamento.referencia.split('-');
      if (partes.length >= 3) sequencial = parseInt(partes[2]) + 1;
    }
    
    const anoSeq = new Date().getFullYear();
    const mesSeq = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // 1. PAGAMENTO DE SALÁRIO LÍQUIDO
    const totalLiquido = folha.totais?.totalLiquido || 0;
    const refSalario = `SAL-${anoSeq}${mesSeq}-${String(sequencial).padStart(4, '0')}`;
    
    // Verificar se já existe pagamento com esta referência
    const existeSalario = await Pagamento.findOne({ referencia: refSalario, empresaId: folha.empresaId });
    
    if (!existeSalario) {
      const pagamentoSalario = new Pagamento({
        referencia: refSalario,
        tipo: 'Folha Salarial',
        categoria: 'Salário Líquido',
        subCategoria: 'Pagamento de Salários',
        empresaId: folha.empresaId,
        empresaNome: empresa?.nome || 'Empresa',
        beneficiario: `Folha Salarial - ${empresa?.nome || 'Empresa'}`,
        valor: totalLiquido,
        valorBruto: folha.totais?.totalSalarios || 0,
        saldo: totalLiquido,
        dataVencimento: dataVencimentoSalario,
        dataPagamento: null,
        descricao: `Pagamento de salários - ${meses[folha.mesReferencia - 1]}/${folha.anoReferencia}`,
        formaPagamento: 'Transferência Bancária',
        contaDebito: contaDebito || 'BAI01',
        status: 'Pendente',
        detalhesFolha: {
          folhaId: folha._id,
          tipoPagamento: 'SALARIO',
          periodoReferencia: `${meses[folha.mesReferencia - 1]}/${folha.anoReferencia}`,
          totalFuncionarios: folha.funcionarios?.length || 0
        },
        criadoPor: usuarioNome || 'Sistema (Folha Salarial)'
      });
      
      await pagamentoSalario.save();
      pagamentosCriados.push(pagamentoSalario);
      console.log(`✅ Pagamento SALÁRIO criado: ${refSalario} - ${totalLiquido.toLocaleString()} Kz`);
    } else {
      console.log(`⚠️ Pagamento SALÁRIO já existe: ${refSalario}`);
    }
    
    sequencial++;
    
    // 2. PAGAMENTO DE INSS
    const totalINSS = (folha.totais?.totalINSSColaborador || 0) + (folha.totais?.totalINSSEmpregador || 0);
    const refINSS = `INS-${anoSeq}${mesSeq}-${String(sequencial).padStart(4, '0')}`;
    
    const existeINSS = await Pagamento.findOne({ referencia: refINSS, empresaId: folha.empresaId });
    
    if (!existeINSS) {
      const pagamentoINSS = new Pagamento({
        referencia: refINSS,
        tipo: 'Imposto',
        categoria: 'INSS',
        subCategoria: 'Segurança Social',
        empresaId: folha.empresaId,
        empresaNome: empresa?.nome || 'Empresa',
        beneficiario: `INSS - Segurança Social`,
        valor: totalINSS,
        valorBruto: totalINSS,
        saldo: totalINSS,
        dataVencimento: dataVencimentoINSS,
        descricao: `INSS - ${meses[folha.mesReferencia - 1]}/${folha.anoReferencia}`,
        formaPagamento: 'Transferência Bancária',
        contaDebito: contaDebito || 'BAI01',
        status: 'Pendente',
        detalhesFolha: {
          folhaId: folha._id,
          tipoPagamento: 'INSS',
          periodoReferencia: `${meses[folha.mesReferencia - 1]}/${folha.anoReferencia}`
        },
        criadoPor: usuarioNome || 'Sistema (Folha Salarial)'
      });
      
      await pagamentoINSS.save();
      pagamentosCriados.push(pagamentoINSS);
      console.log(`✅ Pagamento INSS criado: ${refINSS} - ${totalINSS.toLocaleString()} Kz`);
    } else {
      console.log(`⚠️ Pagamento INSS já existe: ${refINSS}`);
    }
    
    sequencial++;
    
    // 3. PAGAMENTO DE IRT
    const totalIRT = folha.totais?.totalIRT || 0;
    const refIRT = `IRT-${anoSeq}${mesSeq}-${String(sequencial).padStart(4, '0')}`;
    
    const existeIRT = await Pagamento.findOne({ referencia: refIRT, empresaId: folha.empresaId });
    
    if (!existeIRT) {
      const pagamentoIRT = new Pagamento({
        referencia: refIRT,
        tipo: 'Imposto',
        categoria: 'IRT',
        subCategoria: 'Imposto de Renda',
        empresaId: folha.empresaId,
        empresaNome: empresa?.nome || 'Empresa',
        beneficiario: `IRT - Administração Geral Tributária (AGT)`,
        valor: totalIRT,
        valorBruto: totalIRT,
        saldo: totalIRT,
        dataVencimento: dataVencimentoIRT,
        descricao: `Imposto de Renda Trabalho (IRT) - ${meses[folha.mesReferencia - 1]}/${folha.anoReferencia}`,
        formaPagamento: 'Transferência Bancária',
        contaDebito: contaDebito || 'BAI01',
        status: 'Pendente',
        detalhesFolha: {
          folhaId: folha._id,
          tipoPagamento: 'IRT',
          periodoReferencia: `${meses[folha.mesReferencia - 1]}/${folha.anoReferencia}`
        },
        criadoPor: usuarioNome || 'Sistema (Folha Salarial)'
      });
      
      await pagamentoIRT.save();
      pagamentosCriados.push(pagamentoIRT);
      console.log(`✅ Pagamento IRT criado: ${refIRT} - ${totalIRT.toLocaleString()} Kz`);
    } else {
      console.log(`⚠️ Pagamento IRT já existe: ${refIRT}`);
    }
    
    return pagamentosCriados;
  } catch (error) {
    console.error('❌ Erro ao criar pagamentos da folha:', error);
    return [];
  }
}

// ============================================
// POST - Calcular folha salarial
// ============================================
router.post('/calcular', async (req, res) => {
  try {
    console.log("=== INICIANDO CÁLCULO DA FOLHA ===");
    console.log("Body recebido:", JSON.stringify(req.body, null, 2));
    
    let { empresaId, mes, ano } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Campo "empresaId" é obrigatório' });
    }
    
    if (mes === undefined || mes === null) {
      return res.status(400).json({ sucesso: false, mensagem: 'Campo "mes" é obrigatório' });
    }
    
    if (ano === undefined || ano === null) {
      return res.status(400).json({ sucesso: false, mensagem: 'Campo "ano" é obrigatório' });
    }
    
    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);
    
    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      return res.status(400).json({ sucesso: false, mensagem: 'Mês deve ser um número entre 1 e 12' });
    }
    
    if (isNaN(anoNum) || anoNum < 2000 || anoNum > 2100) {
      return res.status(400).json({ sucesso: false, mensagem: 'Ano inválido' });
    }
    
    console.log(`✅ Dados validados: empresaId=${empresaId}, mes=${mesNum}, ano=${anoNum}`);
    
    const usuarioEmpresaId = req.user?.empresaId;
    const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
    const usuarioTipo = req.user?.role;
    
    let temAcesso = false;
    if (usuarioTipo === 'admin') {
      temAcesso = true;
    } else if (usuarioTipo === 'tecnico') {
      temAcesso = empresaId === usuarioEmpresaId;
    } else if (usuarioEmpresasPermitidas.length > 0) {
      temAcesso = usuarioEmpresasPermitidas.includes(empresaId);
    } else if (usuarioEmpresaId) {
      temAcesso = empresaId === usuarioEmpresaId;
    }
    
    if (!temAcesso) {
      return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado.' });
    }
    
    const funcionarios = await Funcionario.find({ empresaId, status: 'Ativo' });
    
    if (funcionarios.length === 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nenhum funcionário ativo encontrado' });
    }
    
    const dataInicio = new Date(anoNum, mesNum - 1, 1);
    const dataFim = new Date(anoNum, mesNum, 0);
    
    console.log(`📅 Período: ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`);
    
    const abonos = await Abono.find({
      empresaId,
      dataReferencia: { $gte: dataInicio, $lte: dataFim },
      status: { $in: ['Aprovado', 'Pago'] }
    });
    
    console.log(`📋 Total de abonos encontrados: ${abonos.length}`);
    
    const faltas = await Falta.find({
      empresaId,
      dataInicio: { $lte: dataFim },
      dataFim: { $gte: dataInicio },
      status: 'Aprovado'
    });
    
    console.log(`📋 Total de faltas encontradas: ${faltas.length}`);
    
    const empresa = await Empresa.findById(empresaId);
    
    const funcionariosFolha = [];
    let totais = {
      totalSalarios: 0,
      totalINSSColaborador: 0,
      totalINSSEmpregador: 0,
      totalIRT: 0,
      totalFaltas: 0,
      totalAbonosAlimentacao: 0,
      totalAbonosTransporte: 0,
      totalAbonosFerias: 0,
      totalAbonosDecimoTerceiro: 0,
      totalAbonosBonus: 0,
      totalAbonosOutros: 0,
      totalLiquido: 0
    };
    
    for (const func of funcionarios) {
      const abonosFunc = abonos.filter(a => a.funcionarioId?.toString() === func._id.toString());
      
      const abonosAlimentacao = abonosFunc.filter(a => a.tipoAbono === 'Subsídio de Alimentação');
      const abonosTransporte = abonosFunc.filter(a => a.tipoAbono === 'Subsídio de Transporte');
      const abonosFerias = abonosFunc.filter(a => a.tipoAbono === 'Subsídio de Férias');
      const abonosDecimoTerceiro = abonosFunc.filter(a => a.tipoAbono === 'Décimo Terceiro');
      const abonosBonus = abonosFunc.filter(a => a.tipoAbono === 'Bónus' || a.tipoAbono === 'Prémio');
      const abonosOutros = abonosFunc.filter(a => !['Subsídio de Alimentação', 'Subsídio de Transporte', 'Subsídio de Férias', 'Décimo Terceiro', 'Bónus', 'Prémio'].includes(a.tipoAbono));
      
      const totalAbonosAlimentacao = abonosAlimentacao.reduce((acc, a) => acc + (a.valor || 0), 0);
      const totalAbonosTransporte = abonosTransporte.reduce((acc, a) => acc + (a.valor || 0), 0);
      const totalAbonosFerias = abonosFerias.reduce((acc, a) => acc + (a.valor || 0), 0);
      const totalAbonosDecimoTerceiro = abonosDecimoTerceiro.reduce((acc, a) => acc + (a.valor || 0), 0);
      const totalAbonosBonus = abonosBonus.reduce((acc, a) => acc + (a.valor || 0), 0);
      const totalAbonosOutros = abonosOutros.reduce((acc, a) => acc + (a.valor || 0), 0);
      
      const faltasFunc = faltas.filter(f => f.funcionarioId?.toString() === func._id.toString());
      
      // Calcular dias de falta e horas de atraso
      let diasFaltas = 0;
      let horasAtraso = 0;
      
      for (const falta of faltasFunc) {
        if (falta.justificada) continue;
        
        if (falta.tipoFalta === 'Falta Injustificada') {
          // Usar diasFalta do modelo se existir, senão calcular
          if (falta.diasFalta && falta.diasFalta > 0) {
            diasFaltas += falta.diasFalta;
          } else {
            const inicio = new Date(falta.dataInicio);
            const fim = falta.dataFim ? new Date(falta.dataFim) : inicio;
            const dias = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;
            diasFaltas += dias;
          }
        } else if (falta.tipoFalta === 'Atraso') {
          horasAtraso += falta.horasFalta || 1;
        }
      }
      
      const resultadoFolha = FolhaService.calcularFolhaCompleta(func, empresa, {
        abonosAlimentacao: abonosAlimentacao.map(a => ({ valor: a.valor, data: a.dataReferencia })),
        abonosTransporte: abonosTransporte.map(a => ({ valor: a.valor, data: a.dataReferencia })),
        abonosFerias: abonosFerias.map(a => ({ valor: a.valor, data: a.dataReferencia })),
        abonosDecimoTerceiro: abonosDecimoTerceiro.map(a => ({ valor: a.valor, data: a.dataReferencia })),
        abonosBonus: abonosBonus.map(a => ({ valor: a.valor, data: a.dataReferencia, tipo: a.tipoAbono })),
        abonosOutros: abonosOutros.map(a => ({ valor: a.valor, data: a.dataReferencia, tipo: a.tipoAbono })),
        faltas: faltasFunc.map(f => ({
          tipoFalta: f.tipoFalta,
          justificada: f.justificada,
          dataInicio: f.dataInicio,
          dataFim: f.dataFim,
          diasFalta: f.diasFalta || 1,
          horasFalta: f.horasFalta || 0,
          motivo: f.motivo
        }))
      });
      
      if (!resultadoFolha.sucesso) {
        console.error(`Erro ao calcular folha para ${func.nome}:`, resultadoFolha.mensagem);
        continue;
      }
      
      const calculo = resultadoFolha.dados;
      const inssEmpregador = calculo.inssEmpregador || (calculo.baseINSS * 0.08);
      
      funcionariosFolha.push({
        id: func._id,
        nome: func.nome,
        cargo: func.cargo || func.funcao,
        departamento: func.departamento || '',
        salarioBase: func.salarioBase || 0,
        valorFaltas: calculo.valorFaltas,
        diasFaltas: diasFaltas,
        abonosAlimentacao: abonosAlimentacao.map(a => ({ valor: a.valor, data: a.dataReferencia })),
        totalAbonosAlimentacao: totalAbonosAlimentacao,
        abonosTransporte: abonosTransporte.map(a => ({ valor: a.valor, data: a.dataReferencia })),
        totalAbonosTransporte: totalAbonosTransporte,
        abonosFerias: abonosFerias.map(a => ({ valor: a.valor, data: a.dataReferencia })),
        totalAbonosFerias: totalAbonosFerias,
        abonosDecimoTerceiro: abonosDecimoTerceiro.map(a => ({ valor: a.valor, data: a.dataReferencia })),
        totalAbonosDecimoTerceiro: totalAbonosDecimoTerceiro,
        abonosBonus: abonosBonus.map(a => ({ valor: a.valor, data: a.dataReferencia, tipo: a.tipoAbono })),
        totalAbonosBonus: totalAbonosBonus,
        abonosOutros: abonosOutros.map(a => ({ valor: a.valor, data: a.dataReferencia, tipo: a.tipoAbono })),
        totalAbonosOutros: totalAbonosOutros,
        inssColaborador: calculo.inss,
        inssEmpregador: inssEmpregador,
        irt: calculo.irt,
        salarioLiquido: calculo.salarioLiquido,
        iban: func.iban || '',
        tipoIRT: calculo.tipoIRT,
        taxaINSS: calculo.taxaINSS 
      });
      
      totais.totalSalarios += func.salarioBase || 0;
      totais.totalINSSColaborador += calculo.inss;
      totais.totalINSSEmpregador += inssEmpregador;
      totais.totalIRT += calculo.irt;
      totais.totalFaltas += calculo.valorFaltas;
      totais.totalAbonosAlimentacao += totalAbonosAlimentacao;
      totais.totalAbonosTransporte += totalAbonosTransporte;
      totais.totalAbonosFerias += totalAbonosFerias;
      totais.totalAbonosDecimoTerceiro += totalAbonosDecimoTerceiro;
      totais.totalAbonosBonus += totalAbonosBonus;
      totais.totalAbonosOutros += totalAbonosOutros;
      totais.totalLiquido += calculo.salarioLiquido;
    }
    
    let nomeGestor = '';
    if (empresa) {
      try {
        const gestor = await Gestor.findOne({ empresas: empresaId });
        if (gestor) {
          nomeGestor = gestor.nome;
        }
      } catch (err) {
        console.error('Erro ao buscar gestor:', err);
      }
    }
    
    const folhaExistente = await FolhaSalarial.findOne({
      empresaId,
      mesReferencia: mesNum,
      anoReferencia: anoNum
    });
    
    const folhaData = {
  empresaId,
  empresaNome: empresa?.nome || 'Empresa',
  empresaNif: empresa?.nif || '',
  empresaGestor: nomeGestor || '',
  mesReferencia: mesNum,
  anoReferencia: anoNum,
  funcionarios: funcionariosFolha,
  totais,
  regimeINSS: empresa?.isBaixosRendimentos ? 'Baixos Rendimentos (1.5% / 4%)' : 'Normal (3% / 8%)',
  
  // 🔥 CONFIGURAÇÕES INSS DA EMPRESA 🔥
  isBaixosRendimentos: empresa?.isBaixosRendimentos || false,
  inssColaboradorTaxa: empresa?.isBaixosRendimentos ? 1.5 : (empresa?.inssColaboradorTaxa ? empresa.inssColaboradorTaxa * 100 : 3),
  inssEmpregadorTaxa: empresa?.isBaixosRendimentos ? 4 : (empresa?.inssEmpregadorTaxa ? empresa.inssEmpregadorTaxa * 100 : 8),
  
  // 🔥 CONFIGURAÇÕES IRT DA EMPRESA 🔥
  irtTipoCalculo: empresa?.irtTipoCalculo || 'progressivo',
  irtTaxaFixa: empresa?.irtTaxaFixa ? empresa.irtTaxaFixa * 100 : 6.5,
  
  status: 'rascunho',
  processadoPor: req.user?.nome || req.user?.email,
  updatedAt: new Date()
};
    
    let folha;
    if (folhaExistente) {
      folha = await FolhaSalarial.findByIdAndUpdate(folhaExistente._id, folhaData, { new: true });
      console.log('✅ Folha atualizada');
    } else {
      folha = new FolhaSalarial(folhaData);
      await folha.save();
      console.log('✅ Folha criada');
    }
    
    res.status(200).json({
      sucesso: true,
      mensagem: 'Folha salarial calculada com sucesso',
      dados: folha
    });
    
  } catch (error) {
    console.error('❌ Erro ao calcular folha:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao calcular folha salarial',
      erro: error.message 
    });
  }
});

// ============================================
// GET - Listar folhas
// ============================================
router.get('/', async (req, res) => {
  try {
    const { empresaId, mes, ano, status } = req.query;
    const usuarioEmpresaId = req.user?.empresaId;
    const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
    const usuarioTipo = req.user?.role;
    
    let temAcesso = false;
    if (usuarioTipo === 'admin') {
      temAcesso = true;
    } else if (usuarioTipo === 'tecnico') {
      temAcesso = empresaId === usuarioEmpresaId;
    } else if (usuarioEmpresasPermitidas.length > 0) {
      temAcesso = usuarioEmpresasPermitidas.includes(empresaId);
    } else if (usuarioEmpresaId) {
      temAcesso = empresaId === usuarioEmpresaId;
    }
    
    if (!temAcesso) {
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    
    const query = {};
    if (empresaId) query.empresaId = empresaId;
    if (mes) query.mesReferencia = parseInt(mes);
    if (ano) query.anoReferencia = parseInt(ano);
    if (status) query.status = status;
    
    const folhas = await FolhaSalarial.find(query).sort({ createdAt: -1 });
    res.json(folhas);
  } catch (error) {
    console.error('Erro ao buscar folhas:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar folhas' });
  }
});

// ============================================
// GET - Buscar folha por ID
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const folha = await FolhaSalarial.findById(req.params.id);
    if (!folha) return res.status(404).json({ mensagem: 'Não encontrado' });
    
    const usuarioEmpresaId = req.user?.empresaId;
    const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
    const usuarioTipo = req.user?.role;
    
    let temAcesso = false;
    if (usuarioTipo === 'admin') {
      temAcesso = true;
    } else if (usuarioTipo === 'tecnico') {
      temAcesso = folha.empresaId.toString() === usuarioEmpresaId;
    } else if (usuarioEmpresasPermitidas.length > 0) {
      temAcesso = usuarioEmpresasPermitidas.includes(folha.empresaId.toString());
    } else if (usuarioEmpresaId) {
      temAcesso = folha.empresaId.toString() === usuarioEmpresaId;
    }
    
    if (!temAcesso) {
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    
    res.json(folha);
  } catch (error) {
    console.error('Erro ao buscar folha:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar' });
  }
});

// ============================================
// PUT - Finalizar folha e criar pagamento
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, dataProcessamento, contaDebito, datasVencimento } = req.body;
    
    const folha = await FolhaSalarial.findById(id);
    if (!folha) {
      return res.status(404).json({ mensagem: 'Folha não encontrada' });
    }
    
    const usuarioEmpresaId = req.user?.empresaId;
    const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
    const usuarioTipo = req.user?.role;
    
    let temAcesso = false;
    if (usuarioTipo === 'admin') {
      temAcesso = true;
    } else if (usuarioTipo === 'tecnico') {
      temAcesso = folha.empresaId.toString() === usuarioEmpresaId;
    } else if (usuarioEmpresasPermitidas.length > 0) {
      temAcesso = usuarioEmpresasPermitidas.includes(folha.empresaId.toString());
    } else if (usuarioEmpresaId) {
      temAcesso = folha.empresaId.toString() === usuarioEmpresaId;
    }
    
    if (!temAcesso) {
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    
    if (folha.status === 'finalizado' && status !== 'rascunho') {
      return res.status(400).json({ mensagem: 'Folha já finalizada, não pode ser alterada' });
    }
    
    const statusAnterior = folha.status;
    folha.status = status || 'finalizado';
    if (dataProcessamento) folha.dataProcessamento = new Date(dataProcessamento);
    folha.updatedAt = new Date();
    await folha.save();
    
    let pagamentosCriados = [];
    
    if (statusAnterior === 'rascunho' && (status === 'finalizado' || req.body.status === 'finalizado')) {
      const empresa = await Empresa.findById(folha.empresaId);
      const usuarioNome = req.user?.nome || req.user?.email || 'Sistema';
      
      pagamentosCriados = await criarPagamentosFolha(folha, empresa, contaDebito || 'BAI01', usuarioNome, datasVencimento);
      
      if (pagamentosCriados.length > 0) {
        return res.json({
          sucesso: true,
          mensagem: `Folha finalizada! ${pagamentosCriados.length} pagamentos criados com status PENDENTE.`,
          dados: folha,
          pagamentos: pagamentosCriados
        });
      }
    }
    
    res.json({
      sucesso: true,
      mensagem: 'Folha atualizada com sucesso',
      dados: folha
    });
  } catch (error) {
    console.error('Erro ao atualizar folha:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar folha', erro: error.message });
  }
});


// ============================================
// DELETE - Excluir folha
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const folha = await FolhaSalarial.findById(req.params.id);
    if (!folha) {
      return res.status(404).json({ mensagem: 'Folha não encontrada' });
    }
    
    const usuarioEmpresaId = req.user?.empresaId;
    const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
    const usuarioTipo = req.user?.role;
    
    let temAcesso = false;
    if (usuarioTipo === 'admin') {
      temAcesso = true;
    } else if (usuarioTipo === 'tecnico') {
      temAcesso = folha.empresaId.toString() === usuarioEmpresaId;
    } else if (usuarioEmpresasPermitidas.length > 0) {
      temAcesso = usuarioEmpresasPermitidas.includes(folha.empresaId.toString());
    } else if (usuarioEmpresaId) {
      temAcesso = folha.empresaId.toString() === usuarioEmpresaId;
    }
    
    if (!temAcesso) {
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    
    if (folha.status === 'finalizado') {
      return res.status(400).json({ mensagem: 'Folha finalizada não pode ser excluída' });
    }
    
    await FolhaSalarial.findByIdAndDelete(req.params.id);
    res.json({ mensagem: 'Folha eliminada com sucesso' });
  } catch (error) {
    console.error('Erro ao eliminar folha:', error);
    res.status(500).json({ mensagem: 'Erro ao eliminar folha' });
  }
});


// POST - Exportar ficheiro de pagamento bancário
router.post('/exportar-pagamento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { codigoBanco, empresaId } = req.body;
    
    const folha = await FolhaSalarial.findById(id);
    if (!folha) {
      return res.status(404).json({ mensagem: 'Folha não encontrada' });
    }
    
    // Verificar acesso
    const usuarioEmpresaId = req.user?.empresaId;
    const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
    const usuarioTipo = req.user?.role;
    
    let temAcesso = false;
    if (usuarioTipo === 'admin') {
      temAcesso = true;
    } else if (usuarioTipo === 'tecnico') {
      temAcesso = folha.empresaId.toString() === usuarioEmpresaId;
    } else if (usuarioEmpresasPermitidas.length > 0) {
      temAcesso = usuarioEmpresasPermitidas.includes(folha.empresaId.toString());
    } else if (usuarioEmpresaId) {
      temAcesso = folha.empresaId.toString() === usuarioEmpresaId;
    }
    
    if (!temAcesso) {
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    
    // Buscar dados da empresa
    const empresa = await Empresa.findById(folha.empresaId);
    
    // Importar o serviço de exportação
    const ExportacaoBancoService = require('../services/exportacaoBancoService');
    
    // Exportar o ficheiro
    const { wb, nomeArquivo } = await ExportacaoBancoService.exportar(
      folha.empresaId,
      codigoBanco,
      folha,
      empresa
    );
    
    // Gerar o buffer do arquivo
    const XLSX = require('xlsx');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Configurar headers para download
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Erro ao exportar ficheiro de pagamento:', error);
    res.status(500).json({ 
      mensagem: 'Erro ao exportar ficheiro de pagamento',
      erro: error.message 
    });
  }
});

module.exports = router;