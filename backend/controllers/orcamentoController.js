const Orcamento = require('../models/Orcamento');
const Venda = require('../models/Venda');
const Pagamento = require('../models/Pagamento');
const Empresa = require('../models/Empresa');
const XLSX = require('xlsx');
const jsPDF = require('jspdf');
const html2canvas = require('html2canvas');

// =============================================
// CRUD BÁSICO
// =============================================

// Listar orçamentos
exports.listarOrcamentos = async (req, res) => {
  try {
    const { empresaId, mes, ano, tipoOrcamento, cenario, status, busca } = req.query;
    
    const query = {};
    if (empresaId) query.empresaId = empresaId;
    if (mes) query.mes = parseInt(mes);
    if (ano) query.ano = parseInt(ano);
    if (tipoOrcamento && tipoOrcamento !== 'Todos') query.tipoOrcamento = tipoOrcamento;
    if (cenario && cenario !== 'Todos') query.cenario = cenario;
    if (status && status !== 'Todos') query.status = status;
    if (busca) {
      query.$or = [
        { descricao: { $regex: busca, $options: 'i' } },
        { categoria: { $regex: busca, $options: 'i' } }
      ];
    }
    
    const orcamentos = await Orcamento.find(query).sort({ createdAt: -1 });
    res.json(orcamentos);
  } catch (error) {
    console.error('Erro ao listar orçamentos:', error);
    res.status(500).json({ erro: error.message });
  }
};

// Obter orçamento por ID
exports.getOrcamentoById = async (req, res) => {
  try {
    const { id } = req.params;
    const orcamento = await Orcamento.findById(id);
    if (!orcamento) {
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }
    res.json(orcamento);
  } catch (error) {
    console.error('Erro ao buscar orçamento:', error);
    res.status(500).json({ erro: error.message });
  }
};

// Criar orçamento
exports.criarOrcamento = async (req, res) => {
  try {
    const { empresaId, descricao, tipoOrcamento, cenario, valor, mes, ano, categoria, justificativa, observacoes } = req.body;
    const usuario = req.user?.nome || req.user?.email || 'Sistema';
    
    if (!empresaId) {
      return res.status(400).json({ erro: 'Empresa não informada' });
    }
    
    // Verificar se a empresa existe
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ erro: 'Empresa não encontrada' });
    }
    
    const orcamento = new Orcamento({
      empresaId,
      descricao,
      tipoOrcamento,
      cenario: cenario || 'Realista',
      valor: parseFloat(valor),
      mes: parseInt(mes),
      ano: parseInt(ano),
      categoria: categoria || '',
      justificativa: justificativa || '',
      observacoes: observacoes || '',
      dataOrcamento: new Date(ano, mes - 1),
      status: 'Pendente',
      criadoPor: usuario,
      historico: [{
        campo: 'criação',
        valorAntigo: null,
        valorNovo: 'Orçamento criado',
        alteradoPor: usuario,
        data: new Date()
      }]
    });
    
    await orcamento.save();
    res.status(201).json(orcamento);
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    res.status(500).json({ erro: error.message });
  }
};

// Atualizar orçamento
exports.atualizarOrcamento = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const usuario = req.user?.nome || req.user?.email || 'Sistema';
    
    const orcamento = await Orcamento.findById(id);
    if (!orcamento) {
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }
    
    // Registrar alterações no histórico
    for (const [campo, novoValor] of Object.entries(updates)) {
      if (orcamento[campo] !== novoValor && campo !== 'historico' && campo !== 'comentarios' && campo !== '__v' && campo !== '_id') {
        orcamento.historico.push({
          campo,
          valorAntigo: orcamento[campo],
          valorNovo: novoValor,
          alteradoPor: usuario,
          data: new Date()
        });
      }
    }
    
    Object.assign(orcamento, updates);
    orcamento.atualizadoPor = usuario;
    orcamento.updatedAt = new Date();
    await orcamento.save();
    
    res.json(orcamento);
  } catch (error) {
    console.error('Erro ao atualizar orçamento:', error);
    res.status(500).json({ erro: error.message });
  }
};

// Excluir orçamento
exports.excluirOrcamento = async (req, res) => {
  try {
    const { id } = req.params;
    const orcamento = await Orcamento.findByIdAndDelete(id);
    if (!orcamento) {
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }
    res.json({ mensagem: 'Orçamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    res.status(500).json({ erro: error.message });
  }
};

// =============================================
// COMPARAÇÃO COM DADOS REAIS
// =============================================

exports.compararOrcamentoReal = async (req, res) => {
  try {
    const { empresaId, mes, ano } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ erro: 'Empresa não informada' });
    }
    
    const mesNum = parseInt(mes) || new Date().getMonth() + 1;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    
    // Buscar orçamentos do período
    const orcamentos = await Orcamento.find({ 
      empresaId, 
      mes: mesNum, 
      ano: anoNum,
      status: { $in: ['Aprovado', 'Em Execução'] }
    });
    
    // Buscar dados reais
    const vendas = await Venda.find({ empresaId, status: 'finalizada' });
    const pagamentos = await Pagamento.find({ empresaId, status: 'Pago' });
    
    // Filtrar por período
    const vendasPeriodo = vendas.filter(v => {
      const data = new Date(v.data);
      return data.getMonth() + 1 === mesNum && data.getFullYear() === anoNum;
    });
    
    const pagamentosPeriodo = pagamentos.filter(p => {
      const data = new Date(p.dataPagamento);
      return data.getMonth() + 1 === mesNum && data.getFullYear() === anoNum;
    });
    
    const totalVendasReal = vendasPeriodo.reduce((sum, v) => sum + (v.total || 0), 0);
    const totalCustosReal = pagamentosPeriodo.reduce((sum, p) => sum + (p.valor || 0), 0);
    
    // Mapear orçamentos por tipo
    const orcamentosPorTipo = {};
    orcamentos.forEach(o => {
      if (!orcamentosPorTipo[o.tipoOrcamento]) {
        orcamentosPorTipo[o.tipoOrcamento] = { orcado: 0, realizado: 0, itens: [] };
      }
      orcamentosPorTipo[o.tipoOrcamento].orcado += o.valor;
      orcamentosPorTipo[o.tipoOrcamento].itens.push(o);
    });
    
    // Atribuir valores realizados conforme tipo
    if (orcamentosPorTipo['Vendas']) {
      orcamentosPorTipo['Vendas'].realizado = totalVendasReal;
    }
    if (orcamentosPorTipo['Custos']) {
      orcamentosPorTipo['Custos'].realizado = totalCustosReal;
    }
    if (orcamentosPorTipo['Opex']) {
      orcamentosPorTipo['Opex'].realizado = totalCustosReal;
    }
    
    // Calcular percentuais e desvios
    const comparacao = [];
    let totalOrcado = 0;
    let totalRealizado = 0;
    
    for (const [tipo, dados] of Object.entries(orcamentosPorTipo)) {
      const percentual = dados.orcado > 0 ? (dados.realizado / dados.orcado) * 100 : 0;
      const desvio = dados.realizado - dados.orcado;
      totalOrcado += dados.orcado;
      totalRealizado += dados.realizado;
      
      let status = '⚠️';
      let cor = 'text-yellow-400';
      if (percentual <= 100 && tipo !== 'Vendas') {
        status = '✅';
        cor = 'text-green-400';
      } else if (percentual > 100 && tipo === 'Vendas') {
        status = '✅';
        cor = 'text-green-400';
      } else if (percentual > 110) {
        status = '🔴';
        cor = 'text-red-400';
      }
      
      comparacao.push({
        tipo,
        orcado: dados.orcado,
        realizado: dados.realizado,
        percentual: percentual.toFixed(2),
        desvio,
        status,
        cor,
        itens: dados.itens
      });
    }
    
    const percentualGeral = totalOrcado > 0 ? (totalRealizado / totalOrcado) * 100 : 0;
    
    res.json({
      comparacao,
      resumo: {
        totalOrcado,
        totalRealizado,
        percentualGeral: percentualGeral.toFixed(2),
        desvioGeral: totalRealizado - totalOrcado
      }
    });
    
  } catch (error) {
    console.error('Erro ao comparar:', error);
    res.status(500).json({ erro: error.message });
  }
};

// =============================================
// PREVISÕES E TENDÊNCIAS
// =============================================

exports.obterPrevisao = async (req, res) => {
  try {
    const { empresaId, tipoOrcamento, mesesPrevisao = 3 } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ erro: 'Empresa não informada' });
    }
    
    // Buscar histórico de orçamentos aprovados
    const query = { empresaId, status: 'Aprovado' };
    if (tipoOrcamento && tipoOrcamento !== 'Todos') query.tipoOrcamento = tipoOrcamento;
    
    const orcamentos = await Orcamento.find(query).sort({ ano: 1, mes: 1 });
    
    // Agrupar por mês/ano
    const historicoPorMes = {};
    orcamentos.forEach(o => {
      const chave = `${o.ano}-${o.mes}`;
      if (!historicoPorMes[chave]) {
        historicoPorMes[chave] = { ano: o.ano, mes: o.mes, valor: 0 };
      }
      historicoPorMes[chave].valor += o.valor;
    });
    
    const historico = Object.values(historicoPorMes).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    });
    
    // Calcular média móvel para previsão
    const valores = historico.map(h => h.valor);
    const mediaMovel = valores.length > 0 ? valores.reduce((sum, v) => sum + v, 0) / valores.length : 0;
    
    // Calcular tendência
    let tendencia = 0;
    if (valores.length > 1) {
      tendencia = (valores[valores.length - 1] - valores[0]) / valores.length;
    }
    
    // Calcular variação percentual
    let variacao = 0;
    if (valores.length > 1 && valores[0] !== 0) {
      variacao = ((valores[valores.length - 1] - valores[0]) / valores[0]) * 100;
    }
    
    // Gerar previsões
    const previsoes = [];
    const ultimoMes = historico.length > 0 ? historico[historico.length - 1] : { ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 };
    
    for (let i = 1; i <= parseInt(mesesPrevisao); i++) {
      let mesPrevisao = ultimoMes.mes + i;
      let anoPrevisao = ultimoMes.ano;
      if (mesPrevisao > 12) {
        mesPrevisao -= 12;
        anoPrevisao++;
      }
      
      const valorPrevisao = Math.max(0, mediaMovel + (tendencia * i));
      previsoes.push({
        mes: mesPrevisao,
        ano: anoPrevisao,
        valor: valorPrevisao,
        intervaloConfianca: {
          inferior: Math.max(0, valorPrevisao * 0.85),
          superior: valorPrevisao * 1.15
        }
      });
    }
    
    res.json({
      historico,
      previsoes,
      estatisticas: {
        media: mediaMovel,
        tendencia: tendencia,
        variacao: variacao.toFixed(2),
        totalPeriodos: historico.length
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar previsão:', error);
    res.status(500).json({ erro: error.message });
  }
};

// =============================================
// APROVAÇÃO DE ORÇAMENTOS
// =============================================

exports.aprovarOrcamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuario = req.user?.nome || req.user?.email || 'Sistema';
    
    const orcamento = await Orcamento.findById(id);
    if (!orcamento) {
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }
    
    if (orcamento.status === 'Aprovado') {
      return res.status(400).json({ erro: 'Orçamento já está aprovado' });
    }
    
    const statusAnterior = orcamento.status;
    orcamento.status = 'Aprovado';
    orcamento.aprovadoPor = usuario;
    orcamento.dataAprovacao = new Date();
    orcamento.cenario = 'Aprovado';
    
    orcamento.historico.push({
      campo: 'status',
      valorAntigo: statusAnterior,
      valorNovo: 'Aprovado',
      alteradoPor: usuario,
      data: new Date(),
      observacao: motivo
    });
    
    await orcamento.save();
    res.json({ mensagem: 'Orçamento aprovado com sucesso', orcamento });
  } catch (error) {
    console.error('Erro ao aprovar:', error);
    res.status(500).json({ erro: error.message });
  }
};

exports.rejeitarOrcamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuario = req.user?.nome || req.user?.email || 'Sistema';
    
    const orcamento = await Orcamento.findById(id);
    if (!orcamento) {
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }
    
    if (!motivo) {
      return res.status(400).json({ erro: 'Motivo da rejeição é obrigatório' });
    }
    
    const statusAnterior = orcamento.status;
    orcamento.status = 'Rejeitado';
    orcamento.motivoRejeicao = motivo;
    
    orcamento.historico.push({
      campo: 'status',
      valorAntigo: statusAnterior,
      valorNovo: 'Rejeitado',
      alteradoPor: usuario,
      data: new Date(),
      observacao: motivo
    });
    
    await orcamento.save();
    res.json({ mensagem: 'Orçamento rejeitado', orcamento });
  } catch (error) {
    console.error('Erro ao rejeitar:', error);
    res.status(500).json({ erro: error.message });
  }
};

// Adicionar comentário
exports.adicionarComentario = async (req, res) => {
  try {
    const { id } = req.params;
    const { texto } = req.body;
    const usuario = req.user?.nome || req.user?.email || 'Sistema';
    
    if (!texto) {
      return res.status(400).json({ erro: 'Comentário é obrigatório' });
    }
    
    const orcamento = await Orcamento.findById(id);
    if (!orcamento) {
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }
    
    orcamento.comentarios.push({
      texto,
      autor: usuario,
      data: new Date()
    });
    
    await orcamento.save();
    res.json({ mensagem: 'Comentário adicionado', comentarios: orcamento.comentarios });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({ erro: error.message });
  }
};

// =============================================
// DASHBOARD
// =============================================

exports.getDashboard = async (req, res) => {
  try {
    const { empresaId, ano } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    
    if (!empresaId) {
      return res.status(400).json({ erro: 'Empresa não informada' });
    }
    
    const orcamentos = await Orcamento.find({ empresaId, ano: anoNum });
    
    const totaisPorTipo = {};
    const totaisPorMes = {};
    const totaisPorCenario = {};
    const totaisPorStatus = {};
    
    orcamentos.forEach(o => {
      // Por tipo
      if (!totaisPorTipo[o.tipoOrcamento]) totaisPorTipo[o.tipoOrcamento] = 0;
      totaisPorTipo[o.tipoOrcamento] += o.valor;
      
      // Por mês
      const mesNome = new Date(anoNum, o.mes - 1).toLocaleDateString('pt-AO', { month: 'short' });
      if (!totaisPorMes[mesNome]) totaisPorMes[mesNome] = 0;
      totaisPorMes[mesNome] += o.valor;
      
      // Por cenário
      if (!totaisPorCenario[o.cenario]) totaisPorCenario[o.cenario] = 0;
      totaisPorCenario[o.cenario] += o.valor;
      
      // Por status
      if (!totaisPorStatus[o.status]) totaisPorStatus[o.status] = 0;
      totaisPorStatus[o.status] += o.valor;
    });
    
    res.json({
      totalGeral: orcamentos.reduce((sum, o) => sum + o.valor, 0),
      totalOrcamentos: orcamentos.length,
      totaisPorTipo,
      totaisPorMes,
      totaisPorCenario,
      totaisPorStatus,
      distribuicao: Object.entries(totaisPorTipo).map(([tipo, valor]) => ({ tipo, valor }))
    });
    
  } catch (error) {
    console.error('Erro ao obter dashboard:', error);
    res.status(500).json({ erro: error.message });
  }
};

// =============================================
// ANOS DISPONÍVEIS
// =============================================

exports.getAnosDisponiveis = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    const query = {};
    if (empresaId) query.empresaId = empresaId;
    
    const anos = await Orcamento.aggregate([
      { $match: query },
      { $group: { _id: '$ano' } },
      { $sort: { _id: 1 } }
    ]);
    
    const anosLista = anos.map(a => a._id).filter(a => a);
    const anoAtual = new Date().getFullYear();
    
    if (anosLista.length === 0) {
      for (let i = anoAtual - 5; i <= anoAtual + 1; i++) {
        anosLista.push(i);
      }
    }
    
    res.json({ anos: anosLista });
  } catch (error) {
    console.error('Erro ao obter anos:', error);
    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = anoAtual - 5; i <= anoAtual + 1; i++) {
      anos.push(i);
    }
    res.json({ anos });
  }
};

// =============================================
// EXPORTAÇÃO
// =============================================

exports.exportarRelatorio = async (req, res) => {
  try {
    const { empresaId, mes, ano } = req.query;
    
    const orcamentos = await Orcamento.find({ empresaId, mes: parseInt(mes), ano: parseInt(ano) });
    const comparacao = await exports.compararOrcamentoReal({ query: { empresaId, mes, ano } }, { json: () => {}, status: () => ({ json: () => {} }) });
    
    res.json({
      orcamentos,
      comparacao: comparacao.comparacao,
      resumo: comparacao.resumo,
      dataExportacao: new Date(),
      totalGeral: orcamentos.reduce((sum, o) => sum + o.valor, 0)
    });
  } catch (error) {
    console.error('Erro ao exportar:', error);
    res.status(500).json({ erro: error.message });
  }
};

// Exportar para Excel
exports.exportarExcel = async (req, res) => {
  try {
    const { empresaId, mes, ano } = req.query;
    
    const orcamentos = await Orcamento.find({ empresaId, mes: parseInt(mes), ano: parseInt(ano) });
    
    const planilha = orcamentos.map(o => ({
      'Descrição': o.descricao,
      'Tipo': o.tipoOrcamento,
      'Cenário': o.cenario,
      'Valor (Kz)': o.valor,
      'Categoria': o.categoria || '',
      'Status': o.status,
      'Justificativa': o.justificativa || '',
      'Criado em': new Date(o.createdAt).toLocaleDateString('pt-AO')
    }));
    
    const ws = XLSX.utils.json_to_sheet(planilha);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orçamentos');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', `attachment; filename=orcamentos_${mes}_${ano}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    res.status(500).json({ erro: error.message });
  }
};

// Exportar para PDF (simplificado)
exports.exportarPDF = async (req, res) => {
  try {
    const { empresaId, mes, ano } = req.query;
    
    const orcamentos = await Orcamento.find({ empresaId, mes: parseInt(mes), ano: parseInt(ano) });
    const empresa = await Empresa.findById(empresaId);
    
    const totalGeral = orcamentos.reduce((sum, o) => sum + o.valor, 0);
    
    // HTML para o PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Orçamentos</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #2563eb; text-align: center; }
          h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; }
          .total { font-weight: bold; font-size: 18px; margin-top: 20px; text-align: right; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>${empresa?.nome || 'EMPRESA'}</h1>
        <h2>Relatório de Orçamentos</h2>
        <p>Período: ${new Date(ano, mes - 1).toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' })}</p>
        
        <table>
          <thead>
            <tr><th>Descrição</th><th>Tipo</th><th>Cenário</th><th>Valor (Kz)</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${orcamentos.map(o => `
              <tr>
                <td>${o.descricao}</td>
                <td>${o.tipoOrcamento}</td>
                <td>${o.cenario}</td>
                <td style="text-align:right">${o.valor.toLocaleString('pt-AO')}</td>
                <td>${o.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">Total Geral: ${totalGeral.toLocaleString('pt-AO')} Kz</div>
        
        <div class="footer">
          <p>Relatório gerado em ${new Date().toLocaleDateString('pt-AO')}</p>
          <p>Sistema de Gestão Empresarial</p>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    res.status(500).json({ erro: error.message });
  }
};

// =============================================
// CÓPIA E CENÁRIOS
// =============================================

// Copiar orçamento de um período para outro
exports.copiarOrcamento = async (req, res) => {
  try {
    const { empresaId, origemMes, origemAno, destinoMes, destinoAno } = req.body;
    const usuario = req.user?.nome || req.user?.email || 'Sistema';
    
    const orcamentosOrigem = await Orcamento.find({ empresaId, mes: origemMes, ano: origemAno });
    
    const novosOrcamentos = [];
    for (const orc of orcamentosOrigem) {
      const novoOrc = new Orcamento({
        empresaId: orc.empresaId,
        descricao: `${orc.descricao} (Cópia ${origemMes}/${origemAno})`,
        tipoOrcamento: orc.tipoOrcamento,
        cenario: orc.cenario,
        valor: orc.valor,
        mes: destinoMes,
        ano: destinoAno,
        categoria: orc.categoria,
        justificativa: orc.justificativa,
        observacoes: `Cópia do orçamento de ${origemMes}/${origemAno}`,
        dataOrcamento: new Date(destinoAno, destinoMes - 1),
        status: 'Rascunho',
        criadoPor: usuario,
        historico: [{
          campo: 'criação',
          valorAntigo: null,
          valorNovo: `Orçamento copiado de ${origemMes}/${origemAno}`,
          alteradoPor: usuario,
          data: new Date()
        }]
      });
      await novoOrc.save();
      novosOrcamentos.push(novoOrc);
    }
    
    res.json({ mensagem: `${novosOrcamentos.length} orçamentos copiados com sucesso`, orcamentos: novosOrcamentos });
  } catch (error) {
    console.error('Erro ao copiar orçamento:', error);
    res.status(500).json({ erro: error.message });
  }
};

// Criar cenário a partir de orçamento existente
exports.criarCenario = async (req, res) => {
  try {
    const { orcamentoId, novoCenario, percentualAjuste } = req.body;
    const usuario = req.user?.nome || req.user?.email || 'Sistema';
    
    const orcamentoOriginal = await Orcamento.findById(orcamentoId);
    if (!orcamentoOriginal) {
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }
    
    const novoValor = orcamentoOriginal.valor * (1 + (percentualAjuste || 0) / 100);
    
    const novoOrcamento = new Orcamento({
      empresaId: orcamentoOriginal.empresaId,
      descricao: `${orcamentoOriginal.descricao} (${novoCenario})`,
      tipoOrcamento: orcamentoOriginal.tipoOrcamento,
      cenario: novoCenario,
      valor: novoValor,
      mes: orcamentoOriginal.mes,
      ano: orcamentoOriginal.ano,
      categoria: orcamentoOriginal.categoria,
      justificativa: `Cenário ${novoCenario} criado a partir do orçamento ${orcamentoOriginal.descricao}`,
      observacoes: `Ajuste de ${percentualAjuste}% sobre o valor original de ${orcamentoOriginal.valor}`,
      dataOrcamento: orcamentoOriginal.dataOrcamento,
      status: 'Rascunho',
      criadoPor: usuario,
      historico: [{
        campo: 'criação',
        valorAntigo: null,
        valorNovo: `Cenário ${novoCenario} criado com ajuste de ${percentualAjuste}%`,
        alteradoPor: usuario,
        data: new Date()
      }]
    });
    
    await novoOrcamento.save();
    res.json({ mensagem: `Cenário ${novoCenario} criado com sucesso`, orcamento: novoOrcamento });
  } catch (error) {
    console.error('Erro ao criar cenário:', error);
    res.status(500).json({ erro: error.message });
  }
};