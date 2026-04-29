const express = require('express');
const router = express.Router();
const Custo = require('../models/Custo');

// GET - Listar todos os custos
router.get('/', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const query = {};
    if (mes) query.mes = parseInt(mes);
    if (ano) query.ano = parseInt(ano);
    
    const custos = await Custo.find(query).sort({ data: -1 });
    res.json(custos);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar custos' });
  }
});

// POST - Criar custo
router.post('/', async (req, res) => {
  try {
    const custo = new Custo(req.body);
    await custo.save();
    res.status(201).json(custo);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao criar custo' });
  }
});

// PUT - Atualizar custo
router.put('/:id', async (req, res) => {
  try {
    const custo = await Custo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(custo);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar custo' });
  }
});

// DELETE - Excluir custo
router.delete('/:id', async (req, res) => {
  try {
    await Custo.findByIdAndDelete(req.params.id);
    res.json({ mensagem: 'Custo excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao excluir custo' });
  }
});

module.exports = router;