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
const IntegracaoContabilistica = require('../services/IntegracaoContabilistica');
const Pagamento = require('../models/Pagamento');
const PlanoContas = require('../models/PlanoContas');
const LancamentoContabilistico = require('../models/LancamentoContabilistico');
const saldoService = require('../services/saldoService');
const ContaCorrente = require('../models/ContaCorrente');

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

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

// ============================================
// FUNÇÃO CORRIGIDA E ROBUSTA: Criar registo bancário com IVA e retenções
// ============================================
async function criarRegistoBancarioVendaCompleto(venda, empresa, contaBancaria, detalhesFiscais) {
  try {
    console.log('🔧 [REGISTO BANCÁRIO] Iniciando criação...');
    console.log('   Venda ID:', venda._id);
    console.log('   Conta:', contaBancaria);
    console.log('   Empresa ID:', empresa._id);
    
    // Validações iniciais
    if (!venda) {
      throw new Error('Dados da venda não fornecidos');
    }
    if (!empresa || !empresa._id) {
      throw new Error('Empresa inválida');
    }
    if (!contaBancaria) {
      throw new Error('Conta bancária não informada');
    }
    
    const dataVenda = venda.data ? new Date(venda.data) : new Date();
    if (isNaN(dataVenda.getTime())) {
      throw new Error('Data da venda inválida');
    }
    
    const ano = dataVenda.getFullYear();
    const mes = meses[dataVenda.getMonth()];
    
    // Buscar banco (com tratamento de erro)
    let banco = null;
    try {
      banco = await Banco.findOne({ codNome: contaBancaria, empresaId: empresa._id });
      if (!banco) {
        console.log(`⚠️ Banco com código "${contaBancaria}" não encontrado. Continuando sem referência...`);
      } else {
        console.log(`✅ Banco encontrado: ${banco.nome} (${banco.codNome})`);
      }
    } catch (err) {
      console.log(`⚠️ Erro ao buscar banco: ${err.message}. Continuando...`);
    }
    
    // Calcular valores fiscais com segurança
    const subtotal = venda.subtotal || 0;
    const desconto = venda.desconto || 0;
    const subtotalSemIVA = Math.max(0, subtotal - desconto);
    
    // Calcular IVA
    let iva = 0;
    if (detalhesFiscais.incluiIVA !== false) {
      const taxaIVA = detalhesFiscais.taxaIVA || 14;
      iva = subtotalSemIVA * (taxaIVA / 100);
    }
    
    // Calcular Retenção
    let retencao = 0;
    if (detalhesFiscais.incluiRetencao === true) {
      const taxaRetencao = detalhesFiscais.taxaRetencao || 0;
      retencao = subtotalSemIVA * (taxaRetencao / 100);
    }
    
    const valorLiquido = subtotalSemIVA + iva - retencao;
    
    const tipoReceita = venda.tipoFactura === 'Prestação de Serviço' ? 'Receita - Serviço' : 'Receita - Venda';
    
    console.log(`💰 Valores calculados:`);
    console.log(`   Subtotal: ${subtotal.toFixed(2)} Kz`);
    console.log(`   Desconto: ${desconto.toFixed(2)} Kz`);
    console.log(`   Base cálculo: ${subtotalSemIVA.toFixed(2)} Kz`);
    console.log(`   IVA (${detalhesFiscais.taxaIVA || 14}%): ${iva.toFixed(2)} Kz`);
    console.log(`   Retenção (${detalhesFiscais.taxaRetencao || 0}%): ${retencao.toFixed(2)} Kz`);
    console.log(`   Valor Líquido: ${valorLiquido.toFixed(2)} Kz`);
    
    // Verificar se já existe registo para esta venda (evitar duplicação)
    const registoExistente = await RegistoBancario.findOne({ 
      documentoReferencia: venda._id.toString(),
      empresaId: empresa._id 
    });
    
    if (registoExistente) {
      console.log(`⚠️ Registo bancário já existe para esta venda: ${registoExistente._id}`);
      console.log(`   Atualizando em vez de criar novo...`);
      
      // Atualizar registo existente
      registoExistente.data = dataVenda;
      registoExistente.conta = contaBancaria;
      registoExistente.descricao = `VENDA: ${venda.cliente} - Factura Nº ${venda.numeroFactura} | IVA: ${iva.toFixed(2)} Kz | Retenção: ${retencao.toFixed(2)} Kz`;
      registoExistente.valor = valorLiquido;
      registoExistente.iva = iva;
      registoExistente.retencao = retencao;
      registoExistente.taxaIVA = detalhesFiscais.taxaIVA || 14;
      registoExistente.taxaRetencao = detalhesFiscais.taxaRetencao || 0;
      registoExistente.ano = ano;
      registoExistente.mes = mes;
      registoExistente.detalhesAdicionais = {
        numeroFactura: venda.numeroFactura,
        cliente: venda.cliente,
        nifCliente: venda.nifCliente,
        formaPagamento: venda.formaPagamento,
        subtotal: venda.subtotal,
        desconto: venda.desconto || 0,
        itensCount: venda.itens?.length || 0
      };
      
      await registoExistente.save();
      console.log(`✅ Registo bancário atualizado com sucesso!`);
      return registoExistente;
    }
    
    // Criar novo registo
    const registo = new RegistoBancario({
      data: dataVenda,
      conta: contaBancaria,
      contaId: banco?._id,
      descricao: `VENDA: ${venda.cliente} - Factura Nº ${venda.numeroFactura} | IVA: ${iva.toFixed(2)} Kz | Retenção: ${retencao.toFixed(2)} Kz`,
      tipo: tipoReceita,
      valor: valorLiquido,
      iva: iva,
      retencao: retencao,
      taxaIVA: detalhesFiscais.taxaIVA || 14,
      taxaRetencao: detalhesFiscais.taxaRetencao || 0,
      entradaSaida: 'entrada',
      ano: ano,
      mes: mes,
      documentoReferencia: venda._id.toString(),
      reconcilado: false,
      empresaId: empresa._id,
      detalhesAdicionais: {
        numeroFactura: venda.numeroFactura,
        cliente: venda.cliente,
        nifCliente: venda.nifCliente,
        formaPagamento: venda.formaPagamento,
        subtotal: venda.subtotal,
        desconto: venda.desconto || 0,
        itensCount: venda.itens?.length || 0
      }
    });
    
    await registo.save();
    console.log(`✅ Registo bancário criado com sucesso!`);
    console.log(`   ID: ${registo._id}`);
    console.log(`   Conta: ${contaBancaria}`);
    console.log(`   Valor: ${valorLiquido.toFixed(2)} Kz`);
    
    return registo;
    
  } catch (error) {
    console.error('❌ ERRO AO CRIAR REGISTO BANCÁRIO:');
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
    
    // Não lançar erro para não interromper a venda
    console.log('⚠️ Continuando processo de venda mesmo com erro no registo bancário');
    return null;
  }
}

// ============================================
// FUNÇÃO CORRIGIDA: Atualizar saldo da conta bancária
// ============================================
async function atualizarSaldoContaBancaria(empresaId, contaBancaria) {
  return saldoService.calcularSaldoConta(contaBancaria, empresaId);
}




// ============================================
// FUNÇÃO PARA GERAR PARCELAS
// ============================================
function gerarParcelas(total, entrada, numeroParcelas, jurosMensal, dataPrimeiraParcela) {
  const saldoRestante = total - entrada;
  let parcelas = [];
  let valorParcela = saldoRestante / numeroParcelas;
  
  if (jurosMensal > 0 && numeroParcelas > 1) {
    const taxaJuros = jurosMensal / 100;
    valorParcela = (saldoRestante * taxaJuros * Math.pow(1 + taxaJuros, numeroParcelas)) / 
                   (Math.pow(1 + taxaJuros, numeroParcelas) - 1);
  }
  
  const dataBase = dataPrimeiraParcela ? new Date(dataPrimeiraParcela) : new Date();
  
  for (let i = 0; i < numeroParcelas; i++) {
    const dataVencimento = new Date(dataBase);
    dataVencimento.setMonth(dataBase.getMonth() + i);
    
    parcelas.push({
      numero: i + 1,
      valor: Math.round(valorParcela),
      dataVencimento: dataVencimento,
      status: 'pendente',
      valorPago: 0,
      juros: jurosMensal > 0 ? Math.round(valorParcela * (jurosMensal / 100)) : 0
    });
  }
  
  return parcelas;
}

// ============================================
// POST /api/vendas/emitir
// ============================================
exports.emitirVenda = async (req, res) => {
  try {
    const { venda, contaBancaria, ibanBancario } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    const empresaIdParaVenda = req.empresaAtual;
    
    console.log('=== INICIANDO EMISSÃO DE VENDA ===');
    console.log('Usuário:', usuario);
    console.log('empresaAtual (validado):', empresaIdParaVenda);

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

    const contaParaVenda = contaBancaria || empresa.contaBancariaPadrao || 'BAI01';
    const ibanParaVenda = ibanBancario || empresa.ibanPadrao || '';
    
    console.log(`🏦 Conta bancária para esta venda: ${contaParaVenda}`);

    const numeroFactura = await getProximoNumeroFactura(empresa._id);
    const numeroVenda = numeroFactura;
    console.log(`✅ Número único para Venda e Factura: ${numeroFactura}`);

    // PROCESSAR ITENS
    const itensProcessados = [];
    for (let i = 0; i < venda.itens.length; i++) {
      const item = venda.itens[i];
      console.log(`Processando item ${i + 1}:`, item.produtoOuServico, 'Tipo:', item.tipo || 'produto');
      
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
          mensagem: `Item "${item.produtoOuServico}" não encontrado no sistema` 
        });
      }

      if (produtoStock.tipo === 'produto' || !item.tipo || item.tipo === 'produto') {
        if (produtoStock.quantidade < item.quantidade) {
          return res.status(400).json({ 
            sucesso: false, 
            mensagem: `Quantidade insuficiente para "${item.produtoOuServico}". Disponível: ${produtoStock.quantidade}` 
          });
        }
        
        produtoStock.quantidade -= item.quantidade;
        await produtoStock.save();
        console.log(`📦 Estoque atualizado para "${item.produtoOuServico}": ${produtoStock.quantidade} restantes`);
      } else {
        console.log(`🛠️ Serviço "${item.produtoOuServico}" - sem alteração de estoque`);
      }
      
      const incluiIVA = venda.incluiIVA !== false;
      const taxaIVA = incluiIVA ? (item.taxaIVA || produtoStock.taxaIVA || 14) : 0;
      const ivaItem = incluiIVA ? item.total * (taxaIVA / 100) : 0;
      
      let agendamentoData = null;
      if (item.agendamento && (produtoStock.tipo === 'servico' || item.tipo === 'servico')) {
        agendamentoData = {
          dataInicio: new Date(item.agendamento.dataInicio),
          dataFim: item.agendamento.dataFim ? new Date(item.agendamento.dataFim) : null,
          duracaoEstimada: item.agendamento.duracaoEstimada || '',
          tecnicoResponsavel: item.agendamento.tecnicoResponsavel || '',
          enderecoServico: item.agendamento.enderecoServico || '',
          observacoes: item.agendamento.observacoes || '',
          status: 'agendado'
        };
      }
      
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
        iva: ivaItem,
        tipo: produtoStock.tipo === 'servico' ? 'servico' : 'produto',
        agendamento: agendamentoData
      });
    }

    const subtotal = itensProcessados.reduce((acc, item) => acc + item.total, 0);
    const totalIva = itensProcessados.reduce((acc, item) => acc + item.iva, 0);
    const desconto = venda.desconto || 0;
    const subtotalComDesconto = subtotal - desconto;

    let totalRetencao = 0;
    let taxaRetencaoAplicada = 0;

    if (venda.incluiRetencao && venda.retencao && venda.retencao > 0) {
      if (venda.taxaRetencao && venda.taxaRetencao > 0) {
        taxaRetencaoAplicada = venda.taxaRetencao;
        totalRetencao = (subtotalComDesconto * taxaRetencaoAplicada) / 100;
      } else {
        totalRetencao = venda.retencao;
        taxaRetencaoAplicada = (totalRetencao / subtotalComDesconto) * 100;
      }
    }

    const totalFinal = subtotalComDesconto + totalIva - totalRetencao;

    // PROCESSAR VENDA A PRAZO
    let parcelasGeradas = [];
    let entradaValor = 0;
    let tipoVenda = venda.tipoVenda || 'avista';
    
    if (tipoVenda === 'prazo' && (venda.parcelas?.length > 0 || (venda.numeroParcelas && venda.numeroParcelas > 1))) {
      entradaValor = venda.entrada || 0;
      
      if (venda.parcelas && venda.parcelas.length > 0) {
        parcelasGeradas = venda.parcelas.map(p => ({
          ...p,
          dataVencimento: new Date(p.dataVencimento),
          status: 'pendente'
        }));
      } else {
        parcelasGeradas = gerarParcelas(
          totalFinal,
          entradaValor,
          venda.numeroParcelas,
          venda.jurosMensal || 0,
          venda.dataPrimeiraParcela
        );
      }
      
      console.log(`📅 Venda a prazo gerada: ${parcelasGeradas.length} parcelas, entrada: ${entradaValor} Kz`);
    }

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
      emailCliente: venda.emailCliente || '',
      telefoneCliente: venda.telefoneCliente || '',
      enderecoCliente: venda.enderecoCliente || "",
      paisCliente: venda.paisCliente || "AO",
      tipoFactura: venda.tipoFactura || "Venda",
      tipoVenda: tipoVenda,
      entrada: entradaValor,
      jurosMensal: venda.jurosMensal || 0,
      dataPrimeiraParcela: venda.dataPrimeiraParcela ? new Date(venda.dataPrimeiraParcela) : null,
      parcelas: parcelasGeradas,
      valorParcelasRestante: parcelasGeradas.reduce((sum, p) => sum + p.valor, 0),
      incluiIVA: venda.incluiIVA !== false,
      incluiRetencao: venda.incluiRetencao || false,
      taxaIVA: venda.taxaIVA || 14,
      itens: itensProcessados,
      subtotal: subtotal,
      totalIva: totalIva,
      totalRetencao: totalRetencao,
      taxaRetencao: taxaRetencaoAplicada,
      desconto: desconto,
      total: totalFinal,
      formaPagamento: venda.formaPagamento,
      detalhesPagamento: {
        ...venda.detalhesPagamento,
        dataPagamento: new Date(),
        valorPago: venda.detalhesPagamento?.valorPago || totalFinal,
        troco: venda.detalhesPagamento?.troco || 0
      },
      observacoes: venda.observacoes || '',
      status: tipoVenda === 'prazo' && parcelasGeradas.length > 0 ? 'parcialmente_paga' : 'finalizada',
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
      incluiIVA: venda.incluiIVA !== false,
      incluiRetencao: venda.incluiRetencao || false,
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

    // 3. CRIAR REGISTO BANCÁRIO COMPLETO COM IVA E RETENÇÕES
    const detalhesFiscais = {
      incluiIVA: venda.incluiIVA !== false,
      taxaIVA: venda.taxaIVA || 14,
      incluiRetencao: venda.incluiRetencao || false,
      taxaRetencao: venda.taxaRetencao || 0
    };

    await criarRegistoBancarioVendaCompleto(novaVenda, empresa, contaParaVenda, detalhesFiscais);

    // 4. ATUALIZAR SALDO DA CONTA BANCÁRIA
    await atualizarSaldoContaBancaria(empresa._id, contaParaVenda);

    // 5. VERIFICAR SE A FACTURA FOI CRIADA CORRETAMENTE
    const facturaCriada = await Factura.findById(novaFactura._id);
    if (facturaCriada) {
      console.log(`✅ Factura ${facturaCriada.numeroFactura} disponível no módulo de facturação`);
    } else {
      console.log(`⚠️ ERRO: Factura não foi salva corretamente!`);
    }

    // 6. INTEGRAÇÃO CONTÁBILÍSTICA - lançamento automático para todas as vendas
    try {
      await IntegracaoContabilistica.integrarVenda(
        novaVenda,
        empresa._id,
        req.user?.id || req.user?._id || null
      );
      novaVenda.contabilizado = true;
      await novaVenda.save();
      console.log(`✅ Lançamento contabilístico criado para venda #${novaVenda.numeroFactura}`);
    } catch (err) {
      console.error('⚠️ Erro ao criar lançamento contabilístico da venda:', err.message);
    }

    // 7. INTEGRAÇÃO COM CONTROLO DE PAGAMENTOS
    if (tipoVenda === 'prazo' && parcelasGeradas.length > 0) {
      // Vendas a prazo: criar conta a receber para cada parcela
      try {
        for (const parcela of parcelasGeradas) {
          await integracaoPagamentos.integrarVenda(
            { ...novaVenda.toObject(), total: parcela.valor, numeroFactura: `${novaVenda.numeroFactura}-P${parcela.numero}`, observacao: `Parcela ${parcela.numero}` },
            empresa,
            usuario
          );
        }
        console.log(`✅ Contas a receber criadas para ${parcelasGeradas.length} parcelas`);
      } catch (err) {
        console.error('⚠️ Erro ao integrar parcelas com pagamentos:', err.message);
      }
    } else if (venda.formaPagamento !== 'Dinheiro' && tipoVenda === 'avista') {
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
        contaBancaria: contaParaVenda,
        parcelas: parcelasGeradas,
        detalhesFiscais: {
          subtotal: subtotal,
          iva: totalIva,
          retencao: totalRetencao,
          total: totalFinal
        }
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

// ============================================
// GET /api/vendas/proximo-numero/:empresaNif
// ============================================
exports.getProximoNumero = async (req, res) => {
  try {
    const { empresaNif } = req.params;
    const usuarioEmpresaId = req.user?.empresaId;
    
    const empresa = await Empresa.findOne({ nif: empresaNif });
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
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

// ============================================
// GET /api/vendas/historico/:empresaId
// ============================================
exports.getHistorico = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const usuarioEmpresaId = req.user?.empresaId;
    
    if (!empresaId) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'ID da empresa é obrigatório' 
      });
    }
    
    const { page = 1, limit = 50, dataInicio, dataFim } = req.query;
    
    const query = { empresaId };
    
    if (dataInicio && dataFim) {
      query.data = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }
    
    const vendas = await Venda.find(query)
      .sort({ data: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('clienteId', 'nome nif telefone email');

    const total = await Venda.countDocuments(query);
    
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

// ============================================
// GET /api/vendas/:id
// ============================================
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

// ============================================
// DELETE /api/vendas/:id (cancelar venda)
// ============================================
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

    if (venda.status === 'cancelada') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Venda já está cancelada' 
      });
    }

    for (const item of venda.itens) {
      if (item.tipo === 'produto' && item.produtoId) {
        const produtoStock = await Stock.findOne({ 
          _id: item.produtoId,
          empresaId: venda.empresaId 
        });
        if (produtoStock) {
          produtoStock.quantidade += item.quantidade;
          await produtoStock.save();
          console.log(`📦 Estoque restaurado para "${item.produtoOuServico}": +${item.quantidade}`);
        }
      } else {
        console.log(`🛠️ Serviço "${item.produtoOuServico}" - estoque não alterado`);
      }
    }

    await RegistoBancario.deleteOne({ documentoReferencia: venda._id.toString() });

    const factura = await Factura.findOne({ 
      empresaId: venda.empresaId, 
      numeroFactura: venda.numeroFactura 
    });
    
    if (factura && factura.status !== 'cancelado') {
      factura.status = 'cancelado';
      await factura.save();
    }

    // Reverter lançamento contabilístico (estorno)
    try {
      const lancamento = await LancamentoContabilistico.findOne({
        empresaId: venda.empresaId,
        numeroLancamento: `VND-${venda.numeroFactura}`
      });
      if (lancamento && lancamento.status === 'Contabilizado') {
        await lancamento.estornar(req.user?.id || req.user?._id, `Venda cancelada - ${venda.cliente}`);
        console.log(`✅ Lançamento contabilístico estornado: VND-${venda.numeroFactura}`);
      }
    } catch (err) {
      console.error('⚠️ Erro ao estornar lançamento contabilístico:', err.message);
    }

    venda.status = 'cancelada';
    venda.contabilizado = false;
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

// ============================================
// GET /api/vendas/exportar-saft/:empresaNif
// ============================================
exports.exportarSAFT = async (req, res) => {
  try {
    const { empresaNif } = req.params;
    const { dataInicio, dataFim } = req.query;
    const usuarioEmpresaId = req.user?.empresaId;
    
    const empresa = await Empresa.findOne({ nif: empresaNif });
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    if (usuarioEmpresaId && empresa._id.toString() !== usuarioEmpresaId.toString()) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado' 
      });
    }
    
    const queryDocs = {
      empresaId: empresa._id,
      tipo: { $in: ['Factura', 'Factura Recibo', 'Nota Credito', 'Nota Debito', 'Factura-Simplificada'] },
      status: { $in: ['emitido', 'emitida', 'pago', 'parcialmente_pago'] }
    };
    if (dataInicio && dataFim) {
      queryDocs.dataEmissao = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }
    
    const docs = await require('../models/Factura').find(queryDocs).sort({ dataEmissao: 1 });
    
    const mapTipoAGT = (tipo) => ({
      'Factura': 'FT',
      'Factura Recibo': 'FR',
      'Nota Credito': 'NC',
      'Nota Debito': 'ND',
      'Factura-Simplificada': 'FS'
    })[tipo] || 'FT';
    
    const escapeXml = (unsafe) => {
      if (unsafe == null) return '';
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    const todosDocs = docs.map(f => ({
      data: f.dataEmissao,
      numero: f.numeroFactura || f.numeroDocumento,
      serie: f.serie || 'FT',
      tipoAGT: mapTipoAGT(f.tipo),
      nifCliente: f.nifCliente,
      cliente: f.cliente,
      itens: f.itens,
      subtotal: f.subtotal,
      totalIva: f.totalIva,
      desconto: f.desconto,
      total: f.total
    })).sort((a, b) => new Date(a.data) - new Date(b.data));
    
    console.log(`📄 SAF-T: ${todosDocs.length} documentos definitivos`);
    
    const dataGeracao = new Date();
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01">
  <Header>
    <AuditFileVersion>1.04_01</AuditFileVersion>
    <Company>
      <Name>${escapeXml(empresa.nome)}</Name>
      <TaxRegistrationNumber>${empresa.nif}</TaxRegistrationNumber>
      <Address>
        <AddressDetail>${escapeXml(typeof empresa.endereco === 'string' ? empresa.endereco : (empresa.endereco?.rua || empresa.endereco?.cidade || ''))}</AddressDetail>
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
    
    todosDocs.forEach(doc => {
      const dataDoc = new Date(doc.data);
      xml += `
      <Invoice>
        <InvoiceNo>${doc.serie} ${doc.numero}</InvoiceNo>
        <InvoiceDate>${dataDoc.toISOString().split('T')[0]}</InvoiceDate>
        <InvoiceType>${doc.tipoAGT}</InvoiceType>
        <Customer>
          <CustomerTaxID>${escapeXml(doc.nifCliente)}</CustomerTaxID>
          <CompanyName>${escapeXml(doc.cliente)}</CompanyName>
        </Customer>`;
      
      (doc.itens || []).forEach((item, idx) => {
        xml += `
        <Line>
          <LineNumber>${idx + 1}</LineNumber>
          <ProductCode>${escapeXml(item.codigoProduto || item.produtoOuServico)}</ProductCode>
          <ProductDescription>${escapeXml(item.produtoOuServico)}</ProductDescription>
          <Quantity>${item.quantidade}</Quantity>
          <UnitPrice>${item.precoUnitario}</UnitPrice>
          <TaxPointDate>${dataDoc.toISOString().split('T')[0]}</TaxPointDate>
          <Description>${escapeXml(item.produtoOuServico)}</Description>
          <Amount>${item.total}</Amount>
          <Tax>
            <TaxType>IVA</TaxType>
            <TaxCountryRegion>AO</TaxCountryRegion>
            <TaxCode>NOR</TaxCode>
            <TaxPercentage>${item.taxaIVA != null ? item.taxaIVA : 14}</TaxPercentage>
            <TaxAmount>${item.iva != null ? item.iva : (item.total * 0.14)}</TaxAmount>
          </Tax>
        </Line>`;
      });
      
      xml += `
        <DocumentTotals>
          <TaxPayable>${doc.totalIva || 0}</TaxPayable>
          <NetTotal>${doc.subtotal - (doc.desconto || 0)}</NetTotal>
          <GrossTotal>${doc.total}</GrossTotal>
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

// ============================================
// 🆕 VENDAS A PRAZO - PARCELAS
// ============================================

exports.registrarPagamentoParcela = async (req, res) => {
  try {
    const { id } = req.params;
    const { parcelaNumero, valorPago, formaPagamento, contaBancaria } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    const usuarioId = req.user?.id || req.user?._id || null;
    
    const venda = await Venda.findById(id);
    
    if (!venda) {
      return res.status(404).json({ sucesso: false, mensagem: 'Venda não encontrada' });
    }
    
    if (venda.tipoVenda !== 'prazo') {
      return res.status(400).json({ sucesso: false, mensagem: 'Esta venda não é a prazo' });
    }
    
    const parcela = venda.parcelas.find(p => p.numero === parcelaNumero);
    
    if (!parcela) {
      return res.status(404).json({ sucesso: false, mensagem: `Parcela ${parcelaNumero} não encontrada` });
    }
    
    if (parcela.status === 'pago') {
      return res.status(400).json({ sucesso: false, mensagem: 'Esta parcela já foi paga' });
    }
    
    const valorDevido = parcela.valor - (parcela.valorPago || 0);
    
    if (valorPago < valorDevido) {
      return res.status(400).json({ sucesso: false, mensagem: `Valor insuficiente. Valor devido: ${valorDevido} Kz` });
    }
    
    parcela.valorPago = (parcela.valorPago || 0) + valorPago;
    parcela.dataPagamento = new Date();
    parcela.formaPagamento = formaPagamento || parcela.formaPagamento;
    parcela.contaBancaria = contaBancaria || parcela.contaBancaria;
    parcela.usuario = usuario;
    parcela.status = parcela.valorPago >= parcela.valor ? 'pago' : 'pendente';
    
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

    // ============================================
    // INTEGRAÇÃO FINANCEIRA (não-bloqueante)
    // ============================================
    try {
      const empresaId = venda.empresaId;
      const contaDestino = parcela.contaBancaria;
      const dataPagamento = new Date();
      const ano = dataPagamento.getFullYear();
      const mes = meses[dataPagamento.getMonth()];

      // 1. LOCALIZAR E ATUALIZAR CONTA A RECEBER (Pagamento)
      const pagamento = await Pagamento.findOne({
        origemId: venda._id,
        origemModel: 'Venda',
        observacao: `Parcela ${parcelaNumero}`
      });

      if (pagamento) {
        pagamento.status = 'Pago';
        pagamento.valorPago = valorPago;
        pagamento.dataPagamento = dataPagamento;
        pagamento.formaPagamento = parcela.formaPagamento || pagamento.formaPagamento;
        if (contaDestino) {
          pagamento.contaDebito = contaDestino;
        }
        pagamento.atualizadoPor = usuario;
        await pagamento.save();
        console.log(`✅ Conta a receber ${pagamento.referencia} marcada como Paga`);
      } else {
        console.log(`⚠️ Nenhum Pagamento encontrado para Parcela ${parcelaNumero} da Venda ${venda._id}`);
      }

      // 2. OBTER CONTA BANCÁRIA (para registo e saldo)
      let contaParaRegisto = contaDestino;
      if (!contaParaRegisto) {
        const bancoPadrao = await Banco.findOne({ empresaId, ativo: true });
        contaParaRegisto = bancoPadrao?.codNome || 'BAI01';
      }

      // 3. CRIAR REGISTO BANCÁRIO (entrada do recebimento)
      const banco = await Banco.findOne({ codNome: contaParaRegisto, empresaId });
      const registoExistente = await RegistoBancario.findOne({
        documentoReferencia: `${venda._id}-P${parcelaNumero}`,
        empresaId
      });

      if (!registoExistente) {
        const registo = new RegistoBancario({
          data: dataPagamento,
          conta: contaParaRegisto,
          contaId: banco?._id,
          descricao: `RECEBIMENTO PARCELA ${parcelaNumero}: ${venda.cliente} - Factura Nº ${venda.numeroFactura}`,
          tipo: 'Receita - Parcela',
          valor: valorPago,
          entradaSaida: 'entrada',
          ano,
          mes,
          documentoReferencia: `${venda._id}-P${parcelaNumero}`,
          facturaReferencia: String(venda.numeroFactura),
          clienteReferencia: venda.cliente,
          nifCliente: venda.nifCliente,
          empresaId,
          detalhesAdicionais: {
            numeroFactura: String(venda.numeroFactura),
            cliente: venda.cliente,
            nifCliente: venda.nifCliente,
            formaPagamento: parcela.formaPagamento || 'Transferência Bancária',
            parcelaNumero,
            totalParcelas: venda.numeroParcelas
          },
          usuario
        });
        await registo.save();
        console.log(`✅ Registo bancário criado: Receita - Parcela ${parcelaNumero}`);
      } else {
        console.log(`⚠️ Registo bancário já existe para Parcela ${parcelaNumero}`);
      }

      // 4. ATUALIZAR SALDO DA CONTA BANCÁRIA
      if (contaParaRegisto) {
        await atualizarSaldoContaBancaria(empresaId, contaParaRegisto);
      }

      // 5. LANÇAMENTO CONTABILÍSTICO (Débito Caixa/Banco / Crédito Clientes)
      let contaCaixa = await PlanoContas.findOne({ empresaId, codigo: '43.1.1' });
      if (!contaCaixa) {
        contaCaixa = new PlanoContas({
          codigo: '43.1.1', nome: 'Depósitos à Ordem', classe: 4, nivel: 2,
          natureza: 'Devedora', empresaId, criadoPor: usuarioId, ativo: true
        });
        await contaCaixa.save();
      }

      let contaCliente = await PlanoContas.findOne({ empresaId, codigo: '31.1.2.1' });
      if (!contaCliente) {
        contaCliente = new PlanoContas({
          codigo: '31.1.2.1', nome: 'Clientes Nacionais', classe: 3, nivel: 4,
          natureza: 'Devedora', empresaId, criadoPor: usuarioId, ativo: true
        });
        await contaCliente.save();
      }

      const lancamentoExistente = await LancamentoContabilistico.findOne({
        numeroLancamento: `REC-${venda.numeroFactura}-P${parcelaNumero}`,
        empresaId
      });

      if (!lancamentoExistente) {
        const lancamento = new LancamentoContabilistico({
          numeroLancamento: `REC-${venda.numeroFactura}-P${parcelaNumero}`,
          descricao: `Recebimento Parcela ${parcelaNumero} - ${venda.cliente} - Factura Nº ${venda.numeroFactura}`,
          dataLancamento: dataPagamento,
          empresaId,
          partidas: [
            {
              contaCodigo: contaCaixa.codigo,
              contaDescricao: contaCaixa.nome,
              classe: 4,
              debito: valorPago,
              credito: 0,
              documentoOrigem: { tipo: 'Venda', id: venda._id, referencia: `${venda.numeroFactura}-P${parcelaNumero}` }
            },
            {
              contaCodigo: contaCliente.codigo,
              contaDescricao: contaCliente.nome,
              classe: 3,
              debito: 0,
              credito: valorPago,
              documentoOrigem: { tipo: 'Venda', id: venda._id, referencia: `${venda.numeroFactura}-P${parcelaNumero}` }
            }
          ],
          totalDebito: valorPago,
          totalCredito: valorPago,
          status: 'Contabilizado',
          criadoPor: usuarioId,
          periodo: { ano, mes: dataPagamento.getMonth() + 1 }
        });
        await lancamento.save();
        console.log(`✅ Lançamento contabilístico criado: REC-${venda.numeroFactura}-P${parcelaNumero}`);
      }

      // 6. ATUALIZAR CONTA CORRENTE DO CLIENTE
      let contaCorrente = await ContaCorrente.findOne({
        empresaId,
        beneficiario: venda.cliente,
        tipo: 'Cliente'
      });

      if (!contaCorrente) {
        const clienteData = await Cliente.findById(venda.clienteId);
        contaCorrente = new ContaCorrente({
          empresaId,
          beneficiario: venda.cliente,
          beneficiarioDocumento: venda.nifCliente,
          tipo: 'Cliente',
          contato: clienteData?.telefone || '',
          email: clienteData?.email || '',
          telefone: clienteData?.telefone || '',
          saldo: 0,
          status: 'Ativo'
        });
      }

      const saldoAnterior = contaCorrente.saldo;
      const novoSaldo = saldoAnterior + valorPago;

      const movimento = {
        tipo: 'Recebimento',
        valor: valorPago,
        descricao: `Recebimento Parcela ${parcelaNumero} - Factura Nº ${venda.numeroFactura}`,
        data: dataPagamento,
        referencia: `${venda.numeroFactura}-P${parcelaNumero}`,
        documentoReferencia: `${venda.numeroFactura}`,
        formaPagamento: parcela.formaPagamento || 'Transferência Bancária',
        origemId: venda._id,
        origemModel: 'Venda',
        status: 'Pago',
        saldoAnterior,
        saldoAtual: novoSaldo
      };

      contaCorrente.movimentos.push(movimento);
      contaCorrente.saldo = novoSaldo;
      contaCorrente.dataUltimaMovimentacao = dataPagamento;
      await contaCorrente.save();

      console.log(`✅ Conta corrente actualizada: ${venda.cliente} - ${novoSaldo.toLocaleString()} Kz`);

    } catch (integrationError) {
      console.error('⚠️ Erro na integração financeira do pagamento da parcela:', integrationError.message);
      console.error(integrationError.stack);
    }
    
    res.json({
      sucesso: true,
      mensagem: `Parcela ${parcelaNumero} paga com sucesso!`,
      dados: { venda, parcela }
    });
    
  } catch (error) {
    console.error('Erro ao registrar pagamento de parcela:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.getVendasPendentes = async (req, res) => {
  try {
    const { empresaId } = req.params;
    
    const vendas = await Venda.find({
      empresaId,
      tipoVenda: 'prazo',
      status: { $in: ['parcialmente_paga', 'pendente'] }
    }).populate('clienteId', 'nome nif telefone');
    
    const resultado = vendas.map(venda => ({
      _id: venda._id,
      numeroFactura: venda.numeroFactura,
      cliente: venda.cliente,
      total: venda.total,
      valorPendente: venda.valorParcelasRestante || 0,
      parcelas: venda.parcelas.map(p => ({
        numero: p.numero,
        valor: p.valor,
        dataVencimento: p.dataVencimento,
        status: p.status
      }))
    }));
    
    res.json({
      sucesso: true,
      dados: resultado,
      total: resultado.length
    });
    
  } catch (error) {
    console.error('Erro ao buscar vendas pendentes:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// 🆕 SERVIÇOS COM AGENDAMENTO
// ============================================

exports.atualizarAgendamentoServico = async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    const { status, dataInicio, dataFim, tecnicoResponsavel, observacoes } = req.body;
    
    const venda = await Venda.findById(id);
    
    if (!venda) {
      return res.status(404).json({ sucesso: false, mensagem: 'Venda não encontrada' });
    }
    
    const item = venda.itens[parseInt(itemIndex)];
    
    if (!item || item.tipo !== 'servico') {
      return res.status(404).json({ sucesso: false, mensagem: 'Item de serviço não encontrado' });
    }
    
    if (!item.agendamento) {
      item.agendamento = {};
    }
    
    if (status) item.agendamento.status = status;
    if (dataInicio) item.agendamento.dataInicio = new Date(dataInicio);
    if (dataFim) item.agendamento.dataFim = new Date(dataFim);
    if (tecnicoResponsavel) item.agendamento.tecnicoResponsavel = tecnicoResponsavel;
    if (observacoes) item.agendamento.observacoes = observacoes;
    
    venda.markModified('itens');
    await venda.save();
    
    res.json({
      sucesso: true,
      mensagem: 'Agendamento atualizado com sucesso',
      dados: item.agendamento
    });
    
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.getServicosAgendados = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { status } = req.query;
    
    const query = {
      empresaId,
      'itens.tipo': 'servico',
      'itens.agendamento': { $exists: true }
    };
    
    if (status) {
      query['itens.agendamento.status'] = status;
    }
    
    const vendas = await Venda.find(query).populate('clienteId', 'nome nif telefone');
    
    const servicos = [];
    for (const venda of vendas) {
      for (const item of venda.itens) {
        if (item.tipo === 'servico' && item.agendamento) {
          servicos.push({
            vendaId: venda._id,
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
    
    res.json({
      sucesso: true,
      dados: servicos,
      total: servicos.length
    });
    
  } catch (error) {
    console.error('Erro ao buscar serviços agendados:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// ============================================
// 🆕 DASHBOARD E RESUMO
// ============================================

exports.getDashboard = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { ano = new Date().getFullYear(), mes = new Date().getMonth() + 1 } = req.query;
    
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0);
    
    const excluirCanceladas = { status: { $ne: 'cancelada' } };
    
    const totalVendas = await Venda.countDocuments({ empresaId, ...excluirCanceladas });
    const totalFaturado = await Venda.aggregate([
      { $match: { empresaId: new mongoose.Types.ObjectId(empresaId), ...excluirCanceladas } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const filtroMes = { empresaId, ...excluirCanceladas, data: { $gte: dataInicio, $lte: dataFim } };
    
    const vendasMes = await Venda.countDocuments(filtroMes);
    
    const faturamentoMes = await Venda.aggregate([
      { 
        $match: { 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          ...excluirCanceladas,
          data: { $gte: dataInicio, $lte: dataFim }
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        totalVendas,
        totalFaturado: totalFaturado[0]?.total || 0,
        vendasNoMes: vendasMes,
        faturamentoNoMes: faturamentoMes[0]?.total || 0,
        ticketMedio: totalVendas > 0 ? (totalFaturado[0]?.total || 0) / totalVendas : 0
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

exports.getResumoFinanceiro = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { dataInicio, dataFim } = req.query;
    
    const query = { empresaId };
    if (dataInicio && dataFim) {
      query.data = { $gte: new Date(dataInicio), $lte: new Date(dataFim) };
    }
    
    const vendas = await Venda.find(query);
    
    const totalAvista = vendas
      .filter(v => v.tipoVenda === 'avista' || !v.tipoVenda)
      .reduce((sum, v) => sum + v.total, 0);
    
    const totalPrazo = vendas
      .filter(v => v.tipoVenda === 'prazo')
      .reduce((sum, v) => sum + v.total, 0);
    
    const totalPendente = vendas
      .filter(v => v.tipoVenda === 'prazo')
      .reduce((sum, v) => sum + (v.valorParcelasRestante || 0), 0);
    
    res.json({
      sucesso: true,
      dados: {
        totalVendas: vendas.length,
        totalFaturado: vendas.reduce((sum, v) => sum + v.total, 0),
        totalAvista,
        totalPrazo,
        totalPendente,
        totalPago: vendas.reduce((sum, v) => sum + v.total, 0) - totalPendente
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar resumo financeiro:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

console.log('✅ Controller de vendas carregado com todas as melhorias (IVA, Retenções, Saldos Bancários)');