const express = require('express');
const router = express.Router();
const abonoController = require('../controllers/abonoController');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', abonoController.listarAbonos);
router.post('/', abonoController.criarAbono);
router.put('/:id', abonoController.atualizarAbono);
router.delete('/:id', abonoController.excluirAbono);
router.post('/:id/integrar', abonoController.integrarFolha);
router.get('/estatisticas', abonoController.getEstatisticas);

module.exports = router;