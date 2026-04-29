// backend/routes/clientes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/:empresaId', clienteController.getClientes);
router.get('/:empresaId/:id', clienteController.getClienteById);
router.post('/', clienteController.createCliente);
router.put('/:id', clienteController.updateCliente);
router.delete('/:id', clienteController.deleteCliente);

module.exports = router;