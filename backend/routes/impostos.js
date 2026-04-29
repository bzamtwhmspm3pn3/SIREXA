const express = require('express');
const router = express.Router();
const Imposto = require('../models/Imposto');

router.get('/', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const query = {};
    if (mes) query.mes = parseInt(mes);
    if (ano) query.ano = parseInt(ano);
    
    const impostos = await Imposto.find(query).sort({ data: -1 });
    res.json(impostos);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar impostos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const imposto = new Imposto(req.body);
    await imposto.save();
    res.status(201).json(imposto);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao criar imposto' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const imposto = await Imposto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(imposto);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar imposto' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Imposto.findByIdAndDelete(req.params.id);
    res.json({ mensagem: 'Imposto excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao excluir imposto' });
  }
});

module.exports = router;