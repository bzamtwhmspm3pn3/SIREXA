// backend/services/gestaoContaCorrente.js
const ContaCorrente = require('../models/ContaCorrente');
const Pagamento = require('../models/Pagamento');
const Fornecedor = require('../models/Fornecedor');

class GestaoContaCorrente {
  
  // =============================================
  // GERAR TODOS OS CRÉDITOS DO CONTRATO (ANTECIPADO)
  // =============================================
  async gerarCreditosContrato(fornecedor, contrato, usuario = 'Sistema') {
    try {
      console.log(`\n💰 [CRÉDITOS] Gerando créditos para ${fornecedor.nome}`);
      console.log(`   Contrato: ${contrato.valor} Kz - ${contrato.modalidadePagamento}`);
      console.log(`   Período: ${new Date(contrato.dataInicio).toLocaleDateString()} até ${new Date(contrato.dataFim).toLocaleDateString()}`);
      
      const empresaId = fornecedor.empresaId;
      const valorMensal = contrato.valor;
      
      // Calcular todas as datas de vencimento das faturas
      const datasFatura = this.calcularDatasFatura(contrato);
      
      console.log(`   📅 Total de faturas a gerar: ${datasFatura.length}`);
      
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
      
      let creditosGerados = 0;
      let creditosExistentes = 0;
      
      for (const dataFatura of datasFatura) {
        const mesReferencia = `${dataFatura.getFullYear()}-${String(dataFatura.getMonth() + 1).padStart(2, '0')}`;
        const referenciaFatura = `FAT-${fornecedor.nome.substring(0, 3).toUpperCase()}-${mesReferencia}`;
        
        // Verificar se crédito já existe
        const faturaExistente = conta.movimentos.some(m => 
          m.tipo === 'Crédito' && m.referencia === referenciaFatura
        );
        
        if (!faturaExistente) {
          const saldoAnterior = conta.saldo;
          const novoSaldo = saldoAnterior + valorMensal;
          
          const movimento = {
            tipo: 'Crédito',
            valor: valorMensal,
            descricao: `Fatura ${mesReferencia} - ${contrato.descricao || 'Serviços contratados'}`,
            data: dataFatura,
            referencia: referenciaFatura,
            documentoReferencia: referenciaFatura,
            origemModel: 'Fatura',
            origemId: fornecedor._id,
            contratoId: contrato._id,
            mesReferencia: mesReferencia,
            dataVencimento: dataFatura,
            status: 'Pendente', // Fatura pendente
            saldoAnterior: saldoAnterior,
            saldoAtual: novoSaldo
          };
          
          conta.movimentos.push(movimento);
          conta.saldo = novoSaldo;
          creditosGerados++;
          
          console.log(`      ✅ Crédito ${creditosGerados}/${datasFatura.length}: ${referenciaFatura} - ${valorMensal.toLocaleString()} Kz (Venc: ${dataFatura.toLocaleDateString()})`);
        } else {
          creditosExistentes++;
        }
      }
      
      conta.dataUltimaMovimentacao = new Date();
      await conta.save();
      
      console.log(`   📊 Resumo: ${creditosGerados} créditos gerados, ${creditosExistentes} já existiam`);
      
      return { creditosGerados, creditosExistentes, total: datasFatura.length };
      
    } catch (error) {
      console.error(`   ❌ Erro ao gerar créditos:`, error);
      return { creditosGerados: 0, creditosExistentes: 0, total: 0, error: error.message };
    }
  }
  
  // =============================================
  // CALCULAR DATAS DAS FATURAS BASEADO NO CONTRATO
  // =============================================
  calcularDatasFatura(contrato) {
    const datas = [];
    const dataInicio = new Date(contrato.dataInicio);
    const dataFim = new Date(contrato.dataFim);
    const diaVencimento = contrato.diaVencimento || 5;
    const modalidade = contrato.modalidadePagamento;
    
    let dataAtual = new Date(dataInicio);
    
    switch (modalidade) {
      case 'Mensal':
        let primeiraData = new Date(dataInicio);
        primeiraData.setDate(diaVencimento);
        if (primeiraData < dataInicio) {
          primeiraData.setMonth(primeiraData.getMonth() + 1);
        }
        
        while (primeiraData <= dataFim) {
          datas.push(new Date(primeiraData));
          primeiraData.setMonth(primeiraData.getMonth() + 1);
        }
        break;
        
      case 'Bimestral':
        let dataBimestral = new Date(dataInicio);
        dataBimestral.setDate(diaVencimento);
        if (dataBimestral < dataInicio) {
          dataBimestral.setMonth(dataBimestral.getMonth() + 2);
        }
        
        while (dataBimestral <= dataFim) {
          datas.push(new Date(dataBimestral));
          dataBimestral.setMonth(dataBimestral.getMonth() + 2);
        }
        break;
        
      case 'Trimestral':
        let dataTrimestral = new Date(dataInicio);
        dataTrimestral.setDate(diaVencimento);
        if (dataTrimestral < dataInicio) {
          dataTrimestral.setMonth(dataTrimestral.getMonth() + 3);
        }
        
        while (dataTrimestral <= dataFim) {
          datas.push(new Date(dataTrimestral));
          dataTrimestral.setMonth(dataTrimestral.getMonth() + 3);
        }
        break;
        
      case 'Semestral':
        let dataSemestral = new Date(dataInicio);
        dataSemestral.setDate(diaVencimento);
        if (dataSemestral < dataInicio) {
          dataSemestral.setMonth(dataSemestral.getMonth() + 6);
        }
        
        while (dataSemestral <= dataFim) {
          datas.push(new Date(dataSemestral));
          dataSemestral.setMonth(dataSemestral.getMonth() + 6);
        }
        break;
        
      case 'Anual':
        let dataAnual = new Date(dataInicio);
        dataAnual.setDate(diaVencimento);
        if (dataAnual < dataInicio) {
          dataAnual.setFullYear(dataAnual.getFullYear() + 1);
        }
        
        while (dataAnual <= dataFim) {
          datas.push(new Date(dataAnual));
          dataAnual.setFullYear(dataAnual.getFullYear() + 1);
        }
        break;
        
      case 'Único':
        datas.push(new Date(contrato.dataFim));
        break;
        
      default:
        // Mensal como padrão
        let dataPadrao = new Date(dataInicio);
        dataPadrao.setDate(diaVencimento);
        while (dataPadrao <= dataFim) {
          datas.push(new Date(dataPadrao));
          dataPadrao.setMonth(dataPadrao.getMonth() + 1);
        }
    }
    
    return datas;
  }
  
  // =============================================
  // REGISTRAR DÉBITO (PAGAMENTO) - APENAS QUANDO PAGO
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
      
      // Encontrar o crédito correspondente (fatura)
      const mesReferencia = pagamento.detalhesPagamento?.mesReferencia;
      let creditoCorrespondente = null;
      
      if (mesReferencia) {
        const referenciaFatura = `FAT-${pagamento.beneficiario.substring(0, 3).toUpperCase()}-${mesReferencia}`;
        creditoCorrespondente = conta.movimentos.find(m => 
          m.tipo === 'Crédito' && m.referencia === referenciaFatura && !m.pago
        );
      }
      
      // Verificar se o pagamento já foi registrado
      const movimentoExistente = conta.movimentos.some(m => 
        m.tipo === 'Débito' && m.referencia === pagamento.referencia
      );
      
      if (movimentoExistente) {
        console.log(`   ⚠️ Pagamento ${pagamento.referencia} já registrado`);
        return null;
      }
      
      const saldoAnterior = conta.saldo;
      const valorPago = pagamento.valorLiquido || pagamento.valor;
      const novoSaldo = saldoAnterior - valorPago;
      
      const movimento = {
        tipo: 'Débito',
        valor: valorPago,
        valorBruto: pagamento.valorBruto || pagamento.valor,
        retencaoFonte: pagamento.valorRetencao || 0,
        descricao: `Pagamento ${pagamento.referencia} - ${pagamento.descricao || ''}`,
        data: pagamento.dataPagamento || new Date(),
        referencia: pagamento.referencia,
        documentoReferencia: pagamento.referenciaBancaria || '',
        formaPagamento: pagamento.formaPagamento || 'Transferência Bancária',
        origemId: pagamento._id,
        origemModel: 'Pagamento',
        mesReferencia: mesReferencia,
        creditoCorrespondente: creditoCorrespondente?.referencia,
        status: 'Pago',
        saldoAnterior: saldoAnterior,
        saldoAtual: novoSaldo
      };
      
      conta.movimentos.push(movimento);
      
      // Marcar o crédito correspondente como pago
      if (creditoCorrespondente) {
        creditoCorrespondente.status = 'Pago';
        creditoCorrespondente.dataPagamento = new Date();
        creditoCorrespondente.pagamentoReferencia = pagamento.referencia;
      }
      
      conta.saldo = novoSaldo;
      conta.dataUltimaMovimentacao = new Date();
      await conta.save();
      
      console.log(`   ✅ DÉBITO registrado: ${pagamento.beneficiario}`);
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
  // GERAR CRÉDITOS PARA TODOS OS FORNECEDORES
  // =============================================
  async gerarCreditosTodosFornecedores(empresaId = null) {
    const query = { status: 'Ativo' };
    if (empresaId) query.empresaId = empresaId;
    
    const fornecedores = await Fornecedor.find(query);
    let totalCreditos = 0;
    
    console.log(`\n🏢 Processando ${fornecedores.length} fornecedores...`);
    
    for (const fornecedor of fornecedores) {
      if (!fornecedor.contratos || fornecedor.contratos.length === 0) continue;
      
      for (const contrato of fornecedor.contratos) {
        const hoje = new Date();
        const dataFim = new Date(contrato.dataFim);
        
        if (dataFim < hoje) continue;
        
        const resultado = await this.gerarCreditosContrato(fornecedor, contrato, 'Sistema');
        totalCreditos += resultado.creditosGerados;
      }
    }
    
    console.log(`\n✅ Total de créditos gerados: ${totalCreditos}`);
    return totalCreditos;
  }
  
  // =============================================
  // OBTER EXTRATO DO FORNECEDOR
  // =============================================
  async obterExtrato(fornecedorId, empresaId) {
    try {
      const fornecedor = await Fornecedor.findById(fornecedorId);
      if (!fornecedor) return null;
      
      const conta = await ContaCorrente.findOne({
        empresaId,
        beneficiario: fornecedor.nome,
        tipo: 'Fornecedor'
      });
      
      if (!conta) {
        return {
          beneficiario: fornecedor.nome,
          saldo: 0,
          movimentos: [],
          creditosPendentes: [],
          creditosPagos: []
        };
      }
      
      // Separar créditos pendentes e pagos
      const creditos = conta.movimentos.filter(m => m.tipo === 'Crédito');
      const debitos = conta.movimentos.filter(m => m.tipo === 'Débito');
      
      const creditosPendentes = creditos.filter(c => c.status !== 'Pago');
      const creditosPagos = creditos.filter(c => c.status === 'Pago');
      
      // Ordenar movimentos por data
      const todosMovimentos = [...creditos, ...debitos].sort((a, b) => new Date(a.data) - new Date(b.data));
      
      return {
        beneficiario: conta.beneficiario,
        nif: fornecedor.nif,
        saldo: conta.saldo,
        movimentos: todosMovimentos,
        creditosPendentes,
        creditosPagos,
        totalCreditos: creditos.length,
        totalPago: debitos.reduce((sum, d) => sum + d.valor, 0),
        totalFaturas: creditos.reduce((sum, c) => sum + c.valor, 0)
      };
      
    } catch (error) {
      console.error('Erro ao obter extrato:', error);
      return null;
    }
  }
}

module.exports = new GestaoContaCorrente();