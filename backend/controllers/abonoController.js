// backend/controllers/abonoController.js
const Abono = require('../models/Abono');
const Funcionario = require('../models/Funcionario');
const FolhaService = require('../services/folhaService');

// Limites legais (Angola)
const LIMITES = {
  subsidioAlimentacao: { maxIsento: 30000, valorDiarioPadrao: 2500 },
  subsidioTransporte: { maxIsento: 30000 },
  subsidioComunicacao: { maxIsento: 10000 },
  abonoMaximoPercentual: 0.05, // 5% do salário base para abonos eventuais
  feriasPercentual: 100, // 100% do salário
  decimoTerceiro: 100 // 100% do salário
};

// Calcular valor isento e tributável - CORRIGIDO (Férias e 13º são 100% tributáveis)
function calcularIsencao(tipo, valor, salarioBase = 0) {
  let valorIsento = 0;
  let valorTributavel = valor;
  
  switch (tipo) {
    case 'Subsídio de Alimentação':
      valorIsento = Math.min(valor, LIMITES.subsidioAlimentacao.maxIsento);
      valorTributavel = Math.max(0, valor - LIMITES.subsidioAlimentacao.maxIsento);
      break;
      
    case 'Subsídio de Transporte':
      valorIsento = Math.min(valor, LIMITES.subsidioTransporte.maxIsento);
      valorTributavel = Math.max(0, valor - LIMITES.subsidioTransporte.maxIsento);
      break;
      
    case 'Subsídio de Férias':
    case 'Décimo Terceiro':
      // CORREÇÃO: Subsídio de Férias e Décimo Terceiro são 100% TRIBUTÁVEIS
      valorIsento = 0;
      valorTributavel = valor;
      break;
      
    default:
      // Abonos eventuais: até 5% do salário base são isentos
      const limiteAbono = salarioBase * LIMITES.abonoMaximoPercentual;
      valorIsento = Math.min(valor, limiteAbono);
      valorTributavel = Math.max(0, valor - limiteAbono);
      break;
  }
  
  return { 
    valorIsento: Math.round(valorIsento * 100) / 100, 
    valorTributavel: Math.round(valorTributavel * 100) / 100 
  };
}

// Listar abonos
exports.listarAbonos = async (req, res) => {
  try {
    const { empresaId, funcionarioId, tipoAbono, status, page = 1, limit = 50 } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }
    
    const query = { empresaId };
    if (funcionarioId) query.funcionarioId = funcionarioId;
    if (tipoAbono) query.tipoAbono = tipoAbono;
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [abonos, total] = await Promise.all([
      Abono.find(query).sort({ dataReferencia: -1 }).skip(skip).limit(parseInt(limit)),
      Abono.countDocuments(query)
    ]);
    
    res.json({ sucesso: true, dados: abonos, total, pagina: parseInt(page), totalPaginas: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Erro ao listar abonos:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar abonos', erro: error.message });
  }
};

// Criar abono
exports.criarAbono = async (req, res) => {
  try {
    const { 
      funcionarioId, 
      tipoAbono, 
      valor, 
      descricao, 
      motivo, 
      dataReferencia, 
      status, 
      empresaId, 
      percentualFerias, 
      diasFerias,
      diasTrabalhados,
      valorDiario
    } = req.body;
    
    // Validações
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }
    if (!funcionarioId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID do funcionário é obrigatório' });
    }
    if (!tipoAbono) {
      return res.status(400).json({ sucesso: false, mensagem: 'Tipo de abono é obrigatório' });
    }
    if (!valor || valor <= 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Valor deve ser maior que zero' });
    }
    
    // Buscar funcionário
    const funcionario = await Funcionario.findById(funcionarioId);
    if (!funcionario) {
      return res.status(404).json({ sucesso: false, mensagem: 'Funcionário não encontrado' });
    }
    
    // Calcular valor final baseado no tipo
    let valorFinal = valor;
    
    if (tipoAbono === 'Subsídio de Alimentação') {
      const dias = diasTrabalhados || 22;
      const valorDiarioCalc = valorDiario || LIMITES.subsidioAlimentacao.valorDiarioPadrao;
      valorFinal = dias * valorDiarioCalc;
    }
    
    if (tipoAbono === 'Subsídio de Férias' && percentualFerias) {
      valorFinal = (funcionario.salarioBase * percentualFerias) / 100;
    }
    
    if (tipoAbono === 'Décimo Terceiro') {
      valorFinal = funcionario.salarioBase;
    }
    
    // Calcular isenção (com as regras corrigidas)
    const { valorIsento, valorTributavel } = calcularIsencao(tipoAbono, valorFinal, funcionario.salarioBase);
    
    const abono = new Abono({
      funcionarioId,
      funcionarioNome: funcionario.nome,
      funcionarioNif: funcionario.nif,
      departamento: funcionario.departamento,
      cargo: funcionario.cargo,
      salarioBase: funcionario.salarioBase,
      tipoAbono,
      valor: valorFinal,
      valorIsento,
      valorTributavel,
      descricao,
      motivo,
      dataReferencia: dataReferencia || new Date(),
      status: status || 'Pendente',
      percentualFerias: percentualFerias || 0,
      diasFerias: diasFerias || 0,
      diasTrabalhados: diasTrabalhados || 22,
      valorDiario: valorDiario || LIMITES.subsidioAlimentacao.valorDiarioPadrao,
      empresaId,
      criadoPor: req.user?.nome,
      criadoPorId: req.user?.id
    });
    
    await abono.save();
    
    res.status(201).json({ 
      sucesso: true, 
      mensagem: `Abono registrado com sucesso! Isento: ${valorIsento.toLocaleString()} Kz | Tributável: ${valorTributavel.toLocaleString()} Kz`,
      dados: abono 
    });
  } catch (error) {
    console.error('Erro ao criar abono:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar abono', erro: error.message });
  }
};

// Atualizar abono
exports.atualizarAbono = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updatedAt = new Date();
    
    // Se o tipo ou valor mudaram, recalcular isenção
    if (updates.tipoAbono || updates.valor) {
      const abonoExistente = await Abono.findById(id);
      if (abonoExistente) {
        const funcionario = await Funcionario.findById(abonoExistente.funcionarioId);
        if (funcionario) {
          const valorFinal = updates.valor || abonoExistente.valor;
          const tipoFinal = updates.tipoAbono || abonoExistente.tipoAbono;
          const { valorIsento, valorTributavel } = calcularIsencao(tipoFinal, valorFinal, funcionario.salarioBase);
          updates.valorIsento = valorIsento;
          updates.valorTributavel = valorTributavel;
        }
      }
    }
    
    const abono = await Abono.findByIdAndUpdate(id, updates, { new: true });
    if (!abono) {
      return res.status(404).json({ sucesso: false, mensagem: 'Abono não encontrado' });
    }
    
    res.json({ sucesso: true, mensagem: 'Abono atualizado', dados: abono });
  } catch (error) {
    console.error('Erro ao atualizar abono:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar abono', erro: error.message });
  }
};

// Excluir abono
exports.excluirAbono = async (req, res) => {
  try {
    const { id } = req.params;
    const abono = await Abono.findByIdAndDelete(id);
    if (!abono) {
      return res.status(404).json({ sucesso: false, mensagem: 'Abono não encontrado' });
    }
    res.json({ sucesso: true, mensagem: 'Abono excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir abono:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir abono', erro: error.message });
  }
};

// Integrar com folha salarial
exports.integrarFolha = async (req, res) => {
  try {
    const { id } = req.params;
    const { mesReferencia, anoReferencia } = req.body;
    
    const abono = await Abono.findById(id);
    if (!abono) {
      return res.status(404).json({ sucesso: false, mensagem: 'Abono não encontrado' });
    }
    
    abono.integradoFolha = true;
    abono.mesReferencia = mesReferencia;
    abono.anoReferencia = anoReferencia;
    abono.status = 'Integrado';
    await abono.save();
    
    res.json({ sucesso: true, mensagem: 'Abono integrado à folha salarial', dados: abono });
  } catch (error) {
    console.error('Erro ao integrar abono:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao integrar abono', erro: error.message });
  }
};

// Estatísticas
exports.getEstatisticas = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    console.log('📊 Buscando estatísticas para empresa:', empresaId);
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }
    
    // Total de abonos
    const totalAbonos = await Abono.countDocuments({ empresaId });
    
    // Valor total de todos os abonos
    const totalValorResult = await Abono.aggregate([
      { $match: { empresaId } },
      { $group: { _id: null, total: { $sum: '$valor' } } }
    ]);
    const totalValor = totalValorResult[0]?.total || 0;
    
    // Abonos por tipo
    const porTipo = await Abono.aggregate([
      { $match: { empresaId } },
      { 
        $group: { 
          _id: '$tipoAbono', 
          total: { $sum: 1 },
          valor: { $sum: '$valor' },
          valorIsento: { $sum: '$valorIsento' },
          valorTributavel: { $sum: '$valorTributavel' }
        } 
      }
    ]);
    
    // Abonos por status
    const porStatus = await Abono.aggregate([
      { $match: { empresaId } },
      { $group: { _id: '$status', total: { $sum: 1 } } }
    ]);
    
    // Totais específicos por tipo de subsídio
    const subsidioAlimentacao = await Abono.aggregate([
      { $match: { empresaId, tipoAbono: 'Subsídio de Alimentação' } },
      { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$valor' } } }
    ]);
    
    const subsidioTransporte = await Abono.aggregate([
      { $match: { empresaId, tipoAbono: 'Subsídio de Transporte' } },
      { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$valor' } } }
    ]);
    
    const subsidioFerias = await Abono.aggregate([
      { $match: { empresaId, tipoAbono: 'Subsídio de Férias' } },
      { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$valor' } } }
    ]);
    
    const decimoTerceiro = await Abono.aggregate([
      { $match: { empresaId, tipoAbono: 'Décimo Terceiro' } },
      { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$valor' } } }
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        totalAbonos,
        totalValor,
        totalValorFormatado: totalValor.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        porTipo,
        porStatus,
        subsidioAlimentacao: {
          total: subsidioAlimentacao[0]?.total || 0,
          valor: subsidioAlimentacao[0]?.valor || 0
        },
        subsidioTransporte: {
          total: subsidioTransporte[0]?.total || 0,
          valor: subsidioTransporte[0]?.valor || 0
        },
        subsidioFerias: {
          total: subsidioFerias[0]?.total || 0,
          valor: subsidioFerias[0]?.valor || 0
        },
        decimoTerceiro: {
          total: decimoTerceiro[0]?.total || 0,
          valor: decimoTerceiro[0]?.valor || 0
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao buscar estatísticas', 
      erro: error.message 
    });
  }
};

// Obter abono por ID
exports.getAbonoById = async (req, res) => {
  try {
    const { id } = req.params;
    const abono = await Abono.findById(id);
    
    if (!abono) {
      return res.status(404).json({ sucesso: false, mensagem: 'Abono não encontrado' });
    }
    
    res.json({ sucesso: true, dados: abono });
  } catch (error) {
    console.error('Erro ao buscar abono:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar abono', erro: error.message });
  }
};

// Aprovar abono
exports.aprovarAbono = async (req, res) => {
  try {
    const { id } = req.params;
    const abono = await Abono.findByIdAndUpdate(
      id, 
      { status: 'Aprovado', updatedAt: new Date() }, 
      { new: true }
    );
    
    if (!abono) {
      return res.status(404).json({ sucesso: false, mensagem: 'Abono não encontrado' });
    }
    
    res.json({ sucesso: true, mensagem: 'Abono aprovado com sucesso', dados: abono });
  } catch (error) {
    console.error('Erro ao aprovar abono:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao aprovar abono', erro: error.message });
  }
};

// Cancelar abono
exports.cancelarAbono = async (req, res) => {
  try {
    const { id } = req.params;
    const abono = await Abono.findByIdAndUpdate(
      id, 
      { status: 'Cancelado', updatedAt: new Date() }, 
      { new: true }
    );
    
    if (!abono) {
      return res.status(404).json({ sucesso: false, mensagem: 'Abono não encontrado' });
    }
    
    res.json({ sucesso: true, mensagem: 'Abono cancelado', dados: abono });
  } catch (error) {
    console.error('Erro ao cancelar abono:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao cancelar abono', erro: error.message });
  }
};

module.exports = {
  listarAbonos: exports.listarAbonos,
  criarAbono: exports.criarAbono,
  atualizarAbono: exports.atualizarAbono,
  excluirAbono: exports.excluirAbono,
  integrarFolha: exports.integrarFolha,
  getEstatisticas: exports.getEstatisticas,
  getAbonoById: exports.getAbonoById,
  aprovarAbono: exports.aprovarAbono,
  cancelarAbono: exports.cancelarAbono
};