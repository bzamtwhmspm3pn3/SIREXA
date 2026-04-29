const express = require('express');
const router = express.Router();
const Receita = require('../models/Receita');

// GET - Listar todas as receitas
router.get('/', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const query = {};
    if (mes) query.mes = parseInt(mes);
    if (ano) query.ano = parseInt(ano);
    
    const receitas = await Receita.find(query).sort({ data: -1 });
    res.json(receitas);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar receitas' });
  }
});

// POST - Criar receita
router.post('/', async (req, res) => {
  try {
    const receita = new Receita(req.body);
    await receita.save();
    res.status(201).json(receita);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao criar receita' });
  }
});

// PUT - Atualizar receita
router.put('/:id', async (req, res) => {
  try {
    const receita = await Receita.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(receita);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar receita' });
  }
});

// DELETE - Excluir receita
router.delete('/:id', async (req, res) => {
  try {
    await Receita.findByIdAndDelete(req.params.id);
    res.json({ mensagem: 'Receita excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao excluir receita' });
  }
});

module.exports = router;