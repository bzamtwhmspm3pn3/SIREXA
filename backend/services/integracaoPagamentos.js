// services/integracaoPagamentos.js
const Pagamento = require('../models/Pagamento');
const Banco = require('../models/Banco');
const ContaCorrente = require('../models/ContaCorrente');
const mongoose = require('mongoose');

class IntegracaoPagamentos {
  
  // =============================================
  // CONTA BANCÁRIA PADRÃO
  // =============================================
  async obterContaPadrao(empresaId) {
    try {
      const conta = await Banco.findOne({ empresaId, ativo: true });
      if (conta) {
        console.log(`   🏦 Conta bancária encontrada: ${conta.nome} (${conta.codNome})`);
        return {
          codNome: conta.codNome,
          contaId: conta._id,
          iban: conta.iban || ''
        };
      }
      console.log(`   ⚠️ Nenhuma conta bancária cadastrada. Usando valores padrão.`);
      return {
        codNome: 'PADRAO',
        contaId: null,
        iban: ''
      };
    } catch (error) {
      console.error('   ❌ Erro ao buscar conta bancária:', error.message);
      return {
        codNome: 'PADRAO',
        contaId: null,
        iban: ''
      };
    }
  }

  // =============================================
  // GERAR REFERÊNCIA ÚNICA
  // =============================================
  gerarReferencia(tipo, sequencial = null) {
    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const seq = sequencial || Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${tipo.substring(0, 3).toUpperCase()}-${ano}${mes}-${seq}`;
  }

  // =============================================
  // CALCULAR DATA DE VENCIMENTO DA FATURA
  // =============================================
  calcularDataVencimentoFatura(contrato, dataReferencia) {
    const dataRef = new Date(dataReferencia);
    const modalidade = contrato.modalidadePagamento;
    const diaVencimento = contrato.diaVencimento || 5;
    
    let dataVencimento = new Date(dataRef);
    
    switch(modalidade) {
      case 'Mensal':
        dataVencimento.setDate(diaVencimento);
        if (dataVencimento < dataRef) {
          dataVencimento.setMonth(dataVencimento.getMonth() + 1);
        }
        break;
      case 'Bimestral':
        dataVencimento.setDate(diaVencimento);
        if (dataVencimento < dataRef) {
          dataVencimento.setMonth(dataVencimento.getMonth() + 2);
        }
        break;
      case 'Trimestral':
        dataVencimento.setDate(diaVencimento);
        if (dataVencimento < dataRef) {
          dataVencimento.setMonth(dataVencimento.getMonth() + 3);
        }
        break;
      case 'Semestral':
        dataVencimento.setDate(diaVencimento);
        if (dataVencimento < dataRef) {
          dataVencimento.setMonth(dataVencimento.getMonth() + 6);
        }
        break;
      case 'Anual':
        dataVencimento.setDate(diaVencimento);
        if (dataVencimento < dataRef) {
          dataVencimento.setFullYear(dataVencimento.getFullYear() + 1);
        }
        break;
      default:
        dataVencimento.setDate(diaVencimento);
        if (dataVencimento < dataRef) {
          dataVencimento.setMonth(dataVencimento.getMonth() + 1);
        }
    }
    
    return dataVencimento;
  }

  // =============================================
  // CALCULAR DATA DE PAGAMENTO (COM AVISO PRÉVIO)
  // =============================================
  calcularDataPagamento(contrato, dataVencimento) {
    const avisoAntecedencia = contrato.avisoAntecedencia || 10;
    const diaPagamento = contrato.diaPagamento || 15;
    
    let dataPagamento = new Date(dataVencimento);
    
    // Se tiver dia específico de pagamento, usa ele
    if (diaPagamento) {
      dataPagamento.setDate(diaPagamento);
      if (dataPagamento > dataVencimento) {
        dataPagamento.setMonth(dataPagamento.getMonth() - 1);
      }
    } else {
      // Caso contrário, subtrai os dias de antecedência
      dataPagamento.setDate(dataPagamento.getDate() - avisoAntecedencia);
    }
    
    return dataPagamento;
  }

  // =============================================
  // GERAR TODAS AS DATAS DE FATURA DO CONTRATO
  // =============================================
  gerarDatasFatura(contrato) {
    const datas = [];
    const dataInicio = new Date(contrato.dataInicio);
    const dataFim = new Date(contrato.dataFim);
    const modalidade = contrato.modalidadePagamento;
    const diaVencimento = contrato.diaVencimento || 5;
    
    let dataAtual = new Date(dataInicio);
    dataAtual.setDate(diaVencimento);
    
    if (dataAtual < dataInicio) {
      switch(modalidade) {
        case 'Mensal': dataAtual.setMonth(dataAtual.getMonth() + 1); break;
        case 'Bimestral': dataAtual.setMonth(dataAtual.getMonth() + 2); break;
        case 'Trimestral': dataAtual.setMonth(dataAtual.getMonth() + 3); break;
        case 'Semestral': dataAtual.setMonth(dataAtual.getMonth() + 6); break;
        case 'Anual': dataAtual.setFullYear(dataAtual.getFullYear() + 1); break;
        default: dataAtual.setMonth(dataAtual.getMonth() + 1);
      }
    }
    
    while (dataAtual <= dataFim) {
      datas.push(new Date(dataAtual));
      
      switch(modalidade) {
        case 'Mensal': dataAtual.setMonth(dataAtual.getMonth() + 1); break;
        case 'Bimestral': dataAtual.setMonth(dataAtual.getMonth() + 2); break;
        case 'Trimestral': dataAtual.setMonth(dataAtual.getMonth() + 3); break;
        case 'Semestral': dataAtual.setMonth(dataAtual.getMonth() + 6); break;
        case 'Anual': dataAtual.setFullYear(dataAtual.getFullYear() + 1); break;
        default: dataAtual.setMonth(dataAtual.getMonth() + 1);
      }
    }
    
    return datas;
  }

  // =============================================
  // REGISTRAR CRÉDITO (FATURA) NA CONTA CORRENTE
  // =============================================
  async registrarCreditoFatura(fornecedor, contrato, dataFatura, usuario) {
    try {
      const empresaId = fornecedor.empresaId;
      const valorFatura = contrato.valor || 0;
      const mesReferencia = `${dataFatura.getFullYear()}-${String(dataFatura.getMonth() + 1).padStart(2, '0')}`;
      const referenciaFatura = `FAT-${fornecedor.nome.substring(0, 3).toUpperCase()}-${mesReferencia}`;
      
      console.log(`   💰 CRÉDITO: ${referenciaFatura} - ${valorFatura.toLocaleString()} Kz (Vence: ${dataFatura.toLocaleDateString()})`);
      
      let conta = await ContaCorrente.findOne({
        empresaId,
        beneficiario: fornecedor.nome,
        tipo: 'Fornecedor'
      });
      
      if (!conta) {
        conta = new ContaCorrente({
          empresaId,
          beneficiario: fornecedor.nome,
          beneficiarioDocumento: fornecedor.nif,
          tipo: 'Fornecedor',
          contato: fornecedor.contato || '',
          email: fornecedor.email || '',
          telefone: fornecedor.telefone || '',
          endereco: fornecedor.endereco || '',
          saldo: 0,
          status: 'Ativo'
        });
        await conta.save();
        console.log(`   ✅ Conta corrente criada`);
      }
      
      const faturaExistente = conta.movimentos.some(m => 
        m.tipo === 'Crédito' && m.referencia === referenciaFatura
      );
      
      if (faturaExistente) {
        console.log(`   ⚠️ Fatura já existe, ignorando`);
        return null;
      }
      
      const saldoAnterior = conta.saldo;
      const novoSaldo = saldoAnterior + valorFatura;
      
      const movimento = {
        tipo: 'Crédito',
        valor: valorFatura,
        descricao: `Fatura ${mesReferencia} - ${contrato.descricao || 'Serviços contratados'}`,
        data: dataFatura,
        referencia: referenciaFatura,
        documentoReferencia: referenciaFatura,
        origemModel: 'Fatura',
        origemId: fornecedor._id,
        contratoId: contrato._id,
        mesReferencia: mesReferencia,
        dataVencimento: dataFatura,
        status: 'Pendente', // Aguardando pagamento
        saldoAnterior: saldoAnterior,
        saldoAtual: novoSaldo
      };
      
      conta.movimentos.push(movimento);
      conta.saldo = novoSaldo;
      conta.dataUltimaMovimentacao = new Date();
      await conta.save();
      
      console.log(`      ✅ Saldo: ${saldoAnterior.toLocaleString()} → ${novoSaldo.toLocaleString()} Kz`);
      
      return movimento;
      
    } catch (error) {
      console.error(`   ❌ Erro ao registrar crédito:`, error);
      return null;
    }
  }

  // =============================================
  // REGISTRAR DÉBITO (PAGAMENTO) - SÓ QUANDO FOR PAGO
  // =============================================
  async registrarDebitoPagamento(pagamento, empresaId) {
    try {
      console.log(`\n💳 [DÉBITO] Registrando pagamento: ${pagamento.referencia}`);
      console.log(`   Beneficiário: ${pagamento.beneficiario}`);
      console.log(`   Valor: ${pagamento.valor.toLocaleString()} Kz`);
      
      let conta = await ContaCorrente.findOne({
        empresaId,
        beneficiario: pagamento.beneficiario,
        tipo: 'Fornecedor'
      });
      
      if (!conta) {
        console.log(`   ⚠️ Conta não encontrada para: ${pagamento.beneficiario}`);
        return null;
      }
      
      const movimentoExistente = conta.movimentos.some(m => 
        m.tipo === 'Débito' && m.referencia === pagamento.referencia
      );
      
      if (movimentoExistente) {
        console.log(`   ⚠️ Pagamento já registrado`);
        return null;
      }
      
      // Encontrar o crédito correspondente
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
        valorBruto: pagamento.valorBruto || pagamento.valor,
        retencaoFonte: pagamento.valorRetencao || 0,
        descricao: pagamento.descricao || `Pagamento ${pagamento.referencia}`,
        data: pagamento.dataPagamento || new Date(),
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
      
      // Marcar crédito como pago
      if (creditoCorrespondente) {
        creditoCorrespondente.status = 'Pago';
        creditoCorrespondente.dataPagamento = new Date();
        creditoCorrespondente.pagamentoReferencia = pagamento.referencia;
      }
      
      conta.saldo = novoSaldo;
      conta.dataUltimaMovimentacao = new Date();
      await conta.save();
      
      console.log(`   ✅ DÉBITO registrado`);
      console.log(`      Saldo anterior: ${saldoAnterior.toLocaleString()} Kz`);
      console.log(`      Pagamento: ${valorPago.toLocaleString()} Kz`);
      console.log(`      Novo saldo: ${novoSaldo.toLocaleString()} Kz`);
      
      return movimento;
      
    } catch (error) {
      console.error(`   ❌ Erro ao registrar débito:`, error);
      return null;
    }
  }

  // =============================================
  // GERAR TODOS OS CRÉDITOS DO CONTRATO (ANTECIPADO)
  // =============================================
  async gerarCreditosAntecipados(fornecedor, contrato, usuario) {
    try {
      console.log(`\n💰 [CRÉDITOS ANTECIPADOS] ${fornecedor.nome}`);
      console.log(`   Contrato: ${contrato.valor.toLocaleString()} Kz - ${contrato.modalidadePagamento}`);
      
      const datasFatura = this.gerarDatasFatura(contrato);
      console.log(`   📅 Total de faturas: ${datasFatura.length}`);
      
      let creditosGerados = 0;
      
      for (const dataFatura of datasFatura) {
        const resultado = await this.registrarCreditoFatura(fornecedor, contrato, dataFatura, usuario);
        if (resultado) creditosGerados++;
      }
      
      console.log(`   ✅ ${creditosGerados} créditos gerados`);
      return creditosGerados;
      
    } catch (error) {
      console.error(`   ❌ Erro:`, error);
      return 0;
    }
  }

  // =============================================
  // GERAR PAGAMENTO (APENAS O REGISTRO, NÃO O DÉBITO)
  // =============================================
  async gerarPagamento(fornecedor, contrato, dataVencimento, usuario) {
    try {
      const mesReferencia = `${dataVencimento.getFullYear()}-${String(dataVencimento.getMonth() + 1).padStart(2, '0')}`;
      
      // Verificar se já existe pagamento para este período
      const existe = await Pagamento.findOne({
        tipo: 'Fornecedor',
        origemId: fornecedor._id,
        'detalhesPagamento.mesReferencia': mesReferencia
      });
      
      if (existe) {
        console.log(`   ⏭️ Pagamento já existe para ${mesReferencia}`);
        return existe;
      }
      
      const contaPadrao = await this.obterContaPadrao(fornecedor.empresaId);
      
      // Calcular valores com retenção
      const valorBruto = contrato.valor;
      let valorRetencao = 0;
      let valorLiquido = valorBruto;
      let taxaRetencao = 0;
      
      if (fornecedor.fiscal?.retencaoFonte) {
        taxaRetencao = fornecedor.fiscal.taxaRetencao || 
                      (fornecedor.fiscal.tipoRetencao === 'Renda' ? 15 : 6.5);
        valorRetencao = (valorBruto * taxaRetencao) / 100;
        valorLiquido = valorBruto - valorRetencao;
      }
      
      const referencia = this.gerarReferencia('FOR');
      const dataPagamento = this.calcularDataPagamento(contrato, dataVencimento);
      
      const pagamento = new Pagamento({
        referencia,
        tipo: 'Fornecedor',
        subtipo: contrato.modalidadePagamento,
        origemId: fornecedor._id,
        origemModel: 'Fornecedor',
        origemDescricao: contrato.descricao || `Contrato de ${contrato.modalidadePagamento}`,
        empresaId: fornecedor.empresaId,
        empresaNome: fornecedor.empresaNome,
        beneficiario: fornecedor.nome,
        beneficiarioDocumento: fornecedor.nif,
        valor: valorLiquido,
        valorBruto: valorBruto,
        valorRetencao: valorRetencao,
        taxaRetencao: taxaRetencao,
        saldo: valorLiquido,
        dataVencimento: dataVencimento,
        dataPagamentoSugerido: dataPagamento,
        descricao: `Pagamento ${mesReferencia} - ${contrato.descricao || 'Serviços contratados'}`,
        formaPagamento: 'Transferência Bancária',
        contaDebito: contaPadrao.codNome,
        contaDebitoId: contaPadrao.contaId,
        ibanDebito: contaPadrao.iban,
        detalhesPagamento: {
          iban: fornecedor.pagamento?.iban,
          banco: fornecedor.pagamento?.banco,
          formaPagamento: fornecedor.pagamento?.formaPagamento,
          mesReferencia: mesReferencia,
          valorBruto: valorBruto,
          valorRetencao: valorRetencao,
          taxaRetencao: taxaRetencao,
          contratoId: contrato._id,
          dataInicio: contrato.dataInicio,
          dataFim: contrato.dataFim
        },
        criadoPor: usuario,
        status: 'Pendente' // Aguardando pagamento
      });
      
      await pagamento.save();
      
      console.log(`   ✅ Pagamento criado: ${pagamento.referencia}`);
      console.log(`      Vencimento: ${dataVencimento.toLocaleDateString()}`);
      console.log(`      Sugestão pagamento: ${dataPagamento.toLocaleDateString()}`);
      console.log(`      Valor: ${valorLiquido.toLocaleString()} Kz`);
      
      return pagamento;
      
    } catch (error) {
      console.error(`   ❌ Erro ao gerar pagamento:`, error);
      return null;
    }
  }

  // =============================================
  // INTEGRAR FORNECEDOR (GERA CRÉDITOS E PAGAMENTOS)
  // =============================================
  async integrarFornecedor(fornecedor, contrato, usuario) {
    console.log('\n🏢 [INTEGRAÇÃO] Fornecedor');
    console.log(`   Nome: ${fornecedor.nome}`);
    console.log(`   Contrato: ${contrato.valor.toLocaleString()} Kz - ${contrato.modalidadePagamento}`);
    
    // 1. GERAR TODOS OS CRÉDITOS ANTECIPADOS
    const creditosGerados = await this.gerarCreditosAntecipados(fornecedor, contrato, usuario);
    
    // 2. GERAR PAGAMENTOS PARA CADA PERÍODO (APENAS REGISTRO)
    const datasFatura = this.gerarDatasFatura(contrato);
    const pagamentosGerados = [];
    
    for (const dataVencimento of datasFatura) {
      const pagamento = await this.gerarPagamento(fornecedor, contrato, dataVencimento, usuario);
      if (pagamento) pagamentosGerados.push(pagamento);
    }
    
    console.log(`\n   📊 RESUMO:`);
    console.log(`      Créditos gerados: ${creditosGerados}`);
    console.log(`      Pagamentos gerados: ${pagamentosGerados.length}`);
    
    return { creditosGerados, pagamentosGerados };
  }

  // =============================================
  // GERAR PAGAMENTOS PARA TODOS OS FORNECEDORES
  // =============================================
  async gerarPagamentosFornecedores(empresaId = null) {
    const Fornecedor = require('../models/Fornecedor');
    const query = { status: 'Ativo' };
    if (empresaId) query.empresaId = empresaId;
    
    const fornecedores = await Fornecedor.find(query);
    const resultados = [];
    
    console.log(`\n📋 Processando ${fornecedores.length} fornecedores...`);
    
    for (const fornecedor of fornecedores) {
      if (!fornecedor.contratos?.length) continue;
      
      for (const contrato of fornecedor.contratos) {
        const dataFim = new Date(contrato.dataFim);
        if (dataFim < new Date()) continue;
        
        const resultado = await this.integrarFornecedor(fornecedor, contrato, 'Sistema');
        resultados.push(resultado);
      }
    }
    
    return resultados;
  }

  // =============================================
  // FOLHA SALARIAL
  // =============================================
  async integrarFolhaSalarial(folha, empresa, usuario) {
    console.log('\n🚀 [INTEGRAÇÃO] Folha Salarial');
    console.log(`   Mês: ${folha.mesReferencia}`);
    console.log(`   Funcionários: ${folha.funcionarios?.length || 0}`);
    
    const contaPadrao = await this.obterContaPadrao(empresa._id);
    const pagamentos = [];
    
    if (!folha.funcionarios?.length) return pagamentos;
    
    const [ano, mes] = (folha.mesReferencia || '').split('-').map(Number);
    const dataVencimento = new Date(ano, mes, 5);
    
    let sequencial = 1;
    const ultimoPagamento = await Pagamento.findOne({ tipo: 'Folha Salarial' }).sort({ referencia: -1 });
    if (ultimoPagamento?.referencia) {
      const partes = ultimoPagamento.referencia.split('-');
      if (partes.length >= 3) sequencial = parseInt(partes[2]) + 1;
    }
    
    for (const funcionario of folha.funcionarios) {
      if (funcionario.salarioLiquido <= 0) continue;
      
      const referencia = this.gerarReferencia('FOL', sequencial++);
      
      const existe = await Pagamento.findOne({ 
        origemId: folha._id, 
        beneficiario: funcionario.nome,
        tipo: 'Folha Salarial'
      });
      
      if (existe) continue;
      
      const pagamento = new Pagamento({
        referencia,
        tipo: 'Folha Salarial',
        subtipo: 'Salário',
        origemId: folha._id,
        origemModel: 'FolhaSalarial',
        origemDescricao: `Folha ${folha.mesReferencia}`,
        empresaId: empresa._id,
        empresaNome: empresa.nome,
        beneficiario: funcionario.nome,
        beneficiarioDocumento: funcionario.iban || funcionario.nif,
        valor: funcionario.salarioLiquido,
        saldo: funcionario.salarioLiquido,
        dataVencimento: dataVencimento,
        descricao: `Salário ${funcionario.nome} - ${folha.mesReferencia}`,
        formaPagamento: 'Transferência Bancária',
        contaDebito: contaPadrao.codNome,
        contaDebitoId: contaPadrao.contaId,
        ibanDebito: contaPadrao.iban,
        criadoPor: usuario,
        status: 'Pendente'
      });
      
      await pagamento.save();
      pagamentos.push(pagamento);
      console.log(`   ✅ ${pagamento.referencia} - ${funcionario.nome}: ${funcionario.salarioLiquido.toLocaleString()} Kz`);
    }
    
    return pagamentos;
  }

  // =============================================
  // MANUTENÇÃO
  // =============================================
  async integrarManutencao(manutencao, empresa, usuario) {
    if (!manutencao.custo || manutencao.custo <= 0) return null;
    
    const contaPadrao = await this.obterContaPadrao(empresa._id);
    const referencia = this.gerarReferencia('MAN');
    
    const pagamento = new Pagamento({
      referencia,
      tipo: 'Manutenção',
      subtipo: manutencao.tipoManutencao || 'Geral',
      origemId: manutencao._id,
      origemModel: 'Manutencao',
      origemDescricao: `${manutencao.descricao} - ${manutencao.viaturaMatricula}`,
      empresaId: empresa._id,
      empresaNome: empresa.nome,
      beneficiario: manutencao.fornecedor || 'Oficina',
      valor: manutencao.custo,
      saldo: manutencao.custo,
      dataVencimento: new Date(Date.now() + 15 * 86400000),
      descricao: manutencao.descricao,
      formaPagamento: 'Transferência Bancária',
      contaDebito: contaPadrao.codNome,
      contaDebitoId: contaPadrao.contaId,
      ibanDebito: contaPadrao.iban,
      criadoPor: usuario,
      status: 'Pendente'
    });
    
    await pagamento.save();
    console.log(`   ✅ Pagamento manutenção: ${pagamento.referencia} - ${pagamento.valor.toLocaleString()} Kz`);
    return pagamento;
  }

  // =============================================
  // ABASTECIMENTO
  // =============================================
  async integrarAbastecimento(abastecimento, empresa, usuario) {
    if (!abastecimento.total || abastecimento.total <= 0) return null;
    
    const contaPadrao = await this.obterContaPadrao(empresa._id);
    const referencia = this.gerarReferencia('ABA');
    
    const pagamento = new Pagamento({
      referencia,
      tipo: 'Abastecimento',
      subtipo: abastecimento.tipoCombustivel || 'Combustível',
      origemId: abastecimento._id,
      origemModel: 'Abastecimento',
      origemDescricao: `${abastecimento.tipoCombustivel} - ${abastecimento.viaturaMatricula}`,
      empresaId: empresa._id,
      empresaNome: empresa.nome,
      beneficiario: abastecimento.postoCombustivel || 'Posto',
      valor: abastecimento.total,
      saldo: abastecimento.total,
      dataVencimento: new Date(Date.now() + 7 * 86400000),
      descricao: `${abastecimento.quantidade}L - ${abastecimento.tipoCombustivel}`,
      formaPagamento: 'Transferência Bancária',
      contaDebito: contaPadrao.codNome,
      contaDebitoId: contaPadrao.contaId,
      ibanDebito: contaPadrao.iban,
      criadoPor: usuario,
      status: 'Pendente'
    });
    
    await pagamento.save();
    console.log(`   ✅ Pagamento abastecimento: ${pagamento.referencia} - ${pagamento.valor.toLocaleString()} Kz`);
    return pagamento;
  }

  // =============================================
  // VENDA
  // =============================================
  async integrarVenda(venda, empresa, usuario) {
    if (!venda.total || venda.total <= 0) return null;
    if (venda.formaPagamento === 'Dinheiro') return null;
    
    const referencia = this.gerarReferencia('REC');
    
    const pagamento = new Pagamento({
      referencia,
      tipo: 'Conta a Receber',
      subtipo: 'Venda',
      origemId: venda._id,
      origemModel: 'Venda',
      origemDescricao: `Factura Nº ${venda.numeroFactura} - ${venda.cliente}`,
      empresaId: empresa._id,
      empresaNome: empresa.nome,
      beneficiario: venda.cliente,
      beneficiarioDocumento: venda.nifCliente,
      valor: venda.total,
      saldo: venda.total,
      dataVencimento: new Date(Date.now() + 30 * 86400000),
      descricao: `Venda de mercadorias - Factura Nº ${venda.numeroFactura}`,
      formaPagamento: venda.formaPagamento || 'Transferência Bancária',
      criadoPor: usuario,
      status: 'Pendente'
    });
    
    await pagamento.save();
    console.log(`   ✅ Conta a receber: ${pagamento.referencia} - ${pagamento.valor.toLocaleString()} Kz`);
    return pagamento;
  }
}

module.exports = new IntegracaoPagamentos();