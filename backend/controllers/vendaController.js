// backend/controllers/vendaController.js
const mongoose = require('mongoose');
const Venda = require('../models/Venda');
const Factura = require('../models/Factura');
const Stock = require('../models/Stock');
const Empresa = require('../models/Empresa');
const Banco = require('../models/Banco');
const RegistoBancario = require('../models/RegistoBancario');
const Cliente = require('../models/Cliente');
const crypto = require('crypto');
const integracaoPagamentos = require('../services/integracaoPagamentos');

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Helper para próximo número de factura
const getProximoNumeroFactura = async (empresaId, serie = "FT") => {
  try {
    const ultimaFactura = await Factura.findOne({ empresaId, serie }).sort({ numeroFactura: -1 });
    return ultimaFactura ? ultimaFactura.numeroFactura + 1 : 1;
  } catch (error) {
    console.error('Erro ao buscar próximo número de factura:', error);
    return 1;
  }
};

// Helper para próximo número de venda
const getProximoNumeroVenda = async (empresaId, serie = "FT") => {
  try {
    const ultimaVenda = await Venda.findOne({ empresaId, serie }).sort({ numeroFactura: -1 });
    return ultimaVenda ? ultimaVenda.numeroFactura + 1 : 1;
  } catch (error) {
    console.error('Erro ao buscar próximo número de venda:', error);
    return 1;
  }
};

// Função para criar ou atualizar cliente
async function criarOuAtualizarCliente(dadosCliente, empresaId, empresaNif) {
  try {
    if (!dadosCliente.nif || dadosCliente.nif === '999999999' || dadosCliente.nif === '000000000') {
      console.log('⚠️ Cliente sem NIF válido, não será cadastrado');
      return null;
    }
    
    let cliente = await Cliente.findOne({ 
      nif: dadosCliente.nif, 
      empresaId 
    });
    
    if (cliente) {
      cliente.nome = dadosCliente.nome || cliente.nome;
      cliente.email = dadosCliente.email || cliente.email;
      cliente.telefone = dadosCliente.telefone || cliente.telefone;
      cliente.endereco = dadosCliente.endereco || cliente.endereco;
      cliente.updatedAt = new Date();
      await cliente.save();
      console.log(`✅ Cliente atualizado: ${cliente.nome} (${cliente.nif})`);
    } else {
      cliente = new Cliente({
        nome: dadosCliente.nome,
        nif: dadosCliente.nif,
        email: dadosCliente.email || '',
        telefone: dadosCliente.telefone || '',
        endereco: dadosCliente.endereco || '',
        cidade: dadosCliente.cidade || 'Luanda',
        tipo: dadosCliente.tipo || 'particular',
        empresaId: empresaId,
        ativo: true
      });
      await cliente.save();
      console.log(`✅ Novo cliente cadastrado: ${cliente.nome} (${cliente.nif})`);
    }
    
    return cliente;
  } catch (error) {
    console.error('❌ Erro ao criar/atualizar cliente:', error);
    return null;
  }
}

// Função para criar registo bancário da venda
async function criarRegistoBancarioVenda(venda, empresa, contaBancaria, iban) {
  try {
    const dataVenda = new Date(venda.data);
    const ano = dataVenda.getFullYear();
    const mes = meses[dataVenda.getMonth()];
    
    const banco = await Banco.findOne({ codNome: contaBancaria, empresaId: empresa._id });
    
    const tipoReceita = venda.tipoFactura === 'Prestação de Serviço' ? 'Receita - Serviço' : 'Receita - Venda';
    
    const registo = new RegistoBancario({
      data: dataVenda,
      conta: contaBancaria,
      contaId: banco?._id,
      descricao: `VENDA: ${venda.cliente} - Factura Nº ${venda.numeroFactura}`,
      tipo: tipoReceita,
      valor: venda.total,
      entradaSaida: 'entrada',
      ano,
      mes,
      documentoReferencia: venda._id.toString(),
      reconcilado: false,
      empresaId: empresa._id
    });
    
    await registo.save();
    console.log(`✅ Registo bancário criado para venda ${venda._id}: ${venda.total} Kz na conta ${contaBancaria}`);
    return registo;
  } catch (error) {
    console.error('Erro ao criar registo bancário:', error);
    return null;
  }
}

// POST /api/vendas/emitir
exports.emitirVenda = async (req, res) => {
  try {
    const { venda, contaBancaria, ibanBancario } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    // 🔥 USAR O VALOR VALIDADO PELO MIDDLEWARE
    const empresaIdParaVenda = req.empresaAtual;
    
    console.log('=== INICIANDO EMISSÃO DE VENDA ===');
    console.log('Usuário:', usuario);
    console.log('empresaAtual (validado):', empresaIdParaVenda);
    console.log('Empresas permitidas:', req.user?.empresasPermitidas);

    if (!empresaIdParaVenda) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Nenhuma empresa selecionada. Selecione uma empresa para continuar.' 
      });
    }

    const empresa = await Empresa.findById(empresaIdParaVenda);
    
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: `Empresa não encontrada: ${empresaIdParaVenda}` 
      });
    }

    console.log('✅ Empresa:', empresa.nome);
    console.log('🏢 ID:', empresa._id);


        // Validações básicas
    if (!venda || !venda.cliente) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Dados do cliente são obrigatórios' 
      });
    }

    if (!venda.itens || venda.itens.length === 0) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Adicione pelo menos um item à venda' 
      });
    }

    if (!venda.formaPagamento) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Forma de pagamento é obrigatória' 
      });
    }

    // CRIAR/ATUALIZAR CLIENTE
    let cliente = null;
    if (venda.nifCliente && venda.nifCliente !== '999999999' && venda.nifCliente !== '000000000') {
      cliente = await criarOuAtualizarCliente({
        nome: venda.cliente,
        nif: venda.nifCliente,
        email: venda.emailCliente || '',
        telefone: venda.telefoneCliente || '',
        endereco: venda.enderecoCliente || '',
        cidade: venda.cidadeCliente || 'Luanda'
      }, empresa._id, empresa.nif);
    }

    // Definir conta bancária
    const contaParaVenda = contaBancaria || empresa.contaBancariaPadrao || 'BAI01';
    const ibanParaVenda = ibanBancario || empresa.ibanPadrao || '';
    
    console.log(`🏦 Conta bancária para esta venda: ${contaParaVenda}`);

    // Obter números sequenciais
    const numeroFactura = await getProximoNumeroFactura(empresa._id);
    const numeroVenda = await getProximoNumeroVenda(empresa._id);
    console.log(`✅ Números: Factura ${numeroFactura}, Venda ${numeroVenda}`);

    // Processar itens e abater estoque
    const itensProcessados = [];
    for (let i = 0; i < venda.itens.length; i++) {
      const item = venda.itens[i];
      console.log(`Processando item ${i + 1}:`, item.produtoOuServico);
      
      let produtoStock = null;
      
      if (item.produtoId) {
        produtoStock = await Stock.findOne({ 
          _id: item.produtoId, 
          empresaId: empresa._id,
          ativo: true 
        });
      } else {
        produtoStock = await Stock.findOne({ 
          produto: { $regex: new RegExp(`^${item.produtoOuServico}$`, "i") },
          empresaId: empresa._id,
          ativo: true 
        });
      }

      if (!produtoStock) {
        return res.status(404).json({ 
          sucesso: false, 
          mensagem: `Produto "${item.produtoOuServico}" não encontrado no stock da empresa` 
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

    // Calcular totais
    const subtotal = itensProcessados.reduce((acc, item) => acc + item.total, 0);
    const totalIva = itensProcessados.reduce((acc, item) => acc + item.iva, 0);
    const desconto = venda.desconto || 0;
    const subtotalComDesconto = subtotal - desconto;

    let totalRetencao = 0;
    let taxaRetencaoAplicada = 0;

    if (venda.retencao && venda.retencao > 0) {
      if (venda.taxaRetencao && venda.taxaRetencao > 0) {
        taxaRetencaoAplicada = venda.taxaRetencao;
        totalRetencao = (subtotalComDesconto * taxaRetencaoAplicada) / 100;
      } else {
        totalRetencao = venda.retencao;
        taxaRetencaoAplicada = (totalRetencao / subtotalComDesconto) * 100;
      }
    }

    const totalFinal = subtotalComDesconto + totalIva - totalRetencao;

    // Criar hash do documento
    const hashString = `${empresa.nif}|${numeroFactura}|${new Date().toISOString()}|${totalFinal}`;
    const hashDocumento = crypto.createHash('sha256').update(hashString).digest('hex');

    // 1. CRIAR VENDA
    const novaVenda = new Venda({
      empresaNif: empresa.nif,
      empresaId: empresa._id,
      contaBancaria: contaParaVenda,
      ibanBancario: ibanParaVenda,
      numeroFactura: numeroVenda,
      serie: "FT",
      tipoDocumento: "FT",
      cliente: venda.cliente,
      clienteId: cliente?._id,
      nifCliente: venda.nifCliente || '999999999',
      enderecoCliente: venda.enderecoCliente || "",
      paisCliente: venda.paisCliente || "AO",
      tipoFactura: venda.tipoFactura || "Venda",
      itens: itensProcessados,
      subtotal: subtotal,
      totalIva: totalIva,
      totalRetencao: totalRetencao,
      taxaRetencao: taxaRetencaoAplicada,
      desconto: venda.desconto || 0,
      total: totalFinal,
      formaPagamento: venda.formaPagamento,
      detalhesPagamento: {
        ...venda.detalhesPagamento,
        dataPagamento: new Date()
      },
      status: "finalizada",
      usuario: usuario,
      hashDocumento: hashDocumento,
      data: new Date(),
      dataAtualizacao: new Date()
    });

    await novaVenda.save();
    console.log(`✅ Venda salva! ID: ${novaVenda._id}`);

    // 2. CRIAR FACTURA
    const novaFactura = new Factura({
      numeroFactura: numeroFactura,
      serie: "FT",
      tipo: "Factura",
      empresaNif: empresa.nif,
      empresaId: empresa._id,
      cliente: venda.cliente,
      nifCliente: venda.nifCliente || '999999999',
      enderecoCliente: venda.enderecoCliente || "",
      tipoActividade: venda.tipoFactura || "Venda",
      itens: itensProcessados.map((item, idx) => ({
        ...item,
        linha: idx + 1
      })),
      subtotal: subtotal,
      totalIva: totalIva,
      desconto: desconto,
      totalRetencao: totalRetencao,
      taxaRetencao: taxaRetencaoAplicada,
      total: totalFinal,
      formaPagamento: venda.formaPagamento,
      detalhesPagamento: {
        ...venda.detalhesPagamento,
        dataPagamento: new Date()
      },
      status: "emitido",
      usuario: usuario,
      hashDocumento: hashDocumento,
      vendaOriginalId: novaVenda._id,
      dataEmissao: new Date(),
      impressoes: 1
    });

    await novaFactura.save();
    console.log(`✅ Factura salva! Nº ${numeroFactura}`);

    // 3. CRIAR REGISTO BANCÁRIO
    await criarRegistoBancarioVenda(novaVenda, empresa, contaParaVenda, ibanParaVenda);

    // 4. INTEGRAÇÃO COM CONTROLO DE PAGAMENTOS
    if (venda.formaPagamento !== 'Dinheiro') {
      try {
        const pagamento = await integracaoPagamentos.integrarVenda(novaVenda, empresa, usuario);
        if (pagamento) {
          console.log(`✅ Conta a receber criada: ${pagamento.referencia} - Valor: ${pagamento.valor} Kz`);
        }
      } catch (err) {
        console.error('⚠️ Erro ao integrar com pagamentos:', err.message);
      }
    }

    res.status(201).json({
      sucesso: true,
      mensagem: `Venda registrada com sucesso! Factura Nº ${numeroFactura}`,
      dados: {
        venda: novaVenda,
        factura: novaFactura,
        cliente: cliente,
        contaBancaria: contaParaVenda
      },
      proximoNumero: numeroFactura + 1
    });

  } catch (error) {
    console.error('=== ERRO NA EMISSÃO DE VENDA ===');
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao processar venda',
      erro: error.message 
    });
  }
};

// GET /api/vendas/proximo-numero/:empresaNif
exports.getProximoNumero = async (req, res) => {
  try {
    const { empresaNif } = req.params;
    const usuarioEmpresaId = req.user?.empresaId;
    
    console.log('🔢 Buscando próximo número');
    console.log('Empresa NIF:', empresaNif);
    
    const empresa = await Empresa.findOne({ nif: empresaNif });
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    // 🔒 Verificar se o gestor tem acesso a esta empresa
    if (usuarioEmpresaId && empresa._id.toString() !== usuarioEmpresaId.toString()) {
      console.error(`❌ ACESSO NEGADO: Usuário tentou acessar empresa ${empresa.nome}`);
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado' 
      });
    }
    
    const proximo = await getProximoNumeroFactura(empresa._id);
    res.json({ 
      sucesso: true, 
      proximo 
    });
  } catch (error) {
    console.error('Erro ao buscar próximo número:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar próximo número',
      erro: error.message 
    });
  }
};

// GET /api/vendas/historico/:empresaId
exports.getHistorico = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const usuarioEmpresaId = req.user?.empresaId;
    const usuarioNome = req.user?.nome;
    
    console.log('📊 Buscando histórico de vendas');
    console.log('👤 Usuário:', usuarioNome);
    console.log('🏢 Empresa ID solicitado:', empresaId);
    console.log('🏢 Empresa ID do token:', usuarioEmpresaId);
    
    if (!empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'ID da empresa é obrigatório' 
      });
    }
    
    // 🔒 VALIDAÇÃO COMENTADA TEMPORARIAMENTE PARA TESTE
    /*
    if (usuarioEmpresaId && empresaId.toString() !== usuarioEmpresaId.toString()) {
      console.error(`❌ ACESSO NEGADO: Usuário ${usuarioNome} tentou acessar vendas da empresa ${empresaId}`);
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado. Você não tem permissão para ver vendas desta empresa.' 
      });
    }
    */
    
    const { page = 1, limit = 50, dataInicio, dataFim } = req.query;
    
    const query = { empresaId };
    
    if (dataInicio && dataFim) {
      query.data = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }
    
    console.log('🔍 Query:', JSON.stringify(query));
    
    const vendas = await Venda.find(query)
      .sort({ data: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('clienteId', 'nome nif telefone email');

    const total = await Venda.countDocuments(query);
    
    console.log(`✅ Encontradas ${vendas.length} vendas para empresa ${empresaId}`);
    
    res.json({
      sucesso: true,
      dados: vendas,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar histórico',
      erro: error.message 
    });
  }
};

// GET /api/vendas/:id
exports.getVendaById = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioEmpresaId = req.user?.empresaId;
    
    if (!id) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'ID da venda é obrigatório' 
      });
    }
    
    const venda = await Venda.findById(id).populate('clienteId', 'nome nif telefone email');
    
    if (!venda) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Venda não encontrada' 
      });
    }
    
    // 🔒 Verificar se o gestor tem acesso a esta venda
    if (usuarioEmpresaId && venda.empresaId.toString() !== usuarioEmpresaId.toString()) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado' 
      });
    }
    
    res.json({ 
      sucesso: true, 
      dados: venda 
    });
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar venda',
      erro: error.message 
    });
  }
};

// DELETE /api/vendas/:id (cancelar venda)
exports.cancelarVenda = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioEmpresaId = req.user?.empresaId;
    
    if (!id) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'ID da venda é obrigatório' 
      });
    }
    
    const venda = await Venda.findById(id);
    if (!venda) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Venda não encontrada' 
      });
    }

    // 🔒 Verificar se o gestor tem acesso a esta venda
    if (usuarioEmpresaId && venda.empresaId.toString() !== usuarioEmpresaId.toString()) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado' 
      });
    }

    if (venda.status === 'cancelada') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Venda já está cancelada' 
      });
    }

    // Restaurar estoque
    for (const item of venda.itens) {
      if (item.produtoId) {
        const produtoStock = await Stock.findOne({ 
          _id: item.produtoId,
          empresaId: venda.empresaId 
        });
        if (produtoStock) {
          produtoStock.quantidade += item.quantidade;
          await produtoStock.save();
        }
      }
    }

    // Remover registo bancário
    await RegistoBancario.deleteOne({ documentoReferencia: venda._id.toString() });

    // Cancelar factura correspondente
    const factura = await Factura.findOne({ 
      empresaId: venda.empresaId, 
      numeroFactura: venda.numeroFactura 
    });
    
    if (factura && factura.status !== 'cancelada') {
      factura.status = 'cancelada';
      await factura.save();
    }

    venda.status = 'cancelada';
    await venda.save();

    res.json({ 
      sucesso: true, 
      mensagem: `Venda Nº ${venda.numeroFactura} cancelada com sucesso` 
    });

  } catch (error) {
    console.error('Erro ao cancelar venda:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao cancelar venda',
      erro: error.message 
    });
  }
};

// GET /api/vendas/exportar-saft/:empresaNif
exports.exportarSAFT = async (req, res) => {
  try {
    const { empresaNif } = req.params;
    const { dataInicio, dataFim } = req.query;
    const usuarioEmpresaId = req.user?.empresaId;
    
    console.log('📄 Exportando SAFT');
    console.log('Empresa NIF:', empresaNif);
    
    const empresa = await Empresa.findOne({ nif: empresaNif });
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    // 🔒 Verificar acesso
    if (usuarioEmpresaId && empresa._id.toString() !== usuarioEmpresaId.toString()) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado' 
      });
    }
    
    const query = { empresaId: empresa._id, status: 'finalizada' };
    if (dataInicio && dataFim) {
      query.data = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }
    
    const vendas = await Venda.find(query).sort({ data: 1 });
    console.log(`Encontradas ${vendas.length} vendas para exportar`);
    
    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    const dataGeracao = new Date();
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01">
  <Header>
    <AuditFileVersion>1.04_01</AuditFileVersion>
    <Company>
      <Name>${escapeXml(empresa.nome)}</Name>
      <TaxRegistrationNumber>${empresa.nif}</TaxRegistrationNumber>
      <Address>
        <AddressDetail>${escapeXml(empresa.endereco || '')}</AddressDetail>
        <City>${escapeXml(empresa.cidade || 'Luanda')}</City>
        <Country>AO</Country>
      </Address>
    </Company>
    <Period>
      <StartDate>${dataInicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}</StartDate>
      <EndDate>${dataFim || new Date().toISOString().split('T')[0]}</EndDate>
    </Period>
    <FileGenerated>${dataGeracao.toISOString()}</FileGenerated>
    <GenerationDate>${dataGeracao.toISOString().split('T')[0]}</GenerationDate>
    <GenerationTime>${dataGeracao.toTimeString().split(' ')[0]}</GenerationTime>
    <PrimaryUser>${escapeXml(empresa.contacto || 'Sistema')}</PrimaryUser>
  </Header>
  <SourceDocuments>
    <SalesInvoices>`;
    
    vendas.forEach(venda => {
      const dataVenda = new Date(venda.data);
      xml += `
      <Invoice>
        <InvoiceNo>FT ${venda.numeroFactura}</InvoiceNo>
        <InvoiceDate>${dataVenda.toISOString().split('T')[0]}</InvoiceDate>
        <InvoiceType>FT</InvoiceType>
        <Customer>
          <CustomerTaxID>${escapeXml(venda.nifCliente)}</CustomerTaxID>
          <CompanyName>${escapeXml(venda.cliente)}</CompanyName>
        </Customer>`;
      
      venda.itens.forEach((item, idx) => {
        xml += `
        <Line>
          <LineNumber>${idx + 1}</LineNumber>
          <ProductCode>${escapeXml(item.codigoProduto || item.produtoOuServico)}</ProductCode>
          <ProductDescription>${escapeXml(item.produtoOuServico)}</ProductDescription>
          <Quantity>${item.quantidade}</Quantity>
          <UnitPrice>${item.precoUnitario}</UnitPrice>
          <TaxPointDate>${dataVenda.toISOString().split('T')[0]}</TaxPointDate>
          <Description>${escapeXml(item.produtoOuServico)}</Description>
          <Amount>${item.total}</Amount>
          <Tax>
            <TaxType>IVA</TaxType>
            <TaxCountryRegion>AO</TaxCountryRegion>
            <TaxCode>NOR</TaxCode>
            <TaxPercentage>${item.taxaIVA || 14}</TaxPercentage>
            <TaxAmount>${item.iva || (item.total * 0.14)}</TaxAmount>
          </Tax>
        </Line>`;
      });
      
      xml += `
        <DocumentTotals>
          <TaxPayable>${venda.totalIva || 0}</TaxPayable>
          <NetTotal>${venda.subtotal - (venda.desconto || 0)}</NetTotal>
          <GrossTotal>${venda.total}</GrossTotal>
        </DocumentTotals>
      </Invoice>`;
    });
    
    xml += `
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;
    
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=saft_${empresaNif}_${new Date().toISOString().split('T')[0]}.xml`);
    res.send(xml);
    
  } catch (error) {
    console.error('Erro ao exportar SAFT:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao exportar SAFT',
      erro: error.message 
    });
  }
};