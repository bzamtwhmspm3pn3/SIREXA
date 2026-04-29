const express = require("express");
const router = express.Router();
const ReconBancaria = require("../models/ReconBancaria");

router.post("/", async (req, res) => {
  try {
    const nova = new ReconBancaria(req.body);
    await nova.save();
    res.status(201).json(nova);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.get("/:bancoId", async (req, res) => {
  try {
    const dados = await ReconBancaria.find({ bancoId: req.params.bancoId });
    res.json(dados);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;