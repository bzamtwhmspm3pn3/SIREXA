const mongoose = require('mongoose');
const Factura = require('../models/Factura');
const Stock = require('../models/Stock');
const Empresa = require('../models/Empresa');
const crypto = require('crypto');

// ==================== HELPERS CORRIGIDOS ====================

// Helper genérico para próximo número
const getProximoNumero = async (empresaNif, tipoDocumento) => {
  try {
    let filtro = { empresaNif };
    let campoBusca = 'numeroFactura';
    
    switch (tipoDocumento) {
      case 'Orcamento':
        filtro.tipo = 'Orcamento';
        campoBusca = 'numeroDocumento';
        break;
        
      case 'Factura Proforma':
        filtro.serie = 'FP';
        filtro.tipo = 'Factura Proforma';
        campoBusca = 'numeroFactura';
        break;
        
      case 'Factura Recibo':
        filtro.serie = 'FR';
        filtro.tipo = 'Factura Recibo';
        campoBusca = 'numeroFactura';
        break;
        
      case 'Recibo':
        filtro.serie = 'RC';
        filtro.tipo = 'Recibo';
        campoBusca = 'numeroFactura';
        break;
        
      case 'Factura':
      default:
        filtro.serie = 'FT';
        filtro.tipo = { $in: ['Factura', 'Factura Proforma', null] };
        campoBusca = 'numeroFactura';
        break;
    }
    
    const ultimoDoc = await Factura.findOne(filtro).sort({ [campoBusca]: -1 });
    
    let proximoNumero = 1;
    if (ultimoDoc && ultimoDoc[campoBusca] && typeof ultimoDoc[campoBusca] === 'number') {
      proximoNumero = ultimoDoc[campoBusca] + 1;
    }
    
    return proximoNumero;
    
  } catch (error) {
    console.error(`Erro ao buscar próximo número para ${tipoDocumento}:`, error);
    return Math.floor(Date.now() / 1000) % 10000;
  }
};

// Helper específico para Nota de Crédito
const getProximoNumeroNotaCredito = async (empresaNif) => {
  try {
    const ultimaNC = await Factura.findOne({ 
      empresaNif, 
      serie: "NC",
      tipo: "Nota Credito"
    }).sort({ numeroFactura: -1 });
    
    let proximoNumero = 1;
    if (ultimaNC && ultimaNC.numeroFactura && typeof ultimaNC.numeroFactura === 'number') {
      proximoNumero = ultimaNC.numeroFactura + 1;
    }
    
    return proximoNumero;
    
  } catch (error) {
    console.error('Erro ao buscar próximo número para NC:', error);
    return Math.floor(Date.now() / 1000) % 10000;
  }
};

// Helper para processar itens (produtos e serviços)
const processarItens = async (itens, empresaId, usuario) => {
  const itensProcessados = [];
  
  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    
    // Buscar no stock se tiver produtoId
    let produtoStock = null;
    if (item.produtoId) {
      produtoStock = await Stock.findOne({ 
        _id: item.produtoId, 
        empresaId,
        ativo: true 
      });
    } else {
      produtoStock = await Stock.findOne({ 
        produto: { $regex: new RegExp(`^${item.produtoOuServico}$`, "i") },
        empresaId,
        ativo: true 
      });
    }
    
    const tipoItem = item.tipo || (produtoStock?.tipo || 'produto');
    const taxaIVA = item.taxaIVA || (produtoStock?.taxaIVA || 14);
    const precoUnitario = item.precoUnitario || produtoStock?.precoVenda || 0;
    const total = (item.quantidade || 1) * precoUnitario;
    const ivaItem = total * (taxaIVA / 100);
    
    // Para produtos, dar baixa no estoque (apenas se for factura definitiva)
    if (tipoItem === 'produto' && produtoStock && !item.agendamento) {
      if (produtoStock.quantidade < (item.quantidade || 1)) {
        throw new Error(`Estoque insuficiente para "${item.produtoOuServico}". Disponível: ${produtoStock.quantidade}`);
      }
      produtoStock.quantidade -= (item.quantidade || 1);
      await produtoStock.save();
    }
    
    // Processar agendamento para serviços
    let agendamentoData = null;
    if (tipoItem === 'servico' && item.agendamento) {
      agendamentoData = {
        dataInicio: item.agendamento.dataInicio ? new Date(item.agendamento.dataInicio) : null,
        dataFim: item.agendamento.dataFim ? new Date(item.agendamento.dataFim) : null,
        duracaoEstimada: item.agendamento.duracaoEstimada || '',
        tecnicoResponsavel: item.agendamento.tecnicoResponsavel || '',
        enderecoServico: item.agendamento.enderecoServico || '',
        observacoes: item.agendamento.observacoes || '',
        contatoEmergencia: item.agendamento.contatoEmergencia || '',
        status: 'agendado'
      };
    }
    
    itensProcessados.push({
      linha: i + 1,
      produtoId: produtoStock?._id || item.produtoId,
      produtoOuServico: item.produtoOuServico,
      codigoProduto: produtoStock?.codigoBarras || item.codigoBarras || item.produtoOuServico,
      codigoBarras: produtoStock?.codigoBarras || item.codigoBarras,
      quantidade: item.quantidade || 1,
      precoUnitario: precoUnitario,
      desconto: item.desconto || 0,
      total: total - (item.desconto || 0),
      taxaIVA: taxaIVA,
      iva: ivaItem,
      tipo: tipoItem,
      agendamento: agendamentoData,
      unidade: item.unidade || (produtoStock?.unidade || 'un'),
      observacoesItem: item.observacoesItem || ''
    });
  }
  
  return itensProcessados;
};

// ==================== ORÇAMENTO ====================
exports.gerarOrcamento = async (req, res) => {
  try {
    const { dados, empresaNif } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";

    if (!empresaNif || !dados.cliente || !dados.nifCliente || !dados.itens?.length) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Dados incompletos para gerar orçamento' 
      });
    }

    const empresa = await Empresa.findOne({ nif: empresaNif });
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: `Empresa com NIF ${empresaNif} não encontrada` 
      });
    }

    const proximoNumero = await getProximoNumero(empresaNif, 'Orcamento');
    const numeroValido = typeof proximoNumero === 'number' && !isNaN(proximoNumero) && proximoNumero > 0 
      ? proximoNumero 
      : Math.floor(Date.now() / 1000) % 10000;

    // Processar itens (sem dar baixa em estoque)
    const itensOrcamento = dados.itens.map((item, idx) => {
      const precoUnitario = item.precoUnitario || 0;
      const total = (item.quantidade || 1) * precoUnitario;
      const taxaIVA = item.taxaIVA || 14;
      const ivaItem = total * (taxaIVA / 100);
      
      return {
        linha: idx + 1,
        produtoId: item.produtoId,
        produtoOuServico: item.produtoOuServico,
        codigoProduto: item.codigoBarras || item.produtoOuServico,
        codigoBarras: item.codigoBarras,
        quantidade: item.quantidade || 1,
        precoUnitario: precoUnitario,
        desconto: item.desconto || 0,
        total: total - (item.desconto || 0),
        taxaIVA: taxaIVA,
        iva: ivaItem,
        tipo: item.tipo || 'produto',
        agendamento: item.agendamento || null
      };
    });

    const subtotal = itensOrcamento.reduce((acc, item) => acc + item.total, 0);
    const totalIva = itensOrcamento.reduce((acc, item) => acc + item.iva, 0);
    const total = subtotal + totalIva - (dados.desconto || 0);

    const orcamento = new Factura({
      numeroDocumento: numeroValido,
      tipo: "Orcamento",
      empresaNif,
      empresaId: empresa._id,
      contaBancaria: dados.contaBancaria || empresa.contaBancariaPadrao,
      cliente: dados.cliente,
      clienteId: dados.clienteId,
      nifCliente: dados.nifCliente,
      enderecoCliente: dados.enderecoCliente || "",
      emailCliente: dados.emailCliente || "",
      telefoneCliente: dados.telefoneCliente || "",
      tipoActividade: dados.tipoActividade || "Venda",
      itens: itensOrcamento,
      subtotal: subtotal,
      totalIva: totalIva,
      desconto: dados.desconto || 0,
      total: total,
      formaPagamento: dados.formaPagamento || "A definir",
      status: "rascunho",
      usuario: usuario,
      dataEmissao: new Date(),
      dataVencimento: dados.dataVencimento || new Date(Date.now() + 30 * 86400000),
      observacoes: dados.observacoes || "",
      impressoes: 1
    });

    await orcamento.save();

    res.status(201).json({
      sucesso: true,
      mensagem: `Orçamento Nº ${numeroValido} gerado com sucesso!`,
      dados: orcamento
    });
  } catch (error) {
    console.error('Erro ao gerar orçamento:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao gerar orçamento',
      erro: error.message 
    });
  }
};

// ==================== FACTURA PROFORMA (MELHORADA) ====================
exports.gerarProforma = async (req, res) => {
  try {
    const { dados, empresaNif } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";

    if (!empresaNif || !dados.cliente || !dados.nifCliente || !dados.itens?.length) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Dados incompletos para gerar proforma' 
      });
    }

    const empresa = await Empresa.findOne({ nif: empresaNif });
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: `Empresa com NIF ${empresaNif} não encontrada` 
      });
    }

    const proximoNumero = await getProximoNumero(empresaNif, 'Factura Proforma');
    const numeroValido = typeof proximoNumero === 'number' && !isNaN(proximoNumero) && proximoNumero > 0 
      ? proximoNumero 
      : Math.floor(Date.now() / 1000) % 10000;

    // Processar itens com suporte a serviços e agendamentos
    const itensProforma = dados.itens.map((item, idx) => {
      const precoUnitario = item.precoUnitario || 0;
      const total = (item.quantidade || 1) * precoUnitario;
      const taxaIVA = item.taxaIVA || 14;
      const ivaItem = total * (taxaIVA / 100);
      
      return {
        linha: idx + 1,
        produtoId: item.produtoId,
        produtoOuServico: item.produtoOuServico,
        codigoProduto: item.codigoBarras || item.produtoOuServico,
        codigoBarras: item.codigoBarras,
        quantidade: item.quantidade || 1,
        precoUnitario: precoUnitario,
        desconto: item.desconto || 0,
        total: total - (item.desconto || 0),
        taxaIVA: taxaIVA,
        iva: ivaItem,
        tipo: item.tipo || 'produto',
        agendamento: item.agendamento || null
      };
    });

    const subtotal = itensProforma.reduce((acc, item) => acc + item.total, 0);
    const totalIva = itensProforma.reduce((acc, item) => acc + item.iva, 0);
    const total = subtotal + totalIva - (dados.desconto || 0);

    // Verificar se tem serviços para determinar tipo de actividade
    const temServicos = itensProforma.some(item => item.tipo === 'servico');
    const tipoActividade = temServicos ? "Prestação de Serviço" : (dados.tipoActividade || "Venda");

    const proforma = new Factura({
      numeroFactura: numeroValido,
      serie: "FP",
      tipo: "Factura Proforma",
      empresaNif,
      empresaId: empresa._id,
      contaBancaria: dados.contaBancaria || empresa.contaBancariaPadrao,
      cliente: dados.cliente,
      clienteId: dados.clienteId,
      nifCliente: dados.nifCliente,
      enderecoCliente: dados.enderecoCliente || "",
      emailCliente: dados.emailCliente || "",
      telefoneCliente: dados.telefoneCliente || "",
      tipoActividade: tipoActividade,
      itens: itensProforma,
      subtotal: subtotal,
      totalIva: totalIva,
      desconto: dados.desconto || 0,
      total: total,
      formaPagamento: dados.formaPagamento || "A definir",
      status: "rascunho",
      usuario: usuario,
      dataEmissao: new Date(),
      dataVencimento: dados.dataVencimento || new Date(Date.now() + 15 * 86400000),
      observacoes: dados.observacoes || "",
      impressoes: 1
    });

    await proforma.save();

    res.status(201).json({
      sucesso: true,
      mensagem: `Factura Proforma Nº ${numeroValido} gerada com sucesso!`,
      dados: proforma
    });
  } catch (error) {
    console.error('Erro ao gerar proforma:', error);
    if (error.code === 11000) {
      return res.status(409).json({ 
        sucesso: false, 
        mensagem: 'Erro de numeração. Tente novamente gerar a proforma.'
      });
    }
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao gerar proforma',
      erro: error.message 
    });
  }
};

// ==================== FACTURA (COMPLETA COM SERVIÇOS) ====================
exports.emitirFactura = async (req, res) => {
  try {
    const { dados, empresaNif } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";

    if (!empresaNif || !dados.cliente || !dados.nifCliente || !dados.itens?.length) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Dados incompletos: empresa, cliente, NIF e itens são obrigatórios' 
      });
    }

    const empresa = await Empresa.findOne({ nif: empresaNif });
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: `Empresa com NIF ${empresaNif} não encontrada` 
      });
    }

    const proximoNumero = await getProximoNumero(empresaNif, 'Factura');
    const numeroValido = typeof proximoNumero === 'number' && !isNaN(proximoNumero) && proximoNumero > 0 
      ? proximoNumero 
      : Math.floor(Date.now() / 1000) % 10000;

    // Processar itens com validação de estoque e agendamentos
    const itensProcessados = await processarItens(dados.itens, empresa._id, usuario);

    const subtotal = itensProcessados.reduce((acc, item) => acc + item.total, 0);
    const totalIva = itensProcessados.reduce((acc, item) => acc + item.iva, 0);
    const totalFinal = subtotal + totalIva - (dados.desconto || 0);

    const hashString = `${empresaNif}|${numeroValido}|${new Date().toISOString()}|${totalFinal}`;
    const hashDocumento = crypto.createHash('sha256').update(hashString).digest('hex');

    // Verificar se tem serviços
    const temServicos = itensProcessados.some(item => item.tipo === 'servico');
    const tipoActividade = temServicos ? "Prestação de Serviço" : (dados.tipoActividade || "Venda");

    const novaFactura = new Factura({
      numeroFactura: numeroValido,
      serie: "FT",
      tipo: "Factura",
      tipoVenda: dados.tipoVenda || 'avista',
      empresaNif,
      empresaId: empresa._id,
      contaBancaria: dados.contaBancaria || empresa.contaBancariaPadrao,
      cliente: dados.cliente,
      clienteId: dados.clienteId,
      nifCliente: dados.nifCliente,
      enderecoCliente: dados.enderecoCliente || "",
      emailCliente: dados.emailCliente || "",
      telefoneCliente: dados.telefoneCliente || "",
      tipoActividade: tipoActividade,
      itens: itensProcessados,
      subtotal: subtotal,
      totalIva: totalIva,
      desconto: dados.desconto || 0,
      incluiIVA: dados.incluiIVA !== false,
      incluiRetencao: dados.incluiRetencao || false,
      totalRetencao: dados.retencao || 0,
      taxaRetencao: dados.taxaRetencao || 0,
      total: totalFinal,
      formaPagamento: dados.formaPagamento,
      detalhesPagamento: {
        ...dados.detalhesPagamento,
        dataPagamento: dados.formaPagamento === 'Dinheiro' ? new Date() : null,
        contaBancaria: dados.contaBancaria,
        valorPago: dados.valorPago || 0,
        troco: dados.troco || 0
      },
      status: "emitido",
      usuario: usuario,
      hashDocumento: hashDocumento,
      dataEmissao: new Date(),
      dataVencimento: dados.dataVencimento || new Date(Date.now() + 30 * 86400000),
      observacoes: dados.observacoes || "",
      impressoes: 1
    });

    await novaFactura.save();

    res.status(201).json({
      sucesso: true,
      mensagem: `${novaFactura.tipo} Nº ${numeroValido} emitida com sucesso!`,
      dados: novaFactura
    });
  } catch (error) {
    console.error('Erro ao emitir factura:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao processar factura',
      erro: error.message 
    });
  }
};

// ==================== FACTURA RECIBO ====================
exports.emitirFacturaRecibo = async (req, res) => {
  try {
    const { dados, empresaNif } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";

    if (!empresaNif || !dados.cliente || !dados.nifCliente || !dados.itens?.length) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Dados incompletos para emitir Factura Recibo' 
      });
    }

    const empresa = await Empresa.findOne({ nif: empresaNif });
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: `Empresa com NIF ${empresaNif} não encontrada` 
      });
    }

    const proximoNumero = await getProximoNumero(empresaNif, 'Factura Recibo');
    const numeroValido = typeof proximoNumero === 'number' && !isNaN(proximoNumero) && proximoNumero > 0 
      ? proximoNumero 
      : Math.floor(Date.now() / 1000) % 10000;

    const itensProcessados = dados.itens.map((item, idx) => {
      const precoUnitario = item.precoUnitario || 0;
      const total = (item.quantidade || 1) * precoUnitario;
      const taxaIVA = item.taxaIVA || 14;
      const ivaItem = total * (taxaIVA / 100);
      
      return {
        linha: idx + 1,
        produtoId: item.produtoId,
        produtoOuServico: item.produtoOuServico,
        codigoProduto: item.codigoBarras || item.produtoOuServico,
        codigoBarras: item.codigoBarras,
        quantidade: item.quantidade || 1,
        precoUnitario: precoUnitario,
        desconto: item.desconto || 0,
        total: total - (item.desconto || 0),
        taxaIVA: taxaIVA,
        iva: ivaItem,
        tipo: item.tipo || 'produto'
      };
    });

    const subtotal = itensProcessados.reduce((acc, item) => acc + item.total, 0);
    const totalIva = itensProcessados.reduce((acc, item) => acc + item.iva, 0);
    const total = subtotal + totalIva - (dados.desconto || 0);

    const facturaRecibo = new Factura({
      numeroFactura: numeroValido,
      serie: "FR",
      tipo: "Factura Recibo",
      empresaNif,
      empresaId: empresa._id,
      cliente: dados.cliente,
      clienteId: dados.clienteId,
      nifCliente: dados.nifCliente,
      enderecoCliente: dados.enderecoCliente || "",
      emailCliente: dados.emailCliente || "",
      telefoneCliente: dados.telefoneCliente || "",
      itens: itensProcessados,
      subtotal: subtotal,
      totalIva: totalIva,
      desconto: dados.desconto || 0,
      total: total,
      formaPagamento: dados.formaPagamento || "Dinheiro",
      detalhesPagamento: {
        dataPagamento: new Date(),
        valorPago: total,
        ...dados.detalhesPagamento
      },
      status: "pago",
      valorPago: total,
      usuario: usuario,
      dataEmissao: new Date(),
      observacoes: dados.observacoes || "",
      impressoes: 1
    });

    await facturaRecibo.save();

    res.status(201).json({
      sucesso: true,
      mensagem: `Factura Recibo Nº ${numeroValido} emitida com sucesso!`,
      dados: facturaRecibo
    });
  } catch (error) {
    console.error('Erro ao emitir factura recibo:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao emitir factura recibo',
      erro: error.message 
    });
  }
};

// ==================== RECIBO ====================
exports.gerarRecibo = async (req, res) => {
  try {
    const { id } = req.params;
    const { dados } = req.body;
    
    const facturaOriginal = await Factura.findById(id);
    if (!facturaOriginal) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Documento não encontrado' 
      });
    }

    if (facturaOriginal.status === 'pago') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Recibo já foi emitido para este documento' 
      });
    }

    const proximoNumero = await getProximoNumero(facturaOriginal.empresaNif, "Recibo");
    const numeroValido = typeof proximoNumero === 'number' && !isNaN(proximoNumero) && proximoNumero > 0 
      ? proximoNumero 
      : Math.floor(Date.now() / 1000) % 10000;

    const valorPago = dados?.valorPago || facturaOriginal.total;
    const troco = dados?.troco || 0;

    const recibo = new Factura({
      numeroFactura: numeroValido,
      serie: "RC",
      tipo: "Recibo",
      empresaNif: facturaOriginal.empresaNif,
      empresaId: facturaOriginal.empresaId,
      cliente: facturaOriginal.cliente,
      clienteId: facturaOriginal.clienteId,
      nifCliente: facturaOriginal.nifCliente,
      enderecoCliente: facturaOriginal.enderecoCliente,
      emailCliente: facturaOriginal.emailCliente,
      telefoneCliente: facturaOriginal.telefoneCliente,
      itens: facturaOriginal.itens,
      subtotal: facturaOriginal.subtotal,
      totalIva: facturaOriginal.totalIva,
      desconto: facturaOriginal.desconto,
      total: facturaOriginal.total,
      formaPagamento: dados?.formaPagamento || facturaOriginal.formaPagamento,
      detalhesPagamento: {
        ...facturaOriginal.detalhesPagamento?.toObject(),
        dataPagamento: new Date(),
        valorPago: valorPago,
        troco: troco,
        contaBancaria: dados?.contaBancaria || facturaOriginal.contaBancaria
      },
      status: "pago",
      valorPago: valorPago,
      troco: troco,
      usuario: req.user?.nome || "Sistema",
      documentoOriginalId: facturaOriginal._id,
      dataEmissao: new Date(),
      impressoes: 1
    });

    await recibo.save();

    facturaOriginal.status = 'pago';
    facturaOriginal.dataPagamento = new Date();
    facturaOriginal.valorPago = (facturaOriginal.valorPago || 0) + valorPago;
    await facturaOriginal.save();

    res.status(201).json({
      sucesso: true,
      mensagem: `Recibo Nº ${numeroValido} emitido com sucesso!`,
      dados: recibo
    });
  } catch (error) {
    console.error('Erro ao gerar recibo:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao gerar recibo',
      erro: error.message 
    });
  }
};

// ==================== NOTA DE CRÉDITO ====================
exports.gerarNotaCredito = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, observacoes, itensEstornados } = req.body;
    
    const facturaOriginal = await Factura.findById(id);
    if (!facturaOriginal) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Factura original não encontrada"
      });
    }
    
    const notaCreditoExistente = await Factura.findOne({
      empresaNif: facturaOriginal.empresaNif,
      serie: "NC",
      notaCreditoOriginalId: id
    });
    
    if (notaCreditoExistente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Já existe uma nota de crédito para esta factura"
      });
    }
    
    const numeroNotaCredito = await getProximoNumeroNotaCredito(facturaOriginal.empresaNif);
    const numeroValido = typeof numeroNotaCredito === 'number' && !isNaN(numeroNotaCredito) && numeroNotaCredito > 0 
      ? numeroNotaCredito 
      : Math.floor(Date.now() / 1000) % 10000;
    
    // Processar itens da nota de crédito (valores negativos)
    let itensNC = [];
    if (itensEstornados && itensEstornados.length > 0) {
      itensNC = itensEstornados.map((item, idx) => ({
        ...item,
        linha: idx + 1,
        total: -Math.abs(item.total),
        quantidade: -Math.abs(item.quantidade)
      }));
    } else {
      itensNC = facturaOriginal.itens.map((item, idx) => ({
        ...item.toObject(),
        linha: idx + 1,
        total: -Math.abs(item.total),
        quantidade: -Math.abs(item.quantidade)
      }));
    }
    
    const subtotalNC = -Math.abs(facturaOriginal.subtotal);
    const totalIvaNC = -Math.abs(facturaOriginal.totalIva);
    const totalNC = -Math.abs(facturaOriginal.total);
    
    const notaCredito = new Factura({
      numeroFactura: numeroValido,
      serie: "NC",
      tipo: "Nota Credito",
      empresaNif: facturaOriginal.empresaNif,
      empresaId: facturaOriginal.empresaId,
      cliente: facturaOriginal.cliente,
      clienteId: facturaOriginal.clienteId,
      nifCliente: facturaOriginal.nifCliente,
      enderecoCliente: facturaOriginal.enderecoCliente,
      emailCliente: facturaOriginal.emailCliente,
      telefoneCliente: facturaOriginal.telefoneCliente,
      tipoActividade: facturaOriginal.tipoActividade,
      itens: itensNC,
      subtotal: subtotalNC,
      totalIva: totalIvaNC,
      desconto: facturaOriginal.desconto,
      totalRetencao: facturaOriginal.totalRetencao,
      taxaRetencao: facturaOriginal.taxaRetencao,
      total: totalNC,
      formaPagamento: facturaOriginal.formaPagamento,
      status: "emitido",
      usuario: req.user?.nome || "Sistema",
      hashDocumento: crypto.createHash('sha256')
        .update(`${facturaOriginal.empresaNif}|NC${numeroValido}|${new Date().toISOString()}|${totalNC}`)
        .digest('hex'),
      dataEmissao: new Date(),
      notaCreditoOriginalId: facturaOriginal._id,
      motivoNotaCredito: motivo || "Anulação de factura",
      observacoes: observacoes || `Nota de crédito referente à factura ${facturaOriginal.serie} ${facturaOriginal.numeroFactura}`,
      impressoes: 0
    });
    
    await notaCredito.save();
    
    facturaOriginal.status = 'estornado';
    facturaOriginal.notaCreditoId = notaCredito._id;
    await facturaOriginal.save();
    
    // Restaurar estoque se necessário
    for (const item of facturaOriginal.itens) {
      if (item.tipo === 'produto' && item.produtoId) {
        const produto = await Stock.findById(item.produtoId);
        if (produto) {
          produto.quantidade += Math.abs(item.quantidade);
          await produto.save();
        }
      }
    }
    
    res.status(201).json({
      sucesso: true,
      mensagem: `Nota de crédito gerada com sucesso! Nº: ${numeroValido}`,
      dados: notaCredito
    });
    
  } catch (error) {
    console.error("Erro ao gerar nota de crédito:", error);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao gerar nota de crédito",
      erro: error.message
    });
  }
};

// ==================== CONVERSÕES ====================
exports.converterOrcamentoParaProforma = async (req, res) => {
  try {
    const orcamento = await Factura.findById(req.params.id);
    if (!orcamento) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Orçamento não encontrado' 
      });
    }

    if (orcamento.tipo !== "Orcamento") {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Este documento não é um Orçamento' 
      });
    }

    if (orcamento.status === 'convertido') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Este orçamento já foi convertido' 
      });
    }

    const proximoNumero = await getProximoNumero(orcamento.empresaNif, 'Factura Proforma');
    const numeroValido = typeof proximoNumero === 'number' && !isNaN(proximoNumero) && proximoNumero > 0 
      ? proximoNumero 
      : Math.floor(Date.now() / 1000) % 10000;

    const proforma = new Factura({
      numeroFactura: numeroValido,
      serie: "FP",
      tipo: "Factura Proforma",
      empresaNif: orcamento.empresaNif,
      empresaId: orcamento.empresaId,
      cliente: orcamento.cliente,
      clienteId: orcamento.clienteId,
      nifCliente: orcamento.nifCliente,
      enderecoCliente: orcamento.enderecoCliente,
      emailCliente: orcamento.emailCliente,
      telefoneCliente: orcamento.telefoneCliente,
      itens: orcamento.itens,
      subtotal: orcamento.subtotal,
      totalIva: orcamento.totalIva,
      desconto: orcamento.desconto,
      total: orcamento.total,
      formaPagamento: orcamento.formaPagamento,
      status: "rascunho",
      usuario: req.user?.nome || "Sistema",
      documentoOriginalId: orcamento._id,
      observacoes: orcamento.observacoes,
      impressoes: 1
    });

    await proforma.save();

    orcamento.status = "convertido";
    await orcamento.save();

    res.json({
      sucesso: true,
      mensagem: `Orçamento convertido em Factura Proforma Nº ${numeroValido}`,
      dados: proforma
    });
  } catch (error) {
    console.error('Erro ao converter orçamento:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao converter orçamento',
      erro: error.message 
    });
  }
};

exports.converterProformaParaFactura = async (req, res) => {
  try {
    const proforma = await Factura.findById(req.params.id);
    if (!proforma) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Proforma não encontrada' 
      });
    }

    if (proforma.tipo !== "Factura Proforma") {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Este documento não é uma Factura Proforma' 
      });
    }

    if (proforma.status === 'convertido') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Esta proforma já foi convertida' 
      });
    }

    const proximoNumero = await getProximoNumero(proforma.empresaNif, 'Factura');
    const numeroValido = typeof proximoNumero === 'number' && !isNaN(proximoNumero) && proximoNumero > 0 
      ? proximoNumero 
      : Math.floor(Date.now() / 1000) % 10000;

    // Processar itens com validação de estoque (apenas produtos)
    for (const item of proforma.itens) {
      if (item.tipo === 'produto' && item.produtoId) {
        const produto = await Stock.findById(item.produtoId);
        if (produto && produto.quantidade < Math.abs(item.quantidade)) {
          return res.status(400).json({
            sucesso: false,
            mensagem: `Estoque insuficiente para "${item.produtoOuServico}". Disponível: ${produto.quantidade}`
          });
        }
        if (produto) {
          produto.quantidade -= Math.abs(item.quantidade);
          await produto.save();
        }
      }
    }

    const factura = new Factura({
      numeroFactura: numeroValido,
      serie: "FT",
      tipo: "Factura",
      empresaNif: proforma.empresaNif,
      empresaId: proforma.empresaId,
      cliente: proforma.cliente,
      clienteId: proforma.clienteId,
      nifCliente: proforma.nifCliente,
      enderecoCliente: proforma.enderecoCliente,
      emailCliente: proforma.emailCliente,
      telefoneCliente: proforma.telefoneCliente,
      itens: proforma.itens,
      subtotal: proforma.subtotal,
      totalIva: proforma.totalIva,
      desconto: proforma.desconto,
      total: proforma.total,
      formaPagamento: proforma.formaPagamento,
      status: "emitido",
      usuario: req.user?.nome || "Sistema",
      documentoOriginalId: proforma._id,
      observacoes: proforma.observacoes,
      impressoes: 1
    });

    await factura.save();

    proforma.status = "convertido";
    await proforma.save();

    res.json({
      sucesso: true,
      mensagem: `Factura Proforma convertida em Factura Nº ${numeroValido}`,
      dados: factura
    });
  } catch (error) {
    console.error('Erro ao converter proforma:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao converter proforma',
      erro: error.message 
    });
  }
};

// ==================== LISTAR DOCUMENTOS (COM FILTROS) ====================
exports.listarDocumentos = async (req, res) => {
  try {
    const { 
      empresaId,
      tipo,
      status,
      dataInicio,
      dataFim,
      cliente,
      tipoItem,
      page = 1,
      limit = 50
    } = req.query;

    if (!empresaId || empresaId === 'null' || empresaId === 'undefined') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'ID da empresa é obrigatório' 
      });
    }

    const query = { empresaId };
    if (tipo && tipo !== 'Todos') query.tipo = tipo;
    if (status && status !== 'Todos') query.status = status;
    if (cliente) query.cliente = { $regex: cliente, $options: 'i' };
    
    // Filtro por tipo de item (produto/servico)
    if (tipoItem && tipoItem !== 'todos') {
      query['itens.tipo'] = tipoItem;
    }
    
    if (dataInicio && dataFim) {
      query.dataEmissao = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }

    const documentos = await Factura.find(query)
      .sort({ dataEmissao: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Factura.countDocuments(query);

    // Estatísticas adicionais
    const stats = await Factura.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalValor: { $sum: '$total' },
          totalDocumentos: { $sum: 1 }
        }
      }
    ]);

    res.json({
      sucesso: true,
      dados: documentos,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit)),
      estatisticas: stats[0] || { totalValor: 0, totalDocumentos: 0 }
    });
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao listar documentos',
      erro: error.message 
    });
  }
};

// ==================== BUSCAR DOCUMENTO POR ID ====================
exports.getDocumentoById = async (req, res) => {
  try {
    const documento = await Factura.findById(req.params.id);
    if (!documento) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Documento não encontrado' 
      });
    }
    res.json({ 
      sucesso: true, 
      dados: documento 
    });
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar documento',
      erro: error.message 
    });
  }
};

// ==================== SEGUNDA VIA ====================
exports.segundaVia = async (req, res) => {
  try {
    const documentoOriginal = await Factura.findById(req.params.id);
    if (!documentoOriginal) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Documento não encontrado' 
      });
    }

    documentoOriginal.impressoes = (documentoOriginal.impressoes || 0) + 1;
    documentoOriginal.ultimaImpressao = new Date();
    if (!documentoOriginal.segundaVia) {
      documentoOriginal.segundaVia = true;
      documentoOriginal.motivoSegundaVia = req.body.motivo || "Solicitação do cliente";
    }
    await documentoOriginal.save();

    res.json({
      sucesso: true,
      mensagem: `Segunda via gerada (impressão Nº ${documentoOriginal.impressoes})`,
      dados: documentoOriginal,
      segundaVia: true
    });
  } catch (error) {
    console.error('Erro ao gerar segunda via:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao gerar segunda via',
      erro: error.message 
    });
  }
};

// ==================== MARCAR COMO PAGO ====================
exports.marcarComoPago = async (req, res) => {
  try {
    const documento = await Factura.findById(req.params.id);
    if (!documento) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Documento não encontrado' 
      });
    }

    if (documento.status === 'pago') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Documento já está marcado como pago' 
      });
    }

    documento.status = 'pago';
    documento.dataPagamento = new Date();
    documento.valorPago = documento.total;
    await documento.save();

    res.json({
      sucesso: true,
      mensagem: `${documento.tipo} Nº ${documento.numeroFactura || documento.numeroDocumento} marcada como PAGA`,
      dados: documento
    });
  } catch (error) {
    console.error('Erro ao marcar como pago:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao marcar documento como pago',
      erro: error.message 
    });
  }
};

// ==================== CANCELAR DOCUMENTO ====================
exports.cancelarDocumento = async (req, res) => {
  try {
    const documento = await Factura.findById(req.params.id);
    if (!documento) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Documento não encontrado' 
      });
    }

    if (documento.status === 'cancelado') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Documento já está cancelado' 
      });
    }

    if (documento.status === 'pago') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Não é possível cancelar um documento já pago' 
      });
    }

    documento.status = 'cancelado';
    documento.dataCancelamento = new Date();
    documento.motivoCancelamento = req.body.motivo || "Cancelamento solicitado";
    await documento.save();

    res.json({
      sucesso: true,
      mensagem: `${documento.tipo} Nº ${documento.numeroFactura || documento.numeroDocumento} cancelado com sucesso`
    });
  } catch (error) {
    console.error('Erro ao cancelar documento:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao cancelar documento',
      erro: error.message 
    });
  }
};

// ==================== ESTATÍSTICAS ====================
exports.getStats = async (req, res) => {
  try {
    const { empresaId, ano, mes, tipoItem } = req.query;

    if (!empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'ID da empresa é obrigatório' 
      });
    }

    const query = { empresaId, status: { $nin: ['cancelado', 'estornado'] } };
    
    if (tipoItem && tipoItem !== 'todos') {
      query['itens.tipo'] = tipoItem;
    }
    
    if (ano) {
      const anoNum = parseInt(ano);
      if (mes) {
        const mesNum = parseInt(mes);
        query.dataEmissao = {
          $gte: new Date(anoNum, mesNum - 1, 1),
          $lt: new Date(anoNum, mesNum, 1)
        };
      } else {
        query.dataEmissao = {
          $gte: new Date(anoNum, 0, 1),
          $lt: new Date(anoNum + 1, 0, 1)
        };
      }
    }

    const stats = await Factura.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalDocumentos: { $sum: 1 },
          totalValor: { $sum: '$total' },
          totalIva: { $sum: '$totalIva' },
          mediaValor: { $avg: '$total' }
        }
      }
    ]);

    const porTipo = await Factura.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$tipo',
          total: { $sum: 1 },
          valor: { $sum: '$total' }
        }
      }
    ]);

    // Estatísticas de serviços vs produtos
    const servicosStats = await Factura.aggregate([
      { $match: { ...query, 'itens.tipo': 'servico' } },
      { $unwind: '$itens' },
      { $match: { 'itens.tipo': 'servico' } },
      {
        $group: {
          _id: null,
          totalServicos: { $sum: 1 },
          valorServicos: { $sum: '$itens.total' }
        }
      }
    ]);

    res.json({
      sucesso: true,
      dados: {
        geral: stats[0] || { totalDocumentos: 0, totalValor: 0, totalIva: 0, mediaValor: 0 },
        porTipo,
        servicos: servicosStats[0] || { totalServicos: 0, valorServicos: 0 }
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao obter estatísticas',
      erro: error.message 
    });
  }
};

exports.getDocumentosPorTipoItem = async (req, res) => {
  try {
    const { empresaId, tipoItem } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const query = { 
      empresaId,
      'itens.tipo': tipoItem // 'produto' ou 'servico'
    };
    
    const documentos = await Factura.find(query)
      .sort({ dataEmissao: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
      
    const total = await Factura.countDocuments(query);
    
    res.json({
      sucesso: true,
      dados: documentos,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};