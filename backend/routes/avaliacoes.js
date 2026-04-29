// backend/routes/avaliacoes.js
const express = require('express');
const router = express.Router();
const { ConfiguracaoAvaliacao, AvaliacaoRealizada } = require('../models/Avaliacao');

// ==================== CONFIGURAÇÕES ====================

// GET - Buscar configuração da empresa
router.get('/configuracao/:empresaId', async (req, res) => {
  try {
    const config = await ConfiguracaoAvaliacao.findOne({ 
      empresaId: req.params.empresaId,
      ativo: true 
    });
    res.json({ sucesso: true, config });
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar configuração' });
  }
});

// POST - Criar/Atualizar configuração da empresa
router.post('/configuracao', async (req, res) => {
  try {
    const { empresaId, metodosSelecionados, metodoPadrao, categorias, configuracao } = req.body;
    
    console.log("Recebendo configuração:", { empresaId, metodosSelecionados, metodoPadrao });
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    let config = await ConfiguracaoAvaliacao.findOne({ empresaId });
    
    const dadosAtualizados = {
      metodosSelecionados: metodosSelecionados || [],
      metodoPadrao: metodoPadrao || (metodosSelecionados && metodosSelecionados.length > 0 ? metodosSelecionados[0].key : ''),
      categorias: categorias || [],
      configuracao: configuracao || { escalas: { min: 1, max: 5 }, pesos: { avaliador: 1, autoavaliacao: 0, pares: 0, subordinados: 0, clientes: 0 } },
      updatedAt: new Date()
    };
    
    if (config) {
      // Atualizar existente
      Object.assign(config, dadosAtualizados);
      await config.save();
    } else {
      // Criar novo
      config = new ConfiguracaoAvaliacao({
        empresaId,
        ...dadosAtualizados,
        ativo: true
      });
      await config.save();
    }
    
    console.log("Configuração salva com sucesso:", { id: config._id, metodosSelecionados: config.metodosSelecionados });
    res.json({ sucesso: true, config });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar configuração', error: error.message });
  }
});
router.post('/configuracao', async (req, res) => {
  try {
    const { empresaId, metodosSelecionados, metodoPadrao, categorias, configuracao } = req.body;
    
    console.log("Recebendo configuração:", { empresaId, metodosSelecionados, metodoPadrao });
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    let config = await ConfiguracaoAvaliacao.findOne({ empresaId });
    
    const dadosAtualizados = {
      metodosSelecionados: metodosSelecionados || [],
      metodoPadrao: metodoPadrao || (metodosSelecionados && metodosSelecionados.length > 0 ? metodosSelecionados[0].key : ''),
      categorias: categorias || [],
      configuracao: configuracao || { escalas: { min: 1, max: 5 }, pesos: { avaliador: 1, autoavaliacao: 0, pares: 0, subordinados: 0, clientes: 0 } },
      // Campos antigos para compatibilidade
      metodo: metodosSelecionados && metodosSelecionados.length > 0 ? metodosSelecionados[0].key : '',
      nomeMetodo: metodosSelecionados && metodosSelecionados.length > 0 ? metodosSelecionados[0].nome : '',
      updatedAt: new Date()
    };
    
    if (config) {
      // Atualizar existente
      Object.assign(config, dadosAtualizados);
      await config.save();
    } else {
      // Criar novo
      config = new ConfiguracaoAvaliacao({
        empresaId,
        ...dadosAtualizados,
        ativo: true
      });
      await config.save();
    }
    
    console.log("Configuração salva com sucesso:", { id: config._id, metodosSelecionados: config.metodosSelecionados });
    res.json({ sucesso: true, config });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar configuração', error: error.message });
  }
});

// ==================== AVALIAÇÕES ====================

// GET - Listar avaliações
router.get('/', async (req, res) => {
  try {
    const { empresaId, funcionarioId, periodo, ano, status } = req.query;
    const query = {};
    
    if (empresaId) query.empresaId = empresaId;
    if (funcionarioId) query.funcionarioId = funcionarioId;
    if (periodo) query.periodo = periodo;
    if (ano) query.ano = parseInt(ano);
    if (status) query.status = status;
    
    const avaliacoes = await AvaliacaoRealizada.find(query).sort({ dataAvaliacao: -1 });
    res.json({ sucesso: true, dados: avaliacoes });
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar avaliações' });
  }
});

// GET - Buscar avaliação por ID
router.get('/:id', async (req, res) => {
  try {
    const avaliacao = await AvaliacaoRealizada.findById(req.params.id);
    if (!avaliacao) {
      return res.status(404).json({ sucesso: false, mensagem: 'Avaliação não encontrada' });
    }
    res.json({ sucesso: true, dados: avaliacao });
  } catch (error) {
    console.error('Erro ao buscar avaliação:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar avaliação' });
  }
});

// Função auxiliar para calcular nota total
function calcularNotaTotal(notas) {
  if (!notas) return 0;
  const valores = Object.values(notas);
  if (valores.length === 0) return 0;
  return valores.reduce((acc, n) => acc + (n || 0), 0) / valores.length;
}

// Função auxiliar para classificar nota
function classificarNota(nota) {
  if (nota >= 4.5) return 'Excelente';
  if (nota >= 4) return 'Muito Bom';
  if (nota >= 3) return 'Bom';
  if (nota >= 2) return 'Regular';
  return 'Insuficiente';
}

// POST - Criar avaliação
router.post('/', async (req, res) => {
  try {
    const { notas, ...dados } = req.body;
    
    const notaTotal = calcularNotaTotal(notas);
    const classificacao = classificarNota(notaTotal);
    
    const avaliacao = new AvaliacaoRealizada({
      ...dados,
      notas: notas || { produtividade: 0, qualidade: 0, pontualidade: 0, trabalhoEquipe: 0, iniciativa: 0 },
      notaTotal,
      classificacao,
      dataAvaliacao: new Date()
    });
    
    await avaliacao.save();
    res.status(201).json({ sucesso: true, dados: avaliacao });
  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar avaliação', error: error.message });
  }
});

// DELETE - Excluir avaliação
router.delete('/:id', async (req, res) => {
  try {
    const avaliacao = await AvaliacaoRealizada.findByIdAndDelete(req.params.id);
    if (!avaliacao) {
      return res.status(404).json({ sucesso: false, mensagem: 'Avaliação não encontrada' });
    }
    res.json({ sucesso: true, mensagem: 'Avaliação excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir avaliação:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir avaliação' });
  }
});

module.exports = router;