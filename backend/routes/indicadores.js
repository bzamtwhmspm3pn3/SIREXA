const express = require('express');
const router = express.Router();
const indicadorController = require('../controllers/indicadorController');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', indicadorController.getIndicadores);
router.get('/empresa', indicadorController.getIndicadoresEmpresa);
router.get('/dashboard', indicadorController.getDashboard);
router.get('/anos-disponiveis', indicadorController.getAnosDisponiveis);
router.post('/recalcular', indicadorController.recalcularIndicadores);

module.exports = router;