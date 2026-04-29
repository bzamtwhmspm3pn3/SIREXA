const mongoose = require('mongoose');
const Factura = require('../models/Factura');
const Stock = require('../models/Stock');
const Empresa = require('../models/Empresa');
const crypto = require('crypto');

// ==================== HELPERS CORRIGIDOS ====================

// Helper genérico para próximo número (CORRIGIDO - Garante que nunca retorna null)
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
    
    console.log(`🔍 Buscando próximo número para ${tipoDocumento}:`, filtro);
    
    const ultimoDoc = await Factura.findOne(filtro).sort({ [campoBusca]: -1 });
    
    let proximoNumero = 1;
    if (ultimoDoc && ultimoDoc[campoBusca] && typeof ultimoDoc[campoBusca] === 'number') {
      proximoNumero = ultimoDoc[campoBusca] + 1;
    }
    
    console.log(`✅ Próximo número para ${tipoDocumento}: ${proximoNumero}`);
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
    
    console.log(`📄 Próximo número para Nota de Crédito (NC): ${proximoNumero}`);
    return proximoNumero;
    
  } catch (error) {
    console.error('Erro ao buscar próximo número para NC:', error);
    return Math.floor(Date.now() / 1000) % 10000;
  }
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

    const itensOrcamento = dados.itens.map((item, idx) => ({
      linha: idx + 1,
      produtoOuServico: item.produtoOuServico,
      codigoProduto: item.codigoBarras || item.produtoOuServico,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      total: item.quantidade * item.precoUnitario,
      taxaIVA: item.taxaIVA || 14,
      iva: (item.quantidade * item.precoUnitario) * ((item.taxaIVA || 14) / 100)
    }));

    const subtotal = itensOrcamento.reduce((acc, item) => acc + item.total, 0);
    const totalIva = itensOrcamento.reduce((acc, item) => acc + item.iva, 0);
    const total = subtotal + totalIva - (dados.desconto || 0);

    const orcamento = new Factura({
      numeroDocumento: numeroValido,
      tipo: "Orcamento",
      empresaNif,
      empresaId: empresa._id,
      cliente: dados.cliente,
      nifCliente: dados.nifCliente,
      enderecoCliente: dados.enderecoCliente || "",
      emailCliente: dados.emailCliente || "",
      telefoneCliente: dados.telefoneCliente || "",
      itens: itensOrcamento,
      subtotal: subtotal,
      totalIva: totalIva,
      desconto: dados.desconto || 0,
      total: total,
      formaPagamento: dados.formaPagamento || "A definir",
      status: "rascunho",
      usuario: usuario,
      dataEmissao: new Date(),
      dataVencimento: new Date(Date.now() + 30 * 86400000),
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

// ==================== FACTURA PROFORMA (CORRIGIDA) ====================
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

    const itensProforma = dados.itens.map((item, idx) => ({
      linha: idx + 1,
      produtoOuServico: item.produtoOuServico,
      codigoProduto: item.codigoBarras || item.produtoOuServico,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      total: item.quantidade * item.precoUnitario,
      taxaIVA: item.taxaIVA || 14,
      iva: (item.quantidade * item.precoUnitario) * ((item.taxaIVA || 14) / 100)
    }));

    const subtotal = itensProforma.reduce((acc, item) => acc + item.total, 0);
    const totalIva = itensProforma.reduce((acc, item) => acc + item.iva, 0);
    const total = subtotal + totalIva - (dados.desconto || 0);

    const proforma = new Factura({
      numeroFactura: numeroValido,
      serie: "FP",
      tipo: "Factura Proforma",
      empresaNif,
      empresaId: empresa._id,
      cliente: dados.cliente,
      nifCliente: dados.nifCliente,
      enderecoCliente: dados.enderecoCliente || "",
      emailCliente: dados.emailCliente || "",
      telefoneCliente: dados.telefoneCliente || "",
      itens: itensProforma,
      subtotal: subtotal,
      totalIva: totalIva,
      desconto: dados.desconto || 0,
      total: total,
      formaPagamento: dados.formaPagamento || "A definir",
      status: "rascunho",
      usuario: usuario,
      dataEmissao: new Date(),
      dataVencimento: new Date(Date.now() + 15 * 86400000),
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

// ==================== FACTURA ====================
exports.emitirFactura = async (req, res) => {
  try {
    const { factura, empresaNif } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";

    if (!empresaNif || !factura.cliente || !factura.nifCliente || !factura.itens?.length) {
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

    const itensProcessados = [];
    for (let i = 0; i < factura.itens.length; i++) {
      const item = factura.itens[i];
      
      let produtoStock = await Stock.findOne({ 
        produto: { $regex: new RegExp(`^${item.produtoOuServico}$`, "i") }
      });

      if (!produtoStock) {
        return res.status(404).json({ 
          sucesso: false, 
          mensagem: `Produto "${item.produtoOuServico}" não encontrado no stock` 
        });
      }

      if (produtoStock.quantidade < item.quantidade) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: `Quantidade insuficiente para "${item.produtoOuServico}". Disponível: ${produtoStock.quantidade}` 
        });
      }
      
      produtoStock.quantidade -= item.quantidade;
      await produtoStock.save();
      
      const taxaIVA = item.taxaIVA || 14;
      const ivaItem = item.total * (taxaIVA / 100);
      
      itensProcessados.push({
        linha: i + 1,
        produtoId: produtoStock._id,
        produtoOuServico: item.produtoOuServico,
        codigoProduto: produtoStock.codigoBarras || item.codigoBarras || item.produtoOuServico,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        desconto: item.desconto || 0,
        total: item.total,
        taxaIVA: taxaIVA,
        iva: ivaItem
      });
    }

    const subtotal = itensProcessados.reduce((acc, item) => acc + item.total, 0);
    const totalIva = itensProcessados.reduce((acc, item) => acc + item.iva, 0);
    const totalFinal = subtotal + totalIva - (factura.desconto || 0);

    const hashString = `${empresaNif}|${numeroValido}|${new Date().toISOString()}|${totalFinal}`;
    const hashDocumento = crypto.createHash('sha256').update(hashString).digest('hex');

    const novaFactura = new Factura({
      numeroFactura: numeroValido,
      serie: "FT",
      tipo: factura.tipo || "Factura",
      empresaNif,
      empresaId: empresa._id,
      cliente: factura.cliente,
      nifCliente: factura.nifCliente,
      enderecoCliente: factura.enderecoCliente || "",
      emailCliente: factura.emailCliente || "",
      telefoneCliente: factura.telefoneCliente || "",
      tipoActividade: factura.tipoActividade || "Venda",
      itens: itensProcessados,
      subtotal: subtotal,
      totalIva: totalIva,
      desconto: factura.desconto || 0,
      total: totalFinal,
      formaPagamento: factura.formaPagamento,
      detalhesPagamento: factura.detalhesPagamento || {},
      status: "emitido",
      usuario: usuario,
      hashDocumento: hashDocumento,
      dataEmissao: new Date(),
      observacoes: factura.observacoes || "",
      dataVencimento: factura.dataVencimento || new Date(Date.now() + 30 * 86400000),
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

    const itensProcessados = dados.itens.map((item, idx) => ({
      linha: idx + 1,
      produtoOuServico: item.produtoOuServico,
      codigoProduto: item.codigoBarras || item.produtoOuServico,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      total: item.quantidade * item.precoUnitario,
      taxaIVA: item.taxaIVA || 14,
      iva: (item.quantidade * item.precoUnitario) * ((item.taxaIVA || 14) / 100)
    }));

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
    const facturaOriginal = await Factura.findById(req.params.id);
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

    const recibo = new Factura({
      numeroFactura: numeroValido,
      serie: "RC",
      tipo: "Recibo",
      empresaNif: facturaOriginal.empresaNif,
      empresaId: facturaOriginal.empresaId,
      cliente: facturaOriginal.cliente,
      nifCliente: facturaOriginal.nifCliente,
      enderecoCliente: facturaOriginal.enderecoCliente,
      itens: facturaOriginal.itens,
      subtotal: facturaOriginal.subtotal,
      totalIva: facturaOriginal.totalIva,
      desconto: facturaOriginal.desconto,
      total: facturaOriginal.total,
      formaPagamento: facturaOriginal.formaPagamento,
      detalhesPagamento: {
        ...facturaOriginal.detalhesPagamento,
        dataPagamento: new Date()
      },
      status: "pago",
      usuario: req.user?.nome || "Sistema",
      documentoOriginalId: facturaOriginal._id,
      dataEmissao: new Date(),
      dataPagamento: new Date(),
      valorPago: facturaOriginal.total,
      impressoes: 1
    });

    await recibo.save();

    facturaOriginal.status = 'pago';
    facturaOriginal.dataPagamento = new Date();
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
    const { motivo, observacoes } = req.body;
    
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
      facturaOriginalId: id
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
    
    const notaCreditoData = {
      numeroFactura: numeroValido,
      serie: "NC",
      tipo: "Nota Credito",
      empresaNif: facturaOriginal.empresaNif,
      empresaId: facturaOriginal.empresaId,
      cliente: facturaOriginal.cliente,
      nifCliente: facturaOriginal.nifCliente,
      enderecoCliente: facturaOriginal.enderecoCliente,
      tipoActividade: facturaOriginal.tipoActividade,
      itens: facturaOriginal.itens.map(item => ({
        ...item.toObject(),
        total: -Math.abs(item.total)
      })),
      subtotal: -Math.abs(facturaOriginal.subtotal),
      totalIva: -Math.abs(facturaOriginal.totalIva),
      desconto: -Math.abs(facturaOriginal.desconto || 0),
      totalRetencao: -Math.abs(facturaOriginal.totalRetencao || 0),
      taxaRetencao: facturaOriginal.taxaRetencao || 0,
      total: -Math.abs(facturaOriginal.total),
      formaPagamento: facturaOriginal.formaPagamento,
      status: "emitido",
      usuario: req.user?.nome || "Sistema",
      hashDocumento: crypto.createHash('sha256')
        .update(`${facturaOriginal.empresaNif}|NC${numeroValido}|${new Date().toISOString()}|${-Math.abs(facturaOriginal.total)}`)
        .digest('hex'),
      dataEmissao: new Date(),
      dataAtualizacao: new Date(),
      facturaOriginalId: facturaOriginal._id,
      motivoNotaCredito: motivo || "Anulação de factura",
      observacoes: observacoes || `Nota de crédito referente à factura ${facturaOriginal.serie} ${facturaOriginal.numeroFactura}`,
      impressoes: 0
    };
    
    const novaNotaCredito = new Factura(notaCreditoData);
    await novaNotaCredito.save();
    
    facturaOriginal.temNotaCredito = true;
    facturaOriginal.notaCreditoId = novaNotaCredito._id;
    await facturaOriginal.save();
    
    res.status(201).json({
      sucesso: true,
      mensagem: `Nota de crédito gerada com sucesso! Nº: ${novaNotaCredito.serie}/${novaNotaCredito.numeroFactura}`,
      dados: novaNotaCredito
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

    const factura = new Factura({
      numeroFactura: numeroValido,
      serie: "FT",
      tipo: "Factura",
      empresaNif: proforma.empresaNif,
      empresaId: proforma.empresaId,
      cliente: proforma.cliente,
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

// ==================== LISTAR DOCUMENTOS ====================
exports.listarDocumentos = async (req, res) => {
  try {
    const { 
      empresaId,
      tipo,
      status,
      dataInicio,
      dataFim,
      cliente,
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

    res.json({
      sucesso: true,
      dados: documentos,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
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

// ==================== OUTRAS FUNÇÕES ====================
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

exports.getStats = async (req, res) => {
  try {
    const { empresaId, ano, mes } = req.query;

    if (!empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'ID da empresa é obrigatório' 
      });
    }

    const query = { empresaId, status: { $nin: ['cancelado', 'estornado'] } };
    
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

    res.json({
      sucesso: true,
      dados: {
        geral: stats[0] || { totalDocumentos: 0, totalValor: 0, totalIva: 0, mediaValor: 0 },
        porTipo
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