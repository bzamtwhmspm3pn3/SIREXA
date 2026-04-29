// backend/cronJobs.js
const cron = require('node-cron');
const Fornecedor = require('./models/Fornecedor');
const Pagamento = require('./models/Pagamento');
const integracaoPagamentos = require('./services/integracaoPagamentos');

function iniciarCronJobs() {
  console.log('⏰ Iniciando agendador de tarefas automáticas...\n');

  // =============================================
  // TAREFA 1: Gerar pagamentos de fornecedores - TODOS OS DIAS ÀS 00:00
  // =============================================
  cron.schedule('0 0 * * *', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 [CRON - DIÁRIO] Executando geração automática de pagamentos...');
    console.log(`📅 Data: ${new Date().toLocaleString('pt-AO')}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    let totalGerados = 0;
    let totalErros = 0;
    let totalFornecedores = 0;
    let totalContratosProcessados = 0;
    
    try {
      // Buscar todos os fornecedores ativos
      const fornecedores = await Fornecedor.find({ status: 'Ativo' });
      totalFornecedores = fornecedores.length;
      console.log(`🏢 Fornecedores ativos: ${totalFornecedores}\n`);
      
      for (const fornecedor of fornecedores) {
        console.log(`📌 Processando: ${fornecedor.nome}`);
        
        for (let i = 0; i < fornecedor.contratos.length; i++) {
          const contrato = fornecedor.contratos[i];
          totalContratosProcessados++;
          
          const hoje = new Date();
          const dataFim = new Date(contrato.dataFim);
          
          // Verificar se contrato está ativo
          if (dataFim < hoje) {
            console.log(`   ⏭️ Contrato ${i + 1} expirado em ${dataFim.toLocaleDateString()}`);
            continue;
          }
          
          // Verificar se é contrato único
          if (contrato.modalidadePagamento === 'Único') {
            console.log(`   ⏭️ Contrato ${i + 1} é único - verificar pagamento...`);
            const pagamentoExistente = await Pagamento.findOne({
              tipo: 'Fornecedor',
              origemId: fornecedor._id,
              'detalhesPagamento.contratoId': contrato._id
            });
            
            if (!pagamentoExistente && contrato.dataFim) {
              console.log(`   🚀 Gerando pagamento único...`);
              try {
                const pagamento = await integracaoPagamentos.integrarFornecedor(
                  fornecedor, contrato, 'Cron Job'
                );
                if (pagamento) {
                  totalGerados++;
                  console.log(`      ✅ Pagamento gerado: ${pagamento.referencia} - ${pagamento.valor} Kz`);
                }
              } catch (err) {
                totalErros++;
                console.error(`      ❌ Erro: ${err.message}`);
              }
            }
            continue;
          }
          
          // Para contratos recorrentes
          if (contrato.proximoPagamento) {
            const hoje = new Date();
            const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
            const mesPagamento = `${contrato.proximoPagamento.getFullYear()}-${String(contrato.proximoPagamento.getMonth() + 1).padStart(2, '0')}`;
            
            if (mesAtual === mesPagamento) {
              console.log(`   📄 Contrato ${i + 1}: ${contrato.modalidadePagamento} - ${contrato.valor} Kz`);
              console.log(`      Próximo pagamento: ${contrato.proximoPagamento.toLocaleDateString()}`);
              
              // Verificar se já existe pagamento para este mês
              const pagamentoExistente = await Pagamento.findOne({
                tipo: 'Fornecedor',
                origemId: fornecedor._id,
                'detalhesPagamento.mesReferencia': mesAtual
              });
              
              if (!pagamentoExistente) {
                try {
                  const pagamento = await integracaoPagamentos.integrarFornecedor(
                    fornecedor, contrato, 'Cron Job'
                  );
                  if (pagamento) {
                    totalGerados++;
                    console.log(`      ✅ Pagamento gerado: ${pagamento.referencia} - ${pagamento.valor} Kz`);
                  }
                } catch (err) {
                  totalErros++;
                  console.error(`      ❌ Erro: ${err.message}`);
                }
              } else {
                console.log(`      ⏭️ Pagamento já existe para este período`);
              }
            }
          } else {
            console.log(`   ⚠️ Contrato ${i + 1} sem próximo pagamento calculado`);
          }
        }
        console.log(); // Linha em branco entre fornecedores
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('='.repeat(60));
      console.log(`📊 RESUMO DA EXECUÇÃO:`);
      console.log(`   Fornecedores processados: ${totalFornecedores}`);
      console.log(`   Contratos processados: ${totalContratosProcessados}`);
      console.log(`   Pagamentos gerados: ${totalGerados}`);
      console.log(`   Erros: ${totalErros}`);
      console.log(`   Tempo total: ${duration} segundos`);
      console.log('='.repeat(60) + '\n');
      
    } catch (error) {
      console.error('❌ [CRON] Erro fatal:', error);
    }
  });

  // =============================================
  // TAREFA 2: Atualizar status de pagamentos atrasados - A CADA 6 HORAS
  // =============================================
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n🔔 [CRON - ATUALIZAÇÃO] Verificando pagamentos atrasados...');
    
    try {
      const hoje = new Date();
      const result = await Pagamento.updateMany(
        {
          status: { $in: ['Pendente', 'Aguardando Aprovação'] },
          dataVencimento: { $lt: hoje }
        },
        {
          status: 'Atrasado',
          updatedAt: new Date()
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`   ⚠️ ${result.modifiedCount} pagamentos marcados como atrasados`);
      } else {
        console.log(`   ✅ Nenhum pagamento atrasado encontrado`);
      }
    } catch (error) {
      console.error('   ❌ Erro ao atualizar atrasados:', error);
    }
  });

  // =============================================
  // TAREFA 3: Limpeza de logs - TODO PRIMEIRO DIA DO MÊS
  // =============================================
  cron.schedule('0 0 1 * *', async () => {
    console.log('\n🧹 [CRON - MANUTENÇÃO] Iniciando limpeza de logs...');
    
    try {
      // Remover pagamentos cancelados com mais de 1 ano
      const umAnoAtras = new Date();
      umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
      
      const result = await Pagamento.deleteMany({
        status: 'Cancelado',
        updatedAt: { $lt: umAnoAtras }
      });
      
      if (result.deletedCount > 0) {
        console.log(`   🗑️ ${result.deletedCount} pagamentos cancelados antigos removidos`);
      }
      
    } catch (error) {
      console.error('   ❌ Erro na limpeza:', error);
    }
  });

  console.log('✅ Todos os cron jobs foram iniciados com sucesso!');
  console.log('   📅 Diário (00:00): Gerar pagamentos de fornecedores');
  console.log('   ⏰ 6 em 6 horas: Atualizar status de atrasados');
  console.log('   🧹 Mensal (dia 1): Limpar logs antigos\n');
}

module.exports = { iniciarCronJobs };