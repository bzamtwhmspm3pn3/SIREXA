const express = require('express');
const router = express.Router();
const ResultadoFinanceiro = require('../models/ResultadoFinanceiro');

router.get('/', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const query = {};
    if (mes) query.mes = parseInt(mes);
    if (ano) query.ano = parseInt(ano);
    
    const resultados = await ResultadoFinanceiro.find(query).sort({ data: -1 });
    res.json(resultados);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar resultados financeiros' });
  }
});

router.post('/', async (req, res) => {
  try {
    const resultado = new ResultadoFinanceiro(req.body);
    await resultado.save();
    res.status(201).json(resultado);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao criar resultado financeiro' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const resultado = await ResultadoFinanceiro.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar resultado financeiro' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ResultadoFinanceiro.findByIdAndDelete(req.params.id);
    res.json({ mensagem: 'Resultado financeiro excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao excluir resultado financeiro' });
  }
});

module.exports = router;