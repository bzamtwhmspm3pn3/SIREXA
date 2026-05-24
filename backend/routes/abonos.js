const express = require('express');
const router = express.Router();
const abonoController = require('../controllers/abonoController');
const { verifyToken } = require('../middlewares/auth');
const { logMiddleware } = require('../middlewares/logger');

router.use(verifyToken);

router.get('/', logMiddleware('abono-listar'), abonoController.listarAbonos);
router.post('/', logMiddleware('abono-criar'), abonoController.criarAbono);
router.put('/:id', logMiddleware('abono-atualizar'), abonoController.atualizarAbono);
router.delete('/:id', logMiddleware('abono-deletar'), abonoController.excluirAbono);
router.post('/:id/integrar', logMiddleware('abono-integrar-folha'), abonoController.integrarFolha);
router.get('/estatisticas', logMiddleware('abono-estatisticas'), abonoController.getEstatisticas);

module.exports = router;