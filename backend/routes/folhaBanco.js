const express = require('express');
const router = express.Router();

// Exemplo de rota de folha de banco
router.get('/', (req, res) => {
  res.json({ mensagem: 'Folha banco disponível.' });
});

module.exports = router;
