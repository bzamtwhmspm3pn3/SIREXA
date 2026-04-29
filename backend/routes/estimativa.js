const express = require('express');
const router = express.Router();
const EstimativaOrcamento = require('../models/estimativaOrcamento');

// Criar nova estimativa
router.post('/', async (req, res) => {
  try {
    const estimativa = new EstimativaOrcamento(req.body);
    await estimativa.save();
    res.status(201).json(estimativa);
  } catch (err) {
    res.status(400).json({ erro: 'Erro ao criar estimativa', detalhes: err.message });
  }
});

// Buscar todas estimativas ou por filtros (empresaId, ano, mes)
router.get('/', async (req, res) => {
  try {
    const { empresaId, ano, mes } = req.query;
    const filtro = {};

    if (empresaId) filtro.empresaId = empresaId;
    if (ano) filtro.ano = ano;
    if (mes) filtro.mes = mes;

    const estimativas = await EstimativaOrcamento.find(filtro);
    res.status(200).json(estimativas);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar estimativas' });
  }
});

// Buscar estimativa por ID
router.get('/:id', async (req, res) => {
  try {
    const estimativa = await EstimativaOrcamento.findById(req.params.id);
    if (!estimativa) {
      return res.status(404).json({ erro: 'Estimativa não encontrada' });
    }
    res.status(200).json(estimativa);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar estimativa' });
  }
});

// Atualizar estimativa por ID
router.put('/:id', async (req, res) => {
  try {
    const estimativaAtualizada = await EstimativaOrcamento.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!estimativaAtualizada) {
      return res.status(404).json({ erro: 'Estimativa não encontrada para actualizar' });
    }
    res.status(200).json(estimativaAtualizada);
  } catch (err) {
    res.status(400).json({ erro: 'Erro ao actualizar estimativa', detalhes: err.message });
  }
});

// Eliminar estimativa por ID
router.delete('/:id', async (req, res) => {
  try {
    const resultado = await EstimativaOrcamento.findByIdAndDelete(req.params.id);
    if (!resultado) {
      return res.status(404).json({ erro: 'Estimativa não encontrada para eliminar' });
    }
    res.status(200).json({ mensagem: 'Estimativa eliminada com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao eliminar estimativa' });
  }
});

module.exports = router;